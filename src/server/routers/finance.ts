import { z } from "zod";
import { createTRPCRouter, protectedProcedure, roleRestrictedProcedure } from "../trpc";

export const financeRouter = createTRPCRouter({
  // ── Invoices ──────────────────────────────────────────────
  listInvoices: protectedProcedure
    .input(
      z.object({
        status: z.enum([
          "DRAFT", "SENT", "VIEWED", "PARTIALLY_PAID", "PAID", "OVERDUE", "CANCELLED", "VOID",
        ]).optional(),
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(25),
      })
    )
    .query(async ({ ctx, input }) => {
      const where = {
        ...(input.status && { status: input.status }),
      };

      const [invoices, total] = await Promise.all([
        ctx.db.invoice.findMany({
          where,
          include: {
            order: { include: { company: true } },
            _count: { select: { payments: true } },
          },
          skip: (input.page - 1) * input.pageSize,
          take: input.pageSize,
          orderBy: { issueDate: "desc" },
        }),
        ctx.db.invoice.count({ where }),
      ]);

      return { invoices, total, pages: Math.ceil(total / input.pageSize) };
    }),

  createInvoice: roleRestrictedProcedure("ADMIN", "ACCOUNTS")
    .input(
      z.object({
        orderId: z.string(),
        type: z.enum(["DEPOSIT", "PROGRESS", "STANDARD", "FINAL", "CREDIT_NOTE"]).default("STANDARD"),
        dueDate: z.date(),
        notes: z.string().optional(),
        lineItems: z.array(
          z.object({
            description: z.string(),
            quantity: z.number().int().positive().default(1),
            unitPrice: z.number(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const now = new Date();
      const prefix = `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
      const count = await ctx.db.invoice.count({
        where: { invoiceNumber: { startsWith: prefix } },
      });
      const invoiceNumber = `${prefix}-${String(count + 1).padStart(4, "0")}`;

      const lineItemsWithTotals = input.lineItems.map((li) => ({
        ...li,
        lineTotal: li.quantity * li.unitPrice,
      }));

      const subtotal = lineItemsWithTotals.reduce((sum, li) => sum + li.lineTotal, 0);
      const taxAmount = subtotal * 0.15;
      const total = subtotal + taxAmount;

      return ctx.db.invoice.create({
        data: {
          invoiceNumber,
          type: input.type,
          orderId: input.orderId,
          dueDate: input.dueDate,
          notes: input.notes,
          subtotal,
          taxAmount,
          total,
          lineItems: { create: lineItemsWithTotals },
        },
        include: { lineItems: true },
      });
    }),

  recordPayment: roleRestrictedProcedure("ADMIN", "ACCOUNTS")
    .input(
      z.object({
        invoiceId: z.string(),
        amount: z.number().positive(),
        method: z.enum(["BANK_TRANSFER", "CREDIT_CARD", "CASH", "CHEQUE", "STRIPE", "OTHER"]),
        reference: z.string().optional(),
        paidDate: z.date().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const payment = await ctx.db.payment.create({
        data: {
          ...input,
          paidDate: input.paidDate ?? new Date(),
        },
      });

      // Update invoice paid amount and status
      const invoice = await ctx.db.invoice.findUniqueOrThrow({
        where: { id: input.invoiceId },
        include: { payments: true },
      });

      const totalPaid = invoice.payments.reduce(
        (sum: number, p: { amount: any }) => sum + Number(p.amount),
        0
      );

      const newStatus =
        totalPaid >= Number(invoice.total)
          ? "PAID"
          : totalPaid > 0
            ? "PARTIALLY_PAID"
            : invoice.status;

      await ctx.db.invoice.update({
        where: { id: input.invoiceId },
        data: { amountPaid: totalPaid, status: newStatus },
      });

      return payment;
    }),

  // ── Job Costing ───────────────────────────────────────────
  getJobCostReport: protectedProcedure
    .input(z.string()) // jobNumber
    .query(async ({ ctx, input }) => {
      const [costRecords, job] = await Promise.all([
        ctx.db.jobCostRecord.findMany({
          where: { jobNumber: input },
          orderBy: { createdAt: "asc" },
        }),
        ctx.db.job.findFirst({
          where: { jobNumber: input },
          include: {
            order: true,
            timeEntries: {
              include: { user: { select: { name: true, employee: { select: { hourlyRate: true } } } } },
            },
          },
        }),
      ]);

      const materialCost = costRecords
        .filter((r) => r.costType === "MATERIAL")
        .reduce((sum, r) => sum + Number(r.amount), 0);

      const labourCost = costRecords
        .filter((r) => r.costType === "LABOUR")
        .reduce((sum, r) => sum + Number(r.amount), 0);

      const otherCosts = costRecords
        .filter((r) => !["MATERIAL", "LABOUR"].includes(r.costType))
        .reduce((sum, r) => sum + Number(r.amount), 0);

      const totalCost = materialCost + labourCost + otherCosts;
      const revenue = job?.order ? Number(job.order.total) : 0;
      const margin = revenue > 0 ? ((revenue - totalCost) / revenue) * 100 : 0;

      return {
        jobNumber: input,
        costRecords,
        summary: {
          materialCost,
          labourCost,
          otherCosts,
          totalCost,
          revenue,
          profit: revenue - totalCost,
          marginPercent: Math.round(margin * 100) / 100,
        },
      };
    }),

  // ── Accounts Receivable Aging ─────────────────────────────
  receivablesAging: roleRestrictedProcedure("ADMIN", "ACCOUNTS").query(
    async ({ ctx }) => {
      const unpaidInvoices = await ctx.db.invoice.findMany({
        where: {
          status: { in: ["SENT", "VIEWED", "PARTIALLY_PAID", "OVERDUE"] },
        },
        include: {
          order: { include: { company: true } },
        },
      });

      const now = new Date();
      const aging = {
        current: [] as typeof unpaidInvoices,
        thirtyDays: [] as typeof unpaidInvoices,
        sixtyDays: [] as typeof unpaidInvoices,
        ninetyDays: [] as typeof unpaidInvoices,
        overNinety: [] as typeof unpaidInvoices,
      };

      for (const inv of unpaidInvoices) {
        const daysPast = Math.floor(
          (now.getTime() - inv.dueDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysPast <= 0) aging.current.push(inv);
        else if (daysPast <= 30) aging.thirtyDays.push(inv);
        else if (daysPast <= 60) aging.sixtyDays.push(inv);
        else if (daysPast <= 90) aging.ninetyDays.push(inv);
        else aging.overNinety.push(inv);
      }

      return aging;
    }
  ),

  // ── Financial Dashboard ───────────────────────────────────
  dashboardSummary: roleRestrictedProcedure("ADMIN", "ACCOUNTS").query(
    async ({ ctx }) => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const [monthRevenue, outstandingReceivables, monthExpenses] =
        await Promise.all([
          ctx.db.payment.aggregate({
            where: { paidDate: { gte: startOfMonth } },
            _sum: { amount: true },
          }),
          ctx.db.invoice.aggregate({
            where: { status: { in: ["SENT", "VIEWED", "PARTIALLY_PAID", "OVERDUE"] } },
            _sum: { total: true },
          }),
          ctx.db.supplierInvoice.aggregate({
            where: {
              invoiceDate: { gte: startOfMonth },
              status: { in: ["APPROVED", "PAID"] },
            },
            _sum: { total: true },
          }),
        ]);

      return {
        monthRevenue: Number(monthRevenue._sum.amount ?? 0),
        outstandingReceivables: Number(outstandingReceivables._sum.total ?? 0),
        monthExpenses: Number(monthExpenses._sum.total ?? 0),
      };
    }
  ),
});

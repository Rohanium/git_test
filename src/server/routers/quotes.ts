import { z } from "zod";
import { createTRPCRouter, protectedProcedure, roleRestrictedProcedure } from "../trpc";

export const quotesRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z.object({
        status: z.enum(["DRAFT", "SENT", "VIEWED", "APPROVED", "REJECTED", "EXPIRED", "REVISED", "CONVERTED"]).optional(),
        companyId: z.string().optional(),
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(25),
      })
    )
    .query(async ({ ctx, input }) => {
      const where = {
        ...(input.status && { status: input.status }),
        ...(input.companyId && { companyId: input.companyId }),
      };

      const [quotes, total] = await Promise.all([
        ctx.db.quote.findMany({
          where,
          include: {
            company: true,
            contact: true,
            createdBy: { select: { id: true, name: true } },
            _count: { select: { lineItems: true } },
          },
          skip: (input.page - 1) * input.pageSize,
          take: input.pageSize,
          orderBy: { updatedAt: "desc" },
        }),
        ctx.db.quote.count({ where }),
      ]);

      return { quotes, total, pages: Math.ceil(total / input.pageSize) };
    }),

  getById: protectedProcedure.input(z.string()).query(async ({ ctx, input }) => {
    return ctx.db.quote.findUniqueOrThrow({
      where: { id: input },
      include: {
        company: true,
        contact: true,
        createdBy: { select: { id: true, name: true } },
        lineItems: {
          include: { materials: { include: { material: true } } },
          orderBy: { sortOrder: "asc" },
        },
        versions: { orderBy: { version: "desc" } },
        opportunity: true,
      },
    });
  }),

  create: roleRestrictedProcedure("ADMIN", "SALES")
    .input(
      z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        companyId: z.string().optional(),
        contactId: z.string().optional(),
        opportunityId: z.string().optional(),
        validUntil: z.date().optional(),
        taxRate: z.number().default(0.15),
        notes: z.string().optional(),
        termsConditions: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = (ctx.session.user as { id: string }).id;

      // Generate quote number: Q-YYYYMM-XXXX
      const now = new Date();
      const prefix = `Q-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
      const count = await ctx.db.quote.count({
        where: { quoteNumber: { startsWith: prefix } },
      });
      const quoteNumber = `${prefix}-${String(count + 1).padStart(4, "0")}`;

      return ctx.db.quote.create({
        data: {
          ...input,
          quoteNumber,
          createdById: userId,
        },
      });
    }),

  addLineItem: roleRestrictedProcedure("ADMIN", "SALES")
    .input(
      z.object({
        quoteId: z.string(),
        productType: z.string(),
        description: z.string().min(1),
        dimensions: z.string().optional(),
        width: z.number().optional(),
        depth: z.number().optional(),
        height: z.number().optional(),
        quantity: z.number().int().positive().default(1),
        materialCost: z.number().default(0),
        labourCost: z.number().default(0),
        labourHours: z.number().optional(),
        finishType: z.string().optional(),
        hardwareCost: z.number().default(0),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { quoteId, ...data } = input;
      const unitPrice = data.materialCost + data.labourCost + data.hardwareCost;
      const lineTotal = unitPrice * data.quantity;

      const lineItem = await ctx.db.quoteLineItem.create({
        data: {
          ...data,
          quoteId,
          productType: data.productType as any,
          unitPrice,
          lineTotal,
        },
      });

      // Recalculate quote totals
      await recalculateQuoteTotals(ctx.db, quoteId);

      return lineItem;
    }),

  recalculate: protectedProcedure
    .input(z.string())
    .mutation(async ({ ctx, input }) => {
      return recalculateQuoteTotals(ctx.db, input);
    }),

  convertToOrder: roleRestrictedProcedure("ADMIN", "SALES")
    .input(z.string())
    .mutation(async ({ ctx, input: quoteId }) => {
      const quote = await ctx.db.quote.findUniqueOrThrow({
        where: { id: quoteId },
        include: { lineItems: true },
      });

      if (!quote.companyId) {
        throw new Error("Quote must have a company before converting to order");
      }

      // Generate order number
      const now = new Date();
      const prefix = `ORD-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
      const count = await ctx.db.order.count({
        where: { orderNumber: { startsWith: prefix } },
      });
      const orderNumber = `${prefix}-${String(count + 1).padStart(4, "0")}`;

      const order = await ctx.db.order.create({
        data: {
          orderNumber,
          quoteId,
          companyId: quote.companyId,
          subtotal: quote.subtotal,
          taxAmount: quote.taxAmount,
          total: quote.total,
          orderItems: {
            create: quote.lineItems.map((li, index) => ({
              sortOrder: index,
              description: li.description,
              productType: li.productType,
              quantity: li.quantity,
              unitPrice: li.unitPrice,
              lineTotal: li.lineTotal,
            })),
          },
        },
      });

      // Update quote status
      await ctx.db.quote.update({
        where: { id: quoteId },
        data: { status: "CONVERTED" },
      });

      return order;
    }),
});

async function recalculateQuoteTotals(db: any, quoteId: string) {
  const lineItems = await db.quoteLineItem.findMany({ where: { quoteId } });

  const subtotal = lineItems.reduce(
    (sum: number, li: any) => sum + Number(li.lineTotal),
    0
  );

  const quote = await db.quote.findUnique({ where: { id: quoteId } });
  const taxRate = Number(quote.taxRate);
  const discountAmount = Number(quote.discountAmount ?? 0);
  const taxableAmount = subtotal - discountAmount;
  const taxAmount = taxableAmount * taxRate;
  const total = taxableAmount + taxAmount;

  return db.quote.update({
    where: { id: quoteId },
    data: { subtotal, taxAmount, total },
  });
}

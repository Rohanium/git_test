import { z } from "zod";
import { createTRPCRouter, protectedProcedure, roleRestrictedProcedure } from "../trpc";

export const reportsRouter = createTRPCRouter({
  // ── Executive Dashboard KPIs ──────────────────────────────
  executiveKpis: roleRestrictedProcedure("ADMIN", "ACCOUNTS").query(
    async ({ ctx }) => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfYear = new Date(now.getFullYear(), 0, 1);

      const [
        pipelineValue,
        monthlyOrders,
        yearlyRevenue,
        activeJobs,
        overdueInvoices,
        conversionRate,
      ] = await Promise.all([
        // Total pipeline value
        ctx.db.opportunity.aggregate({
          where: { stage: { notIn: ["WON", "LOST"] } },
          _sum: { estimatedValue: true },
          _count: { id: true },
        }),
        // Orders this month
        ctx.db.order.count({
          where: { orderDate: { gte: startOfMonth } },
        }),
        // Revenue YTD
        ctx.db.payment.aggregate({
          where: { paidDate: { gte: startOfYear } },
          _sum: { amount: true },
        }),
        // Active production jobs
        ctx.db.job.count({
          where: { status: { in: ["IN_PROGRESS", "READY_TO_START", "QC_PENDING"] } },
        }),
        // Overdue invoices
        ctx.db.invoice.count({
          where: {
            status: { in: ["SENT", "VIEWED", "PARTIALLY_PAID"] },
            dueDate: { lt: now },
          },
        }),
        // Win rate (last 90 days)
        Promise.all([
          ctx.db.opportunity.count({
            where: {
              stage: "WON",
              wonDate: { gte: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) },
            },
          }),
          ctx.db.opportunity.count({
            where: {
              stage: { in: ["WON", "LOST"] },
              updatedAt: { gte: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) },
            },
          }),
        ]),
      ]);

      const [won, total] = conversionRate;

      return {
        pipelineValue: Number(pipelineValue._sum.estimatedValue ?? 0),
        pipelineCount: pipelineValue._count.id,
        monthlyOrders,
        yearToDateRevenue: Number(yearlyRevenue._sum.amount ?? 0),
        activeJobs,
        overdueInvoices,
        winRate: total > 0 ? Math.round((won / total) * 100) : 0,
      };
    }
  ),

  // ── Sales Performance ─────────────────────────────────────
  salesByProjectType: protectedProcedure
    .input(
      z.object({
        fromDate: z.date(),
        toDate: z.date(),
      })
    )
    .query(async ({ ctx, input }) => {
      const orders = await ctx.db.order.findMany({
        where: {
          orderDate: { gte: input.fromDate, lte: input.toDate },
          status: { not: "CANCELLED" },
        },
        include: { orderItems: true },
      });

      const byType: Record<string, { count: number; revenue: number }> = {};
      for (const order of orders) {
        for (const item of order.orderItems) {
          const type = item.productType;
          if (!byType[type]) byType[type] = { count: 0, revenue: 0 };
          byType[type].count += item.quantity;
          byType[type].revenue += Number(item.lineTotal);
        }
      }

      return Object.entries(byType).map(([type, data]) => ({
        projectType: type,
        ...data,
      }));
    }),

  // ── Production Efficiency ─────────────────────────────────
  productionEfficiency: roleRestrictedProcedure("ADMIN", "WORKSHOP_MANAGER")
    .input(
      z.object({
        fromDate: z.date(),
        toDate: z.date(),
      })
    )
    .query(async ({ ctx, input }) => {
      const completedJobs = await ctx.db.job.findMany({
        where: {
          completedDate: { gte: input.fromDate, lte: input.toDate },
          status: "COMPLETED",
        },
      });

      const totalEstimated = completedJobs.reduce(
        (sum, j) => sum + Number(j.estimatedHours ?? 0),
        0
      );
      const totalActual = completedJobs.reduce(
        (sum, j) => sum + Number(j.actualHours ?? 0),
        0
      );

      return {
        completedJobs: completedJobs.length,
        totalEstimatedHours: totalEstimated,
        totalActualHours: totalActual,
        efficiencyPercent:
          totalActual > 0
            ? Math.round((totalEstimated / totalActual) * 100)
            : 0,
      };
    }),

  // ── Profitability by Customer ─────────────────────────────
  profitabilityByCustomer: roleRestrictedProcedure("ADMIN", "ACCOUNTS")
    .input(
      z.object({
        fromDate: z.date(),
        toDate: z.date(),
        limit: z.number().int().min(1).max(50).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const orders = await ctx.db.order.findMany({
        where: {
          orderDate: { gte: input.fromDate, lte: input.toDate },
          status: { not: "CANCELLED" },
        },
        include: { company: true },
      });

      const byCustomer: Record<
        string,
        { companyName: string; orderCount: number; totalRevenue: number }
      > = {};

      for (const order of orders) {
        const id = order.companyId;
        if (!byCustomer[id]) {
          byCustomer[id] = {
            companyName: order.company.name,
            orderCount: 0,
            totalRevenue: 0,
          };
        }
        byCustomer[id].orderCount++;
        byCustomer[id].totalRevenue += Number(order.total);
      }

      return Object.entries(byCustomer)
        .map(([companyId, data]) => ({ companyId, ...data }))
        .sort((a, b) => b.totalRevenue - a.totalRevenue)
        .slice(0, input.limit);
    }),
});

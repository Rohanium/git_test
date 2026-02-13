import { z } from "zod";
import { createTRPCRouter, protectedProcedure, roleRestrictedProcedure } from "../trpc";

export const ordersRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z.object({
        status: z.enum([
          "CONFIRMED", "IN_PRODUCTION", "ON_HOLD", "READY_FOR_DELIVERY",
          "DELIVERED", "INSTALLED", "COMPLETED", "CANCELLED",
        ]).optional(),
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

      const [orders, total] = await Promise.all([
        ctx.db.order.findMany({
          where,
          include: {
            company: true,
            _count: { select: { orderItems: true, jobs: true } },
          },
          skip: (input.page - 1) * input.pageSize,
          take: input.pageSize,
          orderBy: { createdAt: "desc" },
        }),
        ctx.db.order.count({ where }),
      ]);

      return { orders, total, pages: Math.ceil(total / input.pageSize) };
    }),

  getById: protectedProcedure.input(z.string()).query(async ({ ctx, input }) => {
    return ctx.db.order.findUniqueOrThrow({
      where: { id: input },
      include: {
        company: true,
        quote: true,
        orderItems: { orderBy: { sortOrder: "asc" } },
        jobs: { include: { operations: true } },
        changeOrders: { orderBy: { createdAt: "desc" } },
        invoices: true,
        deliveries: { include: { installation: true } },
      },
    });
  }),

  updateStatus: roleRestrictedProcedure("ADMIN", "WORKSHOP_MANAGER", "SALES")
    .input(
      z.object({
        id: z.string(),
        status: z.enum([
          "CONFIRMED", "IN_PRODUCTION", "ON_HOLD", "READY_FOR_DELIVERY",
          "DELIVERED", "INSTALLED", "COMPLETED", "CANCELLED",
        ]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.order.update({
        where: { id: input.id },
        data: {
          status: input.status,
          ...(input.status === "COMPLETED" && { completedDate: new Date() }),
        },
      });
    }),

  createChangeOrder: roleRestrictedProcedure("ADMIN", "SALES")
    .input(
      z.object({
        orderId: z.string(),
        description: z.string().min(1),
        reason: z.string().min(1),
        costImpact: z.number().default(0),
        timeImpact: z.number().int().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const count = await ctx.db.changeOrder.count({
        where: { orderId: input.orderId },
      });
      const changeNumber = `CO-${String(count + 1).padStart(3, "0")}`;

      return ctx.db.changeOrder.create({
        data: { ...input, changeNumber },
      });
    }),
});

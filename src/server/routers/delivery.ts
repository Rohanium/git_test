import { z } from "zod";
import { createTRPCRouter, protectedProcedure, roleRestrictedProcedure } from "../trpc";

export const deliveryRouter = createTRPCRouter({
  listDeliveries: protectedProcedure
    .input(
      z.object({
        status: z.enum(["SCHEDULED", "LOADING", "IN_TRANSIT", "DELIVERED", "FAILED", "RESCHEDULED"]).optional(),
        fromDate: z.date().optional(),
        toDate: z.date().optional(),
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(25),
      })
    )
    .query(async ({ ctx, input }) => {
      const where = {
        ...(input.status && { status: input.status }),
        ...(input.fromDate && { scheduledDate: { gte: input.fromDate } }),
        ...(input.toDate && { scheduledDate: { lte: input.toDate } }),
      };

      const [deliveries, total] = await Promise.all([
        ctx.db.delivery.findMany({
          where,
          include: {
            order: { include: { company: true } },
            installation: true,
          },
          skip: (input.page - 1) * input.pageSize,
          take: input.pageSize,
          orderBy: { scheduledDate: "asc" },
        }),
        ctx.db.delivery.count({ where }),
      ]);

      return { deliveries, total, pages: Math.ceil(total / input.pageSize) };
    }),

  scheduleDelivery: roleRestrictedProcedure("ADMIN", "WORKSHOP_MANAGER", "INSTALLER")
    .input(
      z.object({
        orderId: z.string(),
        scheduledDate: z.date(),
        deliveryAddress: z.string().min(1),
        driverNotes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const now = new Date();
      const prefix = `DEL-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
      const count = await ctx.db.delivery.count({
        where: { deliveryNumber: { startsWith: prefix } },
      });
      const deliveryNumber = `${prefix}-${String(count + 1).padStart(4, "0")}`;

      return ctx.db.delivery.create({
        data: { ...input, deliveryNumber },
      });
    }),

  updateDeliveryStatus: roleRestrictedProcedure("ADMIN", "WORKSHOP_MANAGER", "INSTALLER")
    .input(
      z.object({
        id: z.string(),
        status: z.enum(["SCHEDULED", "LOADING", "IN_TRANSIT", "DELIVERED", "FAILED", "RESCHEDULED"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.delivery.update({
        where: { id: input.id },
        data: {
          status: input.status,
          ...(input.status === "DELIVERED" && { deliveredDate: new Date() }),
        },
      });
    }),

  // ── Installations ─────────────────────────────────────────
  scheduleInstallation: roleRestrictedProcedure("ADMIN", "INSTALLER")
    .input(
      z.object({
        deliveryId: z.string(),
        scheduledDate: z.date(),
        installerNotes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.installation.create({ data: input });
    }),

  completeInstallation: roleRestrictedProcedure("ADMIN", "INSTALLER")
    .input(
      z.object({
        installationId: z.string(),
        customerSignOff: z.boolean().default(false),
        installerNotes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.installation.update({
        where: { id: input.installationId },
        data: {
          status: input.customerSignOff ? "SIGNED_OFF" : "COMPLETED",
          completedDate: new Date(),
          customerSignOff: input.customerSignOff,
          signOffDate: input.customerSignOff ? new Date() : undefined,
          installerNotes: input.installerNotes,
        },
      });
    }),

  // ── Snag Items ────────────────────────────────────────────
  addSnagItem: roleRestrictedProcedure("ADMIN", "INSTALLER")
    .input(
      z.object({
        installationId: z.string(),
        description: z.string().min(1),
        severity: z.enum(["MINOR", "MAJOR", "CRITICAL"]),
        photoUrls: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.snagItem.create({
        data: {
          ...input,
          photoUrls: input.photoUrls ?? [],
        },
      });
    }),
});

import { z } from "zod";
import { createTRPCRouter, protectedProcedure, roleRestrictedProcedure } from "../trpc";

export const productionRouter = createTRPCRouter({
  // ── Jobs ──────────────────────────────────────────────────
  listJobs: protectedProcedure
    .input(
      z.object({
        status: z.enum([
          "PENDING", "MATERIALS_ORDERED", "MATERIALS_RECEIVED", "READY_TO_START",
          "IN_PROGRESS", "ON_HOLD", "QC_PENDING", "QC_PASSED",
          "READY_FOR_DELIVERY", "COMPLETED", "CANCELLED",
        ]).optional(),
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(25),
      })
    )
    .query(async ({ ctx, input }) => {
      const where = {
        ...(input.status && { status: input.status }),
      };

      const [jobs, total] = await Promise.all([
        ctx.db.job.findMany({
          where,
          include: {
            order: { include: { company: true } },
            operations: { orderBy: { sortOrder: "asc" } },
            _count: { select: { timeEntries: true, materialAllocations: true } },
          },
          skip: (input.page - 1) * input.pageSize,
          take: input.pageSize,
          orderBy: { createdAt: "desc" },
        }),
        ctx.db.job.count({ where }),
      ]);

      return { jobs, total, pages: Math.ceil(total / input.pageSize) };
    }),

  getJob: protectedProcedure.input(z.string()).query(async ({ ctx, input }) => {
    return ctx.db.job.findUniqueOrThrow({
      where: { id: input },
      include: {
        order: { include: { company: true } },
        orderItem: true,
        operations: {
          include: { workStation: true },
          orderBy: { sortOrder: "asc" },
        },
        materialAllocations: { include: { material: true } },
        timeEntries: {
          include: { user: { select: { id: true, name: true } } },
          orderBy: { clockIn: "desc" },
        },
        qualityChecks: { include: { defects: true } },
        workOrders: { include: { assignedTo: true, workStation: true } },
      },
    });
  }),

  createJob: roleRestrictedProcedure("ADMIN", "WORKSHOP_MANAGER")
    .input(
      z.object({
        orderId: z.string(),
        orderItemId: z.string().optional(),
        priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).default("NORMAL"),
        dueDate: z.date().optional(),
        estimatedHours: z.number().optional(),
        notes: z.string().optional(),
        operations: z.array(
          z.object({
            operationType: z.enum([
              "CUTTING", "CNC_MACHINING", "EDGE_BANDING", "DRILLING", "ROUTING",
              "SANDING", "ASSEMBLY", "FITTING_HARDWARE", "SPRAY_PREP", "SPRAY_PAINTING",
              "STAINING", "LACQUERING", "HAND_FINISHING", "GLAZING", "PACKING", "OTHER",
            ]),
            estimatedMins: z.number().int().optional(),
            workStationId: z.string().optional(),
          })
        ).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const now = new Date();
      const prefix = `JOB-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
      const count = await ctx.db.job.count({
        where: { jobNumber: { startsWith: prefix } },
      });
      const jobNumber = `${prefix}-${String(count + 1).padStart(4, "0")}`;

      const { operations, ...jobData } = input;

      return ctx.db.job.create({
        data: {
          ...jobData,
          jobNumber,
          operations: operations
            ? {
                create: operations.map((op, index) => ({
                  ...op,
                  sortOrder: index,
                })),
              }
            : undefined,
        },
        include: { operations: true },
      });
    }),

  updateJobStatus: roleRestrictedProcedure("ADMIN", "WORKSHOP_MANAGER", "WORKSHOP_STAFF")
    .input(
      z.object({
        id: z.string(),
        status: z.enum([
          "PENDING", "MATERIALS_ORDERED", "MATERIALS_RECEIVED", "READY_TO_START",
          "IN_PROGRESS", "ON_HOLD", "QC_PENDING", "QC_PASSED",
          "READY_FOR_DELIVERY", "COMPLETED", "CANCELLED",
        ]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.job.update({
        where: { id: input.id },
        data: {
          status: input.status,
          ...(input.status === "IN_PROGRESS" && { startDate: new Date() }),
          ...(input.status === "COMPLETED" && { completedDate: new Date() }),
        },
      });
    }),

  // ── Time Tracking ─────────────────────────────────────────
  clockIn: protectedProcedure
    .input(
      z.object({
        jobId: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = (ctx.session.user as { id: string }).id;
      return ctx.db.timeEntry.create({
        data: {
          userId,
          jobId: input.jobId,
          clockIn: new Date(),
          notes: input.notes,
        },
      });
    }),

  clockOut: protectedProcedure
    .input(
      z.object({
        timeEntryId: z.string(),
        breakMins: z.number().int().default(0),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const entry = await ctx.db.timeEntry.findUniqueOrThrow({
        where: { id: input.timeEntryId },
      });

      const clockOut = new Date();
      const totalMins =
        Math.round((clockOut.getTime() - entry.clockIn.getTime()) / 60000) -
        input.breakMins;

      return ctx.db.timeEntry.update({
        where: { id: input.timeEntryId },
        data: {
          clockOut,
          breakMins: input.breakMins,
          totalMins,
          notes: input.notes,
        },
      });
    }),

  // ── Work Stations ─────────────────────────────────────────
  listWorkStations: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.workStation.findMany({
      where: { isActive: true },
      include: {
        _count: { select: { operations: true, workOrders: true } },
      },
      orderBy: { name: "asc" },
    });
  }),

  // ── Workshop Dashboard ────────────────────────────────────
  workshopDashboard: protectedProcedure.query(async ({ ctx }) => {
    const [activeJobs, jobsByStatus, todaysTimeEntries] = await Promise.all([
      ctx.db.job.findMany({
        where: {
          status: { in: ["IN_PROGRESS", "READY_TO_START", "QC_PENDING"] },
        },
        include: {
          order: { include: { company: true } },
          operations: { include: { workStation: true } },
        },
        orderBy: { priority: "desc" },
      }),
      ctx.db.job.groupBy({
        by: ["status"],
        _count: { id: true },
      }),
      ctx.db.timeEntry.findMany({
        where: {
          clockIn: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
        include: {
          user: { select: { id: true, name: true } },
          job: { select: { jobNumber: true } },
        },
      }),
    ]);

    return {
      activeJobs,
      jobsByStatus: jobsByStatus.map((s) => ({
        status: s.status,
        count: s._count.id,
      })),
      todaysTimeEntries,
    };
  }),
});

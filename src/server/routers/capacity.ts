import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

// ── Shared Zod schemas ──────────────────────────────────────────────

const operationTypeEnum = z.enum([
  "CUTTING",
  "CNC_MACHINING",
  "EDGE_BANDING",
  "DRILLING",
  "ROUTING",
  "SANDING",
  "ASSEMBLY",
  "FITTING_HARDWARE",
  "SPRAY_PREP",
  "SPRAY_PAINTING",
  "STAINING",
  "LACQUERING",
  "HAND_FINISHING",
  "GLAZING",
  "PACKING",
  "OTHER",
]);

const jobStatusEnum = z.enum([
  "PENDING",
  "MATERIALS_ORDERED",
  "MATERIALS_RECEIVED",
  "READY_TO_START",
  "IN_PROGRESS",
  "ON_HOLD",
  "QC_PENDING",
  "QC_PASSED",
  "READY_FOR_DELIVERY",
  "COMPLETED",
  "CANCELLED",
]);

// ── Helper utilities ─────────────────────────────────────────────────

/** Add calendar days to a date, returning a new Date. */
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/** Get the Monday of the ISO week containing `date`. */
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Format a date as YYYY-Www ISO week label. */
function getWeekLabel(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNum =
    1 +
    Math.round(
      ((d.getTime() - week1.getTime()) / 86_400_000 -
        3 +
        ((week1.getDay() + 6) % 7)) /
        7,
    );
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

/** True when `date` falls on a weekday (Mon-Fri). */
function isBusinessDay(date: Date): boolean {
  const day = date.getDay();
  return day !== 0 && day !== 6;
}

/** Return the next business day on or after `date`. */
function nextBusinessDay(date: Date): Date {
  const d = new Date(date);
  while (!isBusinessDay(d)) {
    d.setDate(d.getDate() + 1);
  }
  return d;
}

/** Count business days between two dates (inclusive of start, exclusive of end). */
function countBusinessDays(start: Date, end: Date): number {
  let count = 0;
  const d = new Date(start);
  while (d < end) {
    if (isBusinessDay(d)) count++;
    d.setDate(d.getDate() + 1);
  }
  return count;
}

// ── Router ───────────────────────────────────────────────────────────

export const capacityRouter = createTRPCRouter({
  // ════════════════════════════════════════════════════════════════════
  //  QUERIES
  // ════════════════════════════════════════════════════════════════════

  // ── 1. getCapacityOverview ─────────────────────────────────────────
  getCapacityOverview: protectedProcedure
    .input(
      z
        .object({
          startDate: z.date().optional(),
          endDate: z.date().optional(),
          workStationType: z.string().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const now = new Date();
      const startDate = input?.startDate ?? now;
      const endDate = input?.endDate ?? addDays(now, 12 * 7); // 12 weeks

      // Fetch active workstations (optionally filtered by type)
      const workStations = await ctx.db.workStation.findMany({
        where: {
          isActive: true,
          ...(input?.workStationType && { type: input.workStationType }),
        },
        orderBy: { name: "asc" },
      });

      // Fetch all scheduled operations in the date range
      const scheduledOperations = await ctx.db.jobOperation.findMany({
        where: {
          scheduledStartDate: { lte: endDate },
          scheduledEndDate: { gte: startDate },
          workStationId: { not: null },
          status: { in: ["PENDING", "IN_PROGRESS"] },
          ...(input?.workStationType && {
            workStation: { type: input.workStationType },
          }),
        },
        include: {
          workStation: true,
        },
      });

      // Fetch capacity slots for override hours
      const capacitySlots = await ctx.db.capacitySlot.findMany({
        where: {
          date: { gte: startDate, lte: endDate },
          ...(input?.workStationType && {
            workStation: { type: input.workStationType },
          }),
        },
      });

      // Index capacity slot overrides: workStationId -> date-string -> slot
      const slotMap = new Map<string, Map<string, { availableHours: number; bookedHours: number }>>();
      for (const slot of capacitySlots) {
        const dateKey = slot.date.toISOString().slice(0, 10);
        if (!slotMap.has(slot.workStationId)) {
          slotMap.set(slot.workStationId, new Map());
        }
        slotMap.get(slot.workStationId)!.set(dateKey, {
          availableHours: Number(slot.availableHours),
          bookedHours: Number(slot.bookedHours),
        });
      }

      // Build week-by-week capacity per workstation
      type WeekCapacity = {
        weekLabel: string;
        weekStart: Date;
        workStations: {
          workStationId: string;
          workStationName: string;
          workStationType: string;
          totalCapacityHours: number;
          bookedHours: number;
          availableHours: number;
          utilizationPercent: number;
        }[];
      };

      const weeks: WeekCapacity[] = [];
      let cursor = getWeekStart(startDate);

      while (cursor <= endDate) {
        const weekEnd = addDays(cursor, 7);
        const weekLabel = getWeekLabel(cursor);

        const wsEntries = workStations.map((ws) => {
          const defaultHoursPerDay = ws.capacity ?? 8;
          let totalCapacityHours = 0;
          let bookedHours = 0;

          // Walk each day in this week
          for (let d = new Date(cursor); d < weekEnd && d <= endDate; d = addDays(d, 1)) {
            if (!isBusinessDay(d)) continue;
            if (d < startDate) continue;

            const dateKey = d.toISOString().slice(0, 10);
            const slotOverride = slotMap.get(ws.id)?.get(dateKey);

            totalCapacityHours += slotOverride
              ? slotOverride.availableHours
              : defaultHoursPerDay;
          }

          // Sum booked hours from scheduled operations overlapping this week
          for (const op of scheduledOperations) {
            if (op.workStationId !== ws.id) continue;
            if (!op.scheduledStartDate || !op.scheduledEndDate) continue;

            const opStart = op.scheduledStartDate > cursor ? op.scheduledStartDate : cursor;
            const opEnd =
              op.scheduledEndDate < weekEnd ? op.scheduledEndDate : weekEnd;

            if (opStart >= opEnd) continue;

            const overlapDays = countBusinessDays(opStart, opEnd);
            const totalOpDays = countBusinessDays(
              op.scheduledStartDate,
              op.scheduledEndDate,
            );

            if (totalOpDays > 0) {
              const opHours = (op.estimatedMins ?? 0) / 60;
              bookedHours += (opHours * overlapDays) / totalOpDays;
            }
          }

          const availableHours = Math.max(0, totalCapacityHours - bookedHours);
          const utilizationPercent =
            totalCapacityHours > 0
              ? Math.round((bookedHours / totalCapacityHours) * 10000) / 100
              : 0;

          return {
            workStationId: ws.id,
            workStationName: ws.name,
            workStationType: ws.type,
            totalCapacityHours: Math.round(totalCapacityHours * 100) / 100,
            bookedHours: Math.round(bookedHours * 100) / 100,
            availableHours: Math.round(availableHours * 100) / 100,
            utilizationPercent,
          };
        });

        weeks.push({ weekLabel, weekStart: new Date(cursor), workStations: wsEntries });
        cursor = weekEnd;
      }

      // Identify bottleneck workstation (highest overall utilization)
      const utilizationByWs = new Map<
        string,
        { name: string; totalCapacity: number; totalBooked: number }
      >();
      for (const week of weeks) {
        for (const ws of week.workStations) {
          const agg = utilizationByWs.get(ws.workStationId) ?? {
            name: ws.workStationName,
            totalCapacity: 0,
            totalBooked: 0,
          };
          agg.totalCapacity += ws.totalCapacityHours;
          agg.totalBooked += ws.bookedHours;
          utilizationByWs.set(ws.workStationId, agg);
        }
      }

      let bottleneck: {
        workStationId: string;
        workStationName: string;
        utilizationPercent: number;
      } | null = null;

      for (const [wsId, agg] of Array.from(utilizationByWs)) {
        const pct =
          agg.totalCapacity > 0
            ? Math.round((agg.totalBooked / agg.totalCapacity) * 10000) / 100
            : 0;
        if (!bottleneck || pct > bottleneck.utilizationPercent) {
          bottleneck = {
            workStationId: wsId,
            workStationName: agg.name,
            utilizationPercent: pct,
          };
        }
      }

      // Earliest date a new job could start: first business day where ALL
      // workstations have at least 1 hour available
      let earliestStart: Date | null = null;
      const checkDate = nextBusinessDay(new Date(startDate));
      const maxLookahead = addDays(endDate, 1);

      for (
        let d = new Date(checkDate);
        d <= maxLookahead;
        d = addDays(d, 1)
      ) {
        if (!isBusinessDay(d)) continue;

        let allAvailable = true;
        for (const ws of workStations) {
          const dateKey = d.toISOString().slice(0, 10);
          const slotOverride = slotMap.get(ws.id)?.get(dateKey);
          const capacity = slotOverride
            ? slotOverride.availableHours
            : (ws.capacity ?? 8);

          // Count booked hours for this workstation on this day
          let dayBooked = 0;
          for (const op of scheduledOperations) {
            if (op.workStationId !== ws.id) continue;
            if (
              !op.scheduledStartDate ||
              !op.scheduledEndDate ||
              op.scheduledStartDate > d ||
              op.scheduledEndDate <= d
            )
              continue;

            const totalOpDays = countBusinessDays(
              op.scheduledStartDate,
              op.scheduledEndDate,
            );
            if (totalOpDays > 0) {
              dayBooked += (op.estimatedMins ?? 0) / 60 / totalOpDays;
            }
          }

          if (capacity - dayBooked < 1) {
            allAvailable = false;
            break;
          }
        }

        if (allAvailable) {
          earliestStart = d;
          break;
        }
      }

      return {
        weeks,
        bottleneck,
        earliestStartDate: earliestStart,
        period: { startDate, endDate },
      };
    }),

  // ── 2. getWorkstationSchedule ──────────────────────────────────────
  getWorkstationSchedule: protectedProcedure
    .input(
      z.object({
        workStationId: z.string(),
        startDate: z.date(),
        endDate: z.date(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const workStation = await ctx.db.workStation.findUniqueOrThrow({
        where: { id: input.workStationId },
      });

      const operations = await ctx.db.jobOperation.findMany({
        where: {
          workStationId: input.workStationId,
          scheduledStartDate: { lte: input.endDate },
          scheduledEndDate: { gte: input.startDate },
        },
        include: {
          job: {
            select: {
              id: true,
              jobNumber: true,
              priority: true,
              status: true,
              installDate: true,
            },
          },
        },
        orderBy: { scheduledStartDate: "asc" },
      });

      const capacitySlots = await ctx.db.capacitySlot.findMany({
        where: {
          workStationId: input.workStationId,
          date: { gte: input.startDate, lte: input.endDate },
        },
        orderBy: { date: "asc" },
      });

      const slotMap = new Map<string, { availableHours: number; notes: string | null }>();
      for (const slot of capacitySlots) {
        slotMap.set(slot.date.toISOString().slice(0, 10), {
          availableHours: Number(slot.availableHours),
          notes: slot.notes,
        });
      }

      // Build day-by-day breakdown
      type DaySchedule = {
        date: Date;
        dayOfWeek: string;
        availableHours: number;
        bookedHours: number;
        remainingHours: number;
        notes: string | null;
        operations: {
          operationId: string;
          jobId: string;
          jobNumber: string;
          operationType: string;
          scheduledHours: number;
          jobPriority: string;
          jobStatus: string;
          installDate: Date | null;
        }[];
      };

      const dayNames = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ];
      const days: DaySchedule[] = [];

      for (
        let d = new Date(input.startDate);
        d <= input.endDate;
        d = addDays(d, 1)
      ) {
        if (!isBusinessDay(d)) continue;

        const dateKey = d.toISOString().slice(0, 10);
        const slot = slotMap.get(dateKey);
        const availableHours = slot
          ? slot.availableHours
          : (workStation.capacity ?? 8);

        const dayOps: DaySchedule["operations"] = [];
        let bookedHours = 0;

        for (const op of operations) {
          if (!op.scheduledStartDate || !op.scheduledEndDate) continue;
          if (op.scheduledStartDate > d || op.scheduledEndDate <= d) continue;

          const totalOpDays = countBusinessDays(
            op.scheduledStartDate,
            op.scheduledEndDate,
          );
          const scheduledHours =
            totalOpDays > 0 ? (op.estimatedMins ?? 0) / 60 / totalOpDays : 0;

          bookedHours += scheduledHours;
          dayOps.push({
            operationId: op.id,
            jobId: op.job.id,
            jobNumber: op.job.jobNumber,
            operationType: op.operationType,
            scheduledHours: Math.round(scheduledHours * 100) / 100,
            jobPriority: op.job.priority,
            jobStatus: op.job.status,
            installDate: op.job.installDate,
          });
        }

        days.push({
          date: new Date(d),
          dayOfWeek: dayNames[d.getDay()]!,
          availableHours,
          bookedHours: Math.round(bookedHours * 100) / 100,
          remainingHours: Math.round(Math.max(0, availableHours - bookedHours) * 100) / 100,
          notes: slot?.notes ?? null,
          operations: dayOps,
        });
      }

      return {
        workStation: {
          id: workStation.id,
          name: workStation.name,
          type: workStation.type,
          location: workStation.location,
          defaultCapacityHours: workStation.capacity ?? 8,
        },
        days,
      };
    }),

  // ── 3. getProductionSchedule ───────────────────────────────────────
  getProductionSchedule: protectedProcedure
    .input(
      z
        .object({
          startDate: z.date().optional(),
          endDate: z.date().optional(),
          status: jobStatusEnum.optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const now = new Date();
      const startDate = input?.startDate ?? now;
      const endDate = input?.endDate ?? addDays(now, 12 * 7);

      const jobs = await ctx.db.job.findMany({
        where: {
          ...(input?.status
            ? { status: input.status }
            : { status: { notIn: ["COMPLETED", "CANCELLED"] } }),
          OR: [
            {
              operations: {
                some: {
                  scheduledStartDate: { lte: endDate },
                  scheduledEndDate: { gte: startDate },
                },
              },
            },
            { installDate: { gte: startDate, lte: endDate } },
            { productionStartDate: { gte: startDate, lte: endDate } },
          ],
        },
        include: {
          order: {
            include: {
              company: { select: { id: true, name: true } },
            },
          },
          operations: {
            include: {
              workStation: {
                select: { id: true, name: true, type: true },
              },
            },
            orderBy: { sortOrder: "asc" },
          },
        },
        orderBy: [{ priority: "desc" }, { installDate: "asc" }],
      });

      const jobSchedules = jobs.map((job) => {
        const operations = job.operations.map((op) => {
          const isOverdue =
            op.status !== "COMPLETED" &&
            op.status !== "SKIPPED" &&
            op.scheduledEndDate != null &&
            op.scheduledEndDate < now;

          const isUpcoming =
            op.status === "PENDING" &&
            op.scheduledStartDate != null &&
            op.scheduledStartDate <= addDays(now, 7) &&
            op.scheduledStartDate >= now;

          return {
            id: op.id,
            operationType: op.operationType,
            sortOrder: op.sortOrder,
            status: op.status,
            estimatedMins: op.estimatedMins,
            actualMins: op.actualMins,
            scheduledStartDate: op.scheduledStartDate,
            scheduledEndDate: op.scheduledEndDate,
            latestStartDate: op.latestStartDate,
            startedAt: op.startedAt,
            completedAt: op.completedAt,
            workStation: op.workStation,
            isOverdue,
            isUpcoming,
          };
        });

        // Gantt-chart data: earliest operation start -> latest operation end
        const scheduledStarts = operations
          .map((o) => o.scheduledStartDate)
          .filter(Boolean) as Date[];
        const scheduledEnds = operations
          .map((o) => o.scheduledEndDate)
          .filter(Boolean) as Date[];

        const ganttStart =
          scheduledStarts.length > 0
            ? new Date(Math.min(...scheduledStarts.map((d) => d.getTime())))
            : null;
        const ganttEnd =
          scheduledEnds.length > 0
            ? new Date(Math.max(...scheduledEnds.map((d) => d.getTime())))
            : null;

        const overdueCount = operations.filter((o) => o.isOverdue).length;
        const upcomingDeadlines = operations.filter((o) => o.isUpcoming).length;

        return {
          jobId: job.id,
          jobNumber: job.jobNumber,
          status: job.status,
          priority: job.priority,
          installDate: job.installDate,
          productionStartDate: job.productionStartDate,
          materialOrderByDate: job.materialOrderByDate,
          materialLeadDays: job.materialLeadDays,
          company: job.order?.company ?? null,
          ganttStart,
          ganttEnd,
          operations,
          overdueCount,
          upcomingDeadlines,
        };
      });

      return {
        jobs: jobSchedules,
        summary: {
          totalJobs: jobSchedules.length,
          overdueOperations: jobSchedules.reduce(
            (sum, j) => sum + j.overdueCount,
            0,
          ),
          upcomingDeadlines: jobSchedules.reduce(
            (sum, j) => sum + j.upcomingDeadlines,
            0,
          ),
        },
        period: { startDate, endDate },
      };
    }),

  // ── 4. getAvailableDeliveryDates ───────────────────────────────────
  getAvailableDeliveryDates: protectedProcedure
    .input(
      z.object({
        estimatedHours: z.record(operationTypeEnum, z.number().min(0)),
        materialLeadDays: z.number().int().min(0).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const materialLeadDays = input.materialLeadDays ?? 10;
      const operationEntries = Object.entries(input.estimatedHours) as [
        string,
        number,
      ][];

      if (operationEntries.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "At least one operation with estimated hours is required.",
        });
      }

      // Fetch workstations that can handle each operation type
      const workStations = await ctx.db.workStation.findMany({
        where: { isActive: true },
        include: {
          capacitySlots: {
            where: {
              date: { gte: new Date(), lte: addDays(new Date(), 16 * 7) },
            },
            orderBy: { date: "asc" },
          },
        },
      });

      // Fetch existing scheduled operations for the next 16 weeks
      const lookaheadEnd = addDays(new Date(), 16 * 7);
      const existingOperations = await ctx.db.jobOperation.findMany({
        where: {
          scheduledStartDate: { lte: lookaheadEnd },
          scheduledEndDate: { gte: new Date() },
          workStationId: { not: null },
          status: { in: ["PENDING", "IN_PROGRESS"] },
        },
      });

      // Build daily availability map per workstation
      // workStationId -> dateKey -> remaining hours
      const availabilityMap = new Map<string, Map<string, number>>();

      for (const ws of workStations) {
        const dayMap = new Map<string, number>();
        const defaultHours = ws.capacity ?? 8;

        // Build capacity slot overrides
        const slotOverrides = new Map<string, number>();
        for (const slot of ws.capacitySlots) {
          slotOverrides.set(
            slot.date.toISOString().slice(0, 10),
            Number(slot.availableHours),
          );
        }

        // Initialise each business day with full capacity
        for (
          let d = nextBusinessDay(new Date());
          d <= lookaheadEnd;
          d = addDays(d, 1)
        ) {
          if (!isBusinessDay(d)) continue;
          const dateKey = d.toISOString().slice(0, 10);
          dayMap.set(dateKey, slotOverrides.get(dateKey) ?? defaultHours);
        }

        availabilityMap.set(ws.id, dayMap);
      }

      // Subtract existing bookings
      for (const op of existingOperations) {
        if (!op.workStationId || !op.scheduledStartDate || !op.scheduledEndDate)
          continue;

        const wsMap = availabilityMap.get(op.workStationId);
        if (!wsMap) continue;

        const totalOpDays = countBusinessDays(
          op.scheduledStartDate,
          op.scheduledEndDate,
        );
        if (totalOpDays === 0) continue;
        const hoursPerDay = (op.estimatedMins ?? 0) / 60 / totalOpDays;

        for (
          let d = new Date(op.scheduledStartDate);
          d < op.scheduledEndDate;
          d = addDays(d, 1)
        ) {
          if (!isBusinessDay(d)) continue;
          const dateKey = d.toISOString().slice(0, 10);
          const current = wsMap.get(dateKey);
          if (current !== undefined) {
            wsMap.set(dateKey, Math.max(0, current - hoursPerDay));
          }
        }
      }

      // For each operation type, find a suitable workstation and earliest window
      // Operations are sequential, so we schedule them in order
      const materialOrderDate = nextBusinessDay(new Date());
      const earliestProductionStart = nextBusinessDay(
        addDays(materialOrderDate, materialLeadDays),
      );

      let currentDate = new Date(earliestProductionStart);
      const schedulePlan: {
        operationType: string;
        workStationId: string;
        workStationName: string;
        startDate: Date;
        endDate: Date;
        hours: number;
      }[] = [];

      let allScheduled = true;

      for (const [opType, hours] of operationEntries) {
        if (hours <= 0) continue;

        // Find workstations that could handle this type (match type loosely or
        // use all workstations, letting the manager assign appropriately)
        // We try to match the workstation type to the operation type, then fall
        // back to any available workstation
        const matchingWs = workStations.filter((ws) => {
          const wsType = ws.type.toUpperCase().replace(/[\s-]/g, "_");
          return wsType.includes(opType) || opType.includes(wsType);
        });
        const candidateWs = matchingWs.length > 0 ? matchingWs : workStations;

        let bestStart: Date | null = null;
        let bestEnd: Date | null = null;
        let bestWsId = "";
        let bestWsName = "";

        for (const ws of candidateWs) {
          const wsMap = availabilityMap.get(ws.id);
          if (!wsMap) continue;

          // Find earliest window where enough hours can be accumulated
          let accum = 0;
          let windowStart: Date | null = null;
          let windowEnd: Date | null = null;

          for (
            let d = nextBusinessDay(new Date(currentDate));
            d <= lookaheadEnd;
            d = addDays(d, 1)
          ) {
            if (!isBusinessDay(d)) continue;
            const dateKey = d.toISOString().slice(0, 10);
            const available = wsMap.get(dateKey) ?? 0;

            if (available <= 0) {
              // Gap in availability, reset accumulation
              accum = 0;
              windowStart = null;
              continue;
            }

            if (windowStart === null) {
              windowStart = new Date(d);
            }

            accum += available;

            if (accum >= hours) {
              windowEnd = addDays(d, 1);
              break;
            }
          }

          if (windowStart && windowEnd) {
            if (!bestStart || windowStart < bestStart) {
              bestStart = windowStart;
              bestEnd = windowEnd;
              bestWsId = ws.id;
              bestWsName = ws.name;
            }
          }
        }

        if (bestStart && bestEnd) {
          schedulePlan.push({
            operationType: opType,
            workStationId: bestWsId,
            workStationName: bestWsName,
            startDate: bestStart,
            endDate: bestEnd,
            hours,
          });

          // Next operation starts after this one ends
          currentDate = nextBusinessDay(bestEnd);
        } else {
          allScheduled = false;
        }
      }

      // Calculate result dates
      const lastOp = schedulePlan[schedulePlan.length - 1];
      const estimatedProductionEnd = lastOp?.endDate ?? null;

      // Allow 2 business days for QC and packing after last operation
      const estimatedDeliveryDate = estimatedProductionEnd
        ? nextBusinessDay(addDays(estimatedProductionEnd, 2))
        : null;

      // Allow 3 business days after delivery for installation
      const estimatedInstallDate = estimatedDeliveryDate
        ? nextBusinessDay(addDays(estimatedDeliveryDate, 3))
        : null;

      // Confidence level based on how far out and utilization
      let confidence: "HIGH" | "MEDIUM" | "LOW";
      if (!allScheduled) {
        confidence = "LOW";
      } else if (
        estimatedInstallDate &&
        estimatedInstallDate > addDays(new Date(), 10 * 7)
      ) {
        confidence = "MEDIUM";
      } else {
        confidence = "HIGH";
      }

      return {
        materialOrderDate,
        earliestProductionStart:
          schedulePlan[0]?.startDate ?? earliestProductionStart,
        estimatedProductionEnd,
        estimatedDeliveryDate,
        estimatedInstallDate,
        confidence,
        schedulePlan,
        allOperationsSchedulable: allScheduled,
      };
    }),

  // ── 5. getDashboardStats ───────────────────────────────────────────
  getDashboardStats: protectedProcedure.query(async ({ ctx }) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = getWeekStart(now);
    const weekEnd = addDays(weekStart, 7);
    const fourWeeksEnd = addDays(weekStart, 4 * 7);

    // Parallel queries for dashboard data
    const [
      workStations,
      currentWeekOps,
      inProgressJobs,
      jobsStartingThisWeek,
      materialOrdersDueThisWeek,
      overdueOps,
      next4WeeksOps,
      capacitySlots,
    ] = await Promise.all([
      // Active workstations
      ctx.db.workStation.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
      }),

      // Operations scheduled this week
      ctx.db.jobOperation.findMany({
        where: {
          scheduledStartDate: { lte: weekEnd },
          scheduledEndDate: { gte: weekStart },
          workStationId: { not: null },
          status: { in: ["PENDING", "IN_PROGRESS"] },
        },
        include: { workStation: true },
      }),

      // Jobs in progress
      ctx.db.job.count({
        where: { status: "IN_PROGRESS" },
      }),

      // Jobs starting this week
      ctx.db.job.count({
        where: {
          productionStartDate: { gte: weekStart, lt: weekEnd },
        },
      }),

      // Material orders due this week
      ctx.db.job.count({
        where: {
          materialOrderByDate: { gte: weekStart, lt: weekEnd },
          status: { in: ["PENDING", "MATERIALS_ORDERED"] },
        },
      }),

      // Overdue operations
      ctx.db.jobOperation.count({
        where: {
          scheduledEndDate: { lt: today },
          status: { in: ["PENDING", "IN_PROGRESS"] },
        },
      }),

      // Operations for next 4 weeks
      ctx.db.jobOperation.findMany({
        where: {
          scheduledStartDate: { lte: fourWeeksEnd },
          scheduledEndDate: { gte: weekStart },
          workStationId: { not: null },
          status: { in: ["PENDING", "IN_PROGRESS"] },
        },
        include: { workStation: true },
      }),

      // Capacity slots for next 4 weeks
      ctx.db.capacitySlot.findMany({
        where: {
          date: { gte: weekStart, lte: fourWeeksEnd },
        },
      }),
    ]);

    // Build capacity slot map
    const slotMap = new Map<string, Map<string, number>>();
    for (const slot of capacitySlots) {
      const dateKey = slot.date.toISOString().slice(0, 10);
      if (!slotMap.has(slot.workStationId)) {
        slotMap.set(slot.workStationId, new Map());
      }
      slotMap.get(slot.workStationId)!.set(dateKey, Number(slot.availableHours));
    }

    // Current week utilization per workstation
    const currentWeekUtilization = workStations.map((ws) => {
      const defaultHours = ws.capacity ?? 8;
      let totalCapacity = 0;
      let totalBooked = 0;

      for (let d = new Date(weekStart); d < weekEnd; d = addDays(d, 1)) {
        if (!isBusinessDay(d)) continue;
        const dateKey = d.toISOString().slice(0, 10);
        const override = slotMap.get(ws.id)?.get(dateKey);
        totalCapacity += override ?? defaultHours;
      }

      for (const op of currentWeekOps) {
        if (op.workStationId !== ws.id) continue;
        if (!op.scheduledStartDate || !op.scheduledEndDate) continue;

        const opStart =
          op.scheduledStartDate > weekStart ? op.scheduledStartDate : weekStart;
        const opEnd =
          op.scheduledEndDate < weekEnd ? op.scheduledEndDate : weekEnd;

        const overlapDays = countBusinessDays(opStart, opEnd);
        const totalOpDays = countBusinessDays(
          op.scheduledStartDate,
          op.scheduledEndDate,
        );

        if (totalOpDays > 0) {
          totalBooked +=
            ((op.estimatedMins ?? 0) / 60 * overlapDays) / totalOpDays;
        }
      }

      return {
        workStationId: ws.id,
        workStationName: ws.name,
        workStationType: ws.type,
        totalCapacityHours: Math.round(totalCapacity * 100) / 100,
        bookedHours: Math.round(totalBooked * 100) / 100,
        availableHours:
          Math.round(Math.max(0, totalCapacity - totalBooked) * 100) / 100,
        utilizationPercent:
          totalCapacity > 0
            ? Math.round((totalBooked / totalCapacity) * 10000) / 100
            : 0,
      };
    });

    // Next 4 weeks capacity summary (week by week)
    const next4WeeksSummary: {
      weekLabel: string;
      weekStart: Date;
      totalCapacityHours: number;
      totalBookedHours: number;
      utilizationPercent: number;
    }[] = [];

    for (let w = 0; w < 4; w++) {
      const wStart = addDays(weekStart, w * 7);
      const wEnd = addDays(wStart, 7);
      const label = getWeekLabel(wStart);

      let totalCap = 0;
      let totalBkd = 0;

      for (const ws of workStations) {
        const defaultHours = ws.capacity ?? 8;

        for (let d = new Date(wStart); d < wEnd; d = addDays(d, 1)) {
          if (!isBusinessDay(d)) continue;
          const dateKey = d.toISOString().slice(0, 10);
          const override = slotMap.get(ws.id)?.get(dateKey);
          totalCap += override ?? defaultHours;
        }

        for (const op of next4WeeksOps) {
          if (op.workStationId !== ws.id) continue;
          if (!op.scheduledStartDate || !op.scheduledEndDate) continue;

          const opStart =
            op.scheduledStartDate > wStart ? op.scheduledStartDate : wStart;
          const opEnd =
            op.scheduledEndDate < wEnd ? op.scheduledEndDate : wEnd;
          if (opStart >= opEnd) continue;

          const overlapDays = countBusinessDays(opStart, opEnd);
          const totalOpDays = countBusinessDays(
            op.scheduledStartDate,
            op.scheduledEndDate,
          );

          if (totalOpDays > 0) {
            totalBkd +=
              ((op.estimatedMins ?? 0) / 60 * overlapDays) / totalOpDays;
          }
        }
      }

      next4WeeksSummary.push({
        weekLabel: label,
        weekStart: wStart,
        totalCapacityHours: Math.round(totalCap * 100) / 100,
        totalBookedHours: Math.round(totalBkd * 100) / 100,
        utilizationPercent:
          totalCap > 0
            ? Math.round((totalBkd / totalCap) * 10000) / 100
            : 0,
      });
    }

    return {
      currentWeekUtilization,
      jobsInProgress: inProgressJobs,
      jobsStartingThisWeek,
      materialOrdersDueThisWeek,
      overdueOperationsCount: overdueOps,
      next4WeeksSummary,
    };
  }),

  // ════════════════════════════════════════════════════════════════════
  //  MUTATIONS
  // ════════════════════════════════════════════════════════════════════

  // ── 1. scheduleJobOperations ───────────────────────────────────────
  scheduleJobOperations: protectedProcedure
    .input(
      z.object({
        jobId: z.string(),
        installDate: z.date(),
        operations: z.array(
          z.object({
            operationType: operationTypeEnum,
            workStationId: z.string(),
            scheduledStartDate: z.date(),
            scheduledEndDate: z.date(),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const job = await ctx.db.job.findUniqueOrThrow({
        where: { id: input.jobId },
        include: { operations: true },
      });

      // Derive dates from scheduling data
      const allStarts = input.operations.map((o) => o.scheduledStartDate);
      const productionStartDate = new Date(
        Math.min(...allStarts.map((d) => d.getTime())),
      );

      const materialLeadDays = job.materialLeadDays ?? 10;
      const materialOrderByDate = nextBusinessDay(
        addDays(productionStartDate, -materialLeadDays),
      );

      // Transactional update: schedule each operation + update the job
      return ctx.db.$transaction(async (tx) => {
        // Update each operation
        for (const opInput of input.operations) {
          // Find the matching existing operation by type
          const existingOp = job.operations.find(
            (o) => o.operationType === opInput.operationType,
          );

          if (existingOp) {
            await tx.jobOperation.update({
              where: { id: existingOp.id },
              data: {
                workStationId: opInput.workStationId,
                scheduledStartDate: opInput.scheduledStartDate,
                scheduledEndDate: opInput.scheduledEndDate,
              },
            });

            // Upsert capacity slots for each business day of the operation
            const totalOpDays = countBusinessDays(
              opInput.scheduledStartDate,
              opInput.scheduledEndDate,
            );
            const hoursPerDay =
              totalOpDays > 0
                ? (existingOp.estimatedMins ?? 0) / 60 / totalOpDays
                : 0;

            for (
              let d = new Date(opInput.scheduledStartDate);
              d < opInput.scheduledEndDate;
              d = addDays(d, 1)
            ) {
              if (!isBusinessDay(d)) continue;

              await tx.capacitySlot.upsert({
                where: {
                  workStationId_date: {
                    workStationId: opInput.workStationId,
                    date: d,
                  },
                },
                create: {
                  workStationId: opInput.workStationId,
                  date: d,
                  availableHours:
                    (
                      await tx.workStation.findUnique({
                        where: { id: opInput.workStationId },
                      })
                    )?.capacity ?? 8,
                  bookedHours: hoursPerDay,
                },
                update: {
                  bookedHours: { increment: hoursPerDay },
                },
              });
            }
          }
        }

        // Update the job with scheduling dates
        const updatedJob = await tx.job.update({
          where: { id: input.jobId },
          data: {
            installDate: input.installDate,
            productionStartDate,
            materialOrderByDate,
          },
          include: {
            operations: {
              include: { workStation: true },
              orderBy: { sortOrder: "asc" },
            },
          },
        });

        return updatedJob;
      });
    }),

  // ── 2. autoScheduleJob ─────────────────────────────────────────────
  autoScheduleJob: protectedProcedure
    .input(
      z.object({
        jobId: z.string(),
        installDate: z.date(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const job = await ctx.db.job.findUniqueOrThrow({
        where: { id: input.jobId },
        include: {
          operations: {
            orderBy: { sortOrder: "asc" },
          },
        },
      });

      if (job.operations.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Job has no operations to schedule.",
        });
      }

      const workStations = await ctx.db.workStation.findMany({
        where: { isActive: true },
      });

      const materialLeadDays = job.materialLeadDays ?? 10;

      // Backward scheduling: work from install date to determine when
      // each operation must start/end
      // Allow 2 business days before install for delivery/QC
      let cursor = new Date(input.installDate);
      cursor.setDate(cursor.getDate() - 2);
      cursor = nextBusinessDay(cursor);

      // We need to work backward through operations (last operation ends
      // closest to the install date)
      const reversedOps = [...job.operations].reverse();
      const schedulePlan: {
        operationId: string;
        operationType: string;
        workStationId: string;
        scheduledStartDate: Date;
        scheduledEndDate: Date;
        latestStartDate: Date;
      }[] = [];

      // Fetch existing capacity data for conflict checking
      const lookaheadStart = addDays(new Date(), -7);
      const existingSlots = await ctx.db.capacitySlot.findMany({
        where: {
          date: { gte: lookaheadStart, lte: input.installDate },
        },
      });

      const slotMap = new Map<string, Map<string, { available: number; booked: number }>>();
      for (const slot of existingSlots) {
        const dateKey = slot.date.toISOString().slice(0, 10);
        if (!slotMap.has(slot.workStationId)) {
          slotMap.set(slot.workStationId, new Map());
        }
        slotMap.get(slot.workStationId)!.set(dateKey, {
          available: Number(slot.availableHours),
          booked: Number(slot.bookedHours),
        });
      }

      for (const op of reversedOps) {
        const estimatedHours = (op.estimatedMins ?? 0) / 60;
        if (estimatedHours <= 0) {
          // Zero-duration operation: same start and end
          schedulePlan.unshift({
            operationId: op.id,
            operationType: op.operationType,
            workStationId: op.workStationId ?? "",
            scheduledStartDate: new Date(cursor),
            scheduledEndDate: new Date(cursor),
            latestStartDate: new Date(cursor),
          });
          continue;
        }

        // Find best workstation: either already assigned or match by type
        let candidateWs: typeof workStations;
        if (op.workStationId) {
          const assigned = workStations.find(
            (ws) => ws.id === op.workStationId,
          );
          candidateWs = assigned ? [assigned] : workStations;
        } else {
          // Try to match operation type to workstation type
          const matched = workStations.filter((ws) => {
            const wsType = ws.type.toUpperCase().replace(/[\s-]/g, "_");
            return (
              wsType.includes(op.operationType) ||
              op.operationType.includes(wsType)
            );
          });
          candidateWs = matched.length > 0 ? matched : workStations;
        }

        // Select workstation with most availability around the cursor
        let bestWs = candidateWs[0]!;
        let bestAvail = -1;

        for (const ws of candidateWs) {
          const wsSlots = slotMap.get(ws.id);
          const defaultCap = ws.capacity ?? 8;
          let availability = 0;

          // Check 5 business days before cursor
          let checkDate = new Date(cursor);
          for (let i = 0; i < 5; i++) {
            checkDate.setDate(checkDate.getDate() - 1);
            if (!isBusinessDay(checkDate)) {
              i--;
              continue;
            }
            const dateKey = checkDate.toISOString().slice(0, 10);
            const slotData = wsSlots?.get(dateKey);
            const cap = slotData?.available ?? defaultCap;
            const booked = slotData?.booked ?? 0;
            availability += Math.max(0, cap - booked);
          }

          if (availability > bestAvail) {
            bestAvail = availability;
            bestWs = ws;
          }
        }

        // Calculate how many business days this operation needs
        const hoursPerDay = bestWs.capacity ?? 8;
        const daysNeeded = Math.ceil(estimatedHours / hoursPerDay);

        // Scheduled end date is the cursor; go backward for start
        const scheduledEndDate = new Date(cursor);
        let scheduledStartDate = new Date(cursor);
        let daysBack = 0;

        while (daysBack < daysNeeded) {
          scheduledStartDate.setDate(scheduledStartDate.getDate() - 1);
          if (isBusinessDay(scheduledStartDate)) {
            daysBack++;
          }
        }
        scheduledStartDate = nextBusinessDay(scheduledStartDate);

        schedulePlan.unshift({
          operationId: op.id,
          operationType: op.operationType,
          workStationId: bestWs.id,
          scheduledStartDate,
          scheduledEndDate,
          latestStartDate: new Date(scheduledStartDate),
        });

        // Move cursor backward: next (earlier) operation ends before this one starts
        cursor = new Date(scheduledStartDate);
      }

      // Production start is the start of the first operation
      const productionStartDate = schedulePlan[0]?.scheduledStartDate ?? cursor;
      const materialOrderByDate = nextBusinessDay(
        addDays(productionStartDate, -materialLeadDays),
      );

      // Validate production start is not in the past
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (productionStartDate < today) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `Backward scheduling from the install date ${input.installDate.toISOString().slice(0, 10)} requires a production start of ${productionStartDate.toISOString().slice(0, 10)}, which is in the past. Consider pushing the install date out.`,
        });
      }

      // Apply the schedule in a transaction
      return ctx.db.$transaction(async (tx) => {
        for (const planned of schedulePlan) {
          await tx.jobOperation.update({
            where: { id: planned.operationId },
            data: {
              workStationId: planned.workStationId || undefined,
              scheduledStartDate: planned.scheduledStartDate,
              scheduledEndDate: planned.scheduledEndDate,
              latestStartDate: planned.latestStartDate,
            },
          });

          // Update capacity slots
          if (!planned.workStationId) continue;

          const op = job.operations.find((o) => o.id === planned.operationId);
          const totalOpDays = countBusinessDays(
            planned.scheduledStartDate,
            planned.scheduledEndDate,
          );
          const hoursPerDay =
            totalOpDays > 0 ? (op?.estimatedMins ?? 0) / 60 / totalOpDays : 0;

          for (
            let d = new Date(planned.scheduledStartDate);
            d < planned.scheduledEndDate;
            d = addDays(d, 1)
          ) {
            if (!isBusinessDay(d)) continue;

            const ws = workStations.find(
              (w) => w.id === planned.workStationId,
            );

            await tx.capacitySlot.upsert({
              where: {
                workStationId_date: {
                  workStationId: planned.workStationId,
                  date: d,
                },
              },
              create: {
                workStationId: planned.workStationId,
                date: d,
                availableHours: ws?.capacity ?? 8,
                bookedHours: hoursPerDay,
              },
              update: {
                bookedHours: { increment: hoursPerDay },
              },
            });
          }
        }

        // Update job with scheduling dates
        const updatedJob = await tx.job.update({
          where: { id: input.jobId },
          data: {
            installDate: input.installDate,
            productionStartDate,
            materialOrderByDate,
          },
          include: {
            operations: {
              include: { workStation: true },
              orderBy: { sortOrder: "asc" },
            },
          },
        });

        return {
          job: updatedJob,
          schedule: schedulePlan,
          materialOrderByDate,
          productionStartDate,
        };
      });
    }),

  // ── 3. updateCapacitySlot ──────────────────────────────────────────
  updateCapacitySlot: protectedProcedure
    .input(
      z.object({
        workStationId: z.string(),
        date: z.date(),
        availableHours: z.number().min(0),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify the workstation exists
      await ctx.db.workStation.findUniqueOrThrow({
        where: { id: input.workStationId },
      });

      return ctx.db.capacitySlot.upsert({
        where: {
          workStationId_date: {
            workStationId: input.workStationId,
            date: input.date,
          },
        },
        create: {
          workStationId: input.workStationId,
          date: input.date,
          availableHours: input.availableHours,
          bookedHours: 0,
          notes: input.notes ?? null,
        },
        update: {
          availableHours: input.availableHours,
          notes: input.notes ?? null,
        },
        include: {
          workStation: { select: { id: true, name: true, type: true } },
        },
      });
    }),

  // ── 4. bulkGenerateCapacitySlots ───────────────────────────────────
  bulkGenerateCapacitySlots: protectedProcedure
    .input(
      z.object({
        workStationId: z.string(),
        startDate: z.date(),
        endDate: z.date(),
        defaultHoursPerDay: z.number().min(0).max(24),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify the workstation exists
      const workStation = await ctx.db.workStation.findUniqueOrThrow({
        where: { id: input.workStationId },
      });

      if (input.startDate > input.endDate) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "startDate must be before or equal to endDate.",
        });
      }

      const slotsToCreate: { date: Date; availableHours: number }[] = [];

      for (
        let d = new Date(input.startDate);
        d <= input.endDate;
        d = addDays(d, 1)
      ) {
        if (!isBusinessDay(d)) continue;
        slotsToCreate.push({
          date: new Date(d),
          availableHours: input.defaultHoursPerDay,
        });
      }

      // Upsert each slot (skipDuplicates is not available for upsert, so we
      // use a transaction with individual upserts)
      const results = await ctx.db.$transaction(
        slotsToCreate.map((slot) =>
          ctx.db.capacitySlot.upsert({
            where: {
              workStationId_date: {
                workStationId: input.workStationId,
                date: slot.date,
              },
            },
            create: {
              workStationId: input.workStationId,
              date: slot.date,
              availableHours: slot.availableHours,
              bookedHours: 0,
            },
            update: {
              availableHours: slot.availableHours,
            },
          }),
        ),
      );

      return {
        workStation: {
          id: workStation.id,
          name: workStation.name,
        },
        slotsCreated: results.length,
        dateRange: {
          startDate: input.startDate,
          endDate: input.endDate,
        },
        defaultHoursPerDay: input.defaultHoursPerDay,
      };
    }),
});

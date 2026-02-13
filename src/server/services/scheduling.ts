/**
 * Backward Scheduling Service
 *
 * Core concept: given an install/delivery date, work BACKWARDS through each
 * production operation to determine when each task must START and when
 * materials must be ordered.
 *
 * Designed for a New Zealand joinery workshop with the typical operation
 * sequence:
 *   1. Cutting
 *   2. CNC Machining
 *   3. Edge Banding
 *   4. Drilling
 *   5. Sanding
 *   6. Assembly
 *   7. Hardware Fitting
 *   8. Spray Prep
 *   9. Spray / Stain / Lacquer (Finishing)
 *  10. Packing
 *
 * After packing the job enters QC, then delivery, then install.
 */

// ---------------------------------------------------------------------------
// New Zealand public holidays (recurring + one-off Mondayised rules)
// ---------------------------------------------------------------------------

/** Returns true when the given date falls on a NZ public holiday. */
function isNZPublicHoliday(date: Date): boolean {
  const y = date.getFullYear();
  const m = date.getMonth(); // 0-indexed
  const d = date.getDate();
  const dow = date.getDay(); // 0 = Sun

  // Fixed-date holidays (some subject to Mondayisation)
  const fixedHolidays = getFixedHolidays(y);
  for (const h of fixedHolidays) {
    if (h.getFullYear() === y && h.getMonth() === m && h.getDate() === d) {
      return true;
    }
  }

  // Easter-based holidays
  const easterDates = getEasterHolidays(y);
  for (const h of easterDates) {
    if (h.getFullYear() === y && h.getMonth() === m && h.getDate() === d) {
      return true;
    }
  }

  return false;
}

/**
 * Mondayise a holiday: if it falls on Saturday move to Monday, if Sunday
 * move to Monday. If both Sat and Sun are holidays the Sunday one moves
 * to Tuesday.
 */
function mondayise(date: Date, satAlreadyShifted: boolean = false): Date {
  const dow = date.getDay();
  if (dow === 6) {
    // Saturday -> Monday
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 2);
  }
  if (dow === 0) {
    // Sunday -> Monday, but if Monday is already taken shift to Tuesday
    const shift = satAlreadyShifted ? 2 : 1;
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + shift);
  }
  return date;
}

function getFixedHolidays(year: number): Date[] {
  const holidays: Date[] = [];

  // New Year's Day (1 Jan) and Day after New Year's Day (2 Jan) - Mondayised
  const ny1 = new Date(year, 0, 1);
  const ny2 = new Date(year, 0, 2);
  const ny1m = mondayise(ny1);
  // If NY1 was on Saturday and moved to Monday, NY2 (Sunday) moves to Tuesday
  const ny2m = mondayise(ny2, ny1.getDay() === 6);
  holidays.push(ny1m, ny2m);

  // Waitangi Day (6 Feb) - Mondayised since 2014
  const waitangi = new Date(year, 1, 6);
  holidays.push(mondayise(waitangi));

  // ANZAC Day (25 Apr) - Mondayised since 2014
  const anzac = new Date(year, 3, 25);
  holidays.push(mondayise(anzac));

  // King's Birthday - first Monday in June
  const kingsBirthday = getNthDayOfMonth(year, 5, 1, 1); // 1st Monday of June
  holidays.push(kingsBirthday);

  // Matariki - varies each year, approximate known dates
  const matariki = getMatarikiDate(year);
  if (matariki) {
    holidays.push(matariki);
  }

  // Labour Day - 4th Monday in October
  const labourDay = getNthDayOfMonth(year, 9, 1, 4); // 4th Monday of October
  holidays.push(labourDay);

  // Christmas Day (25 Dec) - Mondayised
  const xmas = new Date(year, 11, 25);
  const boxing = new Date(year, 11, 26);
  const xmasm = mondayise(xmas);
  const boxingm = mondayise(boxing, xmas.getDay() === 6);
  holidays.push(xmasm, boxingm);

  return holidays;
}

function getEasterHolidays(year: number): Date[] {
  const easter = computeEasterSunday(year);
  const goodFriday = new Date(easter);
  goodFriday.setDate(easter.getDate() - 2);
  const easterMonday = new Date(easter);
  easterMonday.setDate(easter.getDate() + 1);
  return [goodFriday, easterMonday];
}

/** Anonymous Gregorian Easter algorithm. */
function computeEasterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1; // 0-indexed
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month, day);
}

/** Get the Nth occurrence of a given weekday in a month. */
function getNthDayOfMonth(
  year: number,
  month: number,
  weekday: number,
  n: number
): Date {
  let count = 0;
  for (let day = 1; day <= 31; day++) {
    const d = new Date(year, month, day);
    if (d.getMonth() !== month) break;
    if (d.getDay() === weekday) {
      count++;
      if (count === n) return d;
    }
  }
  throw new Error(`Could not find ${n}th weekday ${weekday} in month ${month}`);
}

/**
 * Matariki dates are set by the NZ government. This table covers the
 * legislated and announced dates. Falls on a Friday.
 */
function getMatarikiDate(year: number): Date | null {
  const dates: Record<number, [number, number]> = {
    2022: [5, 24], // 24 June 2022
    2023: [6, 14], // 14 July 2023
    2024: [5, 28], // 28 June 2024
    2025: [5, 20], // 20 June 2025
    2026: [6, 10], // 10 July 2026
    2027: [5, 25], // 25 June 2027
    2028: [6, 14], // 14 July 2028
    2029: [5, 29], // 29 June 2029
    2030: [5, 21], // 21 June 2030
    2031: [6, 11], // 11 July 2031
    2032: [5, 25], // 25 June (estimated)
    2033: [5, 20], // 20 June (estimated)
    2034: [6, 7],  // 7 July (estimated)
    2035: [5, 29], // 29 June (estimated)
  };
  const entry = dates[year];
  if (!entry) return null;
  return new Date(year, entry[0], entry[1]);
}

// ---------------------------------------------------------------------------
// Business day helpers
// ---------------------------------------------------------------------------

function isWeekend(date: Date): boolean {
  const dow = date.getDay();
  return dow === 0 || dow === 6;
}

function isNonWorkingDay(date: Date, excludeWeekends: boolean): boolean {
  if (excludeWeekends && isWeekend(date)) return true;
  if (isNZPublicHoliday(date)) return true;
  return false;
}

function cloneDate(d: Date): Date {
  return new Date(d.getTime());
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * Add business days to a date. Positive values move forward in time.
 * Skips weekends (optionally) and NZ public holidays.
 */
export function addBusinessDays(
  date: Date,
  days: number,
  excludeWeekends: boolean = true
): Date {
  if (days === 0) return startOfDay(date);

  const direction = days > 0 ? 1 : -1;
  let remaining = Math.abs(days);
  const current = startOfDay(date);

  while (remaining > 0) {
    current.setDate(current.getDate() + direction);
    if (!isNonWorkingDay(current, excludeWeekends)) {
      remaining--;
    }
  }

  return current;
}

/**
 * Subtract business days from a date. This moves BACKWARDS in time.
 * `subtractBusinessDays(date, 3)` returns a date 3 working days before `date`.
 */
export function subtractBusinessDays(
  date: Date,
  days: number,
  excludeWeekends: boolean = true
): Date {
  return addBusinessDays(date, -days, excludeWeekends);
}

/**
 * Count the number of business days between two dates (exclusive of end).
 */
function countBusinessDays(
  from: Date,
  to: Date,
  excludeWeekends: boolean = true
): number {
  const start = startOfDay(from);
  const end = startOfDay(to);
  if (start >= end) return 0;

  let count = 0;
  const cursor = cloneDate(start);
  while (cursor < end) {
    if (!isNonWorkingDay(cursor, excludeWeekends)) {
      count++;
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

/**
 * Move a date to the nearest previous business day if it falls on a
 * non-working day.
 */
function ensureBusinessDay(date: Date, excludeWeekends: boolean): Date {
  const d = startOfDay(date);
  while (isNonWorkingDay(d, excludeWeekends)) {
    d.setDate(d.getDate() - 1);
  }
  return d;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Standard operation types in a joinery workshop, in production sequence. */
export const OPERATION_SEQUENCE: readonly string[] = [
  "CUTTING",
  "CNC_MACHINING",
  "EDGE_BANDING",
  "DRILLING",
  "SANDING",
  "ASSEMBLY",
  "HARDWARE_FITTING",
  "SPRAY_PREP",
  "FINISHING", // spray / stain / lacquer
  "PACKING",
] as const;

export type OperationType = (typeof OPERATION_SEQUENCE)[number];

export interface ScheduleParams {
  /** The date the job must be installed on-site. */
  installDate: Date;
  /** List of operations with their estimated hours. */
  operations: {
    operationType: string;
    estimatedHours: number;
  }[];
  /** Lead time in business days for material procurement. Default 10. */
  materialLeadDays?: number;
  /** Workshop hours available per working day. Default 8. */
  hoursPerDay?: number;
  /** Whether to skip weekends. Default true. */
  excludeWeekends?: boolean;
}

export interface ScheduledOperation {
  operationType: string;
  latestStart: Date;
  latestEnd: Date;
  estimatedHours: number;
  /** Number of working days this operation spans. */
  durationDays: number;
}

export interface ScheduleResult {
  installDate: Date;
  deliveryDate: Date;
  qcDate: Date;
  productionStartDate: Date;
  materialOrderByDate: Date;
  operations: ScheduledOperation[];
  /** Total working days from production start to install. */
  totalProductionDays: number;
  /** Ordered list of operations on the critical path. */
  criticalPath: string[];
}

export interface CapacityParams {
  /** The workstation / operation type being booked. */
  workstationType: string;
  /** How many hours the job requires on this workstation. */
  requiredHours: number;
  /** Earliest date the operation could start (predecessor constraint). */
  earliestDate: Date;
  /** Working hours per day at this station. */
  hoursPerDay: number;
  /** Existing bookings on this workstation. */
  existingBookings: {
    date: Date;
    bookedHours: number;
    availableHours: number;
  }[];
}

export interface CapacitySlot {
  startDate: Date;
  endDate: Date;
  /** Detailed day-by-day allocation for this slot. */
  dailyAllocations: {
    date: Date;
    hoursAllocated: number;
    remainingCapacity: number;
  }[];
}

export interface ProjectTimelineParams {
  /** Overall target install / completion date for the project. */
  targetDate: Date;
  /** Individual jobs within the project. */
  jobs: {
    jobId: string;
    jobName: string;
    operations: { operationType: string; estimatedHours: number }[];
    /** If set, this job depends on another job finishing first. */
    dependsOnJobId?: string;
  }[];
  materialLeadDays?: number;
  hoursPerDay?: number;
  excludeWeekends?: boolean;
}

export interface ProjectTimeline {
  projectStartDate: Date;
  projectEndDate: Date;
  materialOrderByDate: Date;
  jobs: {
    jobId: string;
    jobName: string;
    schedule: ScheduleResult;
  }[];
  criticalPathJobs: string[];
  milestones: {
    name: string;
    date: Date;
    jobId: string;
  }[];
}

export interface AvailableCapacityParams {
  /** Start of the date range to analyse. */
  rangeStart: Date;
  /** End of the date range to analyse. */
  rangeEnd: Date;
  /** Workstation definitions. */
  workstations: {
    name: string;
    type: string;
    hoursPerDay: number;
  }[];
  /** All existing bookings across all workstations in the range. */
  existingBookings: {
    workstationType: string;
    date: Date;
    bookedHours: number;
  }[];
  /** Hours per day for the workshop (used for new-job estimation). */
  hoursPerDay?: number;
  excludeWeekends?: boolean;
}

export interface WorkstationCapacity {
  name: string;
  type: string;
  totalCapacityHours: number;
  bookedHours: number;
  availableHours: number;
  utilizationPercent: number;
}

export interface CapacityOverview {
  weekStart: Date;
  weekEnd: Date;
  workstations: WorkstationCapacity[];
  /** Which workstation type is the bottleneck this week. */
  bottleneck: string;
  /** Earliest date a new job of average size could start. */
  earliestNewJobStart: Date;
}

export interface AvailableCapacityResult {
  weeks: CapacityOverview[];
  overallUtilizationPercent: number;
  earliestNewJobStart: Date;
}

// ---------------------------------------------------------------------------
// 1. Backward Scheduling
// ---------------------------------------------------------------------------

/**
 * Given a job with an install date, works backward through each production
 * operation to determine the latest start/end date for every task and the
 * date by which materials must be ordered.
 *
 * The post-production sequence is:
 *   Install <- Delivery (1 biz day before install) <- QC (1 biz day before delivery)
 *
 * Production operations are then scheduled backward from the QC date, each
 * operation's end date being the next operation's start date.
 */
export function backwardScheduleJob(params: ScheduleParams): ScheduleResult {
  const {
    installDate,
    operations,
    materialLeadDays = 10,
    hoursPerDay = 8,
    excludeWeekends = true,
  } = params;

  // Anchor: install date must be a business day
  const install = ensureBusinessDay(installDate, excludeWeekends);

  // Delivery = 1 business day before install (transport day)
  const delivery = subtractBusinessDays(install, 1, excludeWeekends);

  // QC = 1 business day before delivery
  const qcDate = subtractBusinessDays(delivery, 1, excludeWeekends);

  // Sort operations into production sequence order. Operations not in
  // the standard sequence get appended at the end in the order they appear.
  const sortedOps = sortOperationsBySequence(operations);

  // Schedule operations backward from the QC date.
  // The last operation's end date = qcDate.
  // Each operation's start = end - ceil(hours / hoursPerDay) business days
  // Each predecessor's end = current operation's start.
  const scheduledOps: ScheduledOperation[] = [];
  let cursor = cloneDate(qcDate);

  // Walk operations in reverse (last operation finishes at QC date)
  for (let i = sortedOps.length - 1; i >= 0; i--) {
    const op = sortedOps[i];
    const durationDays = Math.max(1, Math.ceil(op.estimatedHours / hoursPerDay));

    const latestEnd = cloneDate(cursor);
    const latestStart = subtractBusinessDays(cursor, durationDays - 1, excludeWeekends);

    scheduledOps.unshift({
      operationType: op.operationType,
      latestStart: cloneDate(latestStart),
      latestEnd: cloneDate(latestEnd),
      estimatedHours: op.estimatedHours,
      durationDays,
    });

    // The predecessor's end is the day before this operation's start
    cursor = subtractBusinessDays(latestStart, 1, excludeWeekends);
  }

  // Production start = first operation's latest start
  const productionStartDate =
    scheduledOps.length > 0 ? cloneDate(scheduledOps[0].latestStart) : cloneDate(qcDate);

  // Material order-by date = production start - material lead time
  const materialOrderByDate = subtractBusinessDays(
    productionStartDate,
    materialLeadDays,
    excludeWeekends
  );

  // Total production days = business days from production start to install
  const totalProductionDays = countBusinessDays(productionStartDate, install, excludeWeekends) + 1;

  // Critical path: for a single-job linear schedule every operation is on
  // the critical path, plus QC, delivery, and install.
  const criticalPath = [
    ...scheduledOps.map((op) => op.operationType),
    "QC",
    "DELIVERY",
    "INSTALL",
  ];

  return {
    installDate: install,
    deliveryDate: delivery,
    qcDate,
    productionStartDate,
    materialOrderByDate,
    operations: scheduledOps,
    totalProductionDays,
    criticalPath,
  };
}

/**
 * Sort operations to match the standard joinery production sequence.
 * Any operation type not in the standard list is appended at the end.
 */
function sortOperationsBySequence(
  operations: { operationType: string; estimatedHours: number }[]
): { operationType: string; estimatedHours: number }[] {
  const indexMap = new Map<string, number>();
  OPERATION_SEQUENCE.forEach((op, idx) => indexMap.set(op, idx));

  return [...operations].sort((a, b) => {
    const ai = indexMap.get(a.operationType) ?? OPERATION_SEQUENCE.length;
    const bi = indexMap.get(b.operationType) ?? OPERATION_SEQUENCE.length;
    return ai - bi;
  });
}

// ---------------------------------------------------------------------------
// 2. Capacity-Aware Scheduling
// ---------------------------------------------------------------------------

/**
 * Given workstation capacity data and existing bookings, find the next
 * available time window that has enough total capacity for the required hours.
 *
 * The algorithm walks forward from `earliestDate`, collecting available hours
 * day by day until enough capacity has been found to fulfil the job. It
 * respects the existing booking data and skips non-working days.
 */
export function findNextAvailableSlot(params: CapacityParams): CapacitySlot {
  const {
    workstationType,
    requiredHours,
    earliestDate,
    hoursPerDay,
    existingBookings,
  } = params;

  // Build a lookup of booked hours by date string for fast access
  const bookingMap = new Map<string, { bookedHours: number; availableHours: number }>();
  for (const booking of existingBookings) {
    const key = dateKey(booking.date);
    bookingMap.set(key, {
      bookedHours: booking.bookedHours,
      availableHours: booking.availableHours,
    });
  }

  const dailyAllocations: CapacitySlot["dailyAllocations"] = [];
  let accumulatedHours = 0;
  const cursor = startOfDay(earliestDate);
  let startDate: Date | null = null;

  // Safety limit: do not look more than 365 days out
  const maxDaysToSearch = 365;
  let daysSearched = 0;

  while (accumulatedHours < requiredHours && daysSearched < maxDaysToSearch) {
    if (!isNonWorkingDay(cursor, true)) {
      const key = dateKey(cursor);
      const booking = bookingMap.get(key);

      let available: number;
      if (booking) {
        available = Math.max(0, booking.availableHours - booking.bookedHours);
      } else {
        // No booking data for this day means fully available
        available = hoursPerDay;
      }

      if (available > 0) {
        const allocate = Math.min(available, requiredHours - accumulatedHours);
        accumulatedHours += allocate;

        if (!startDate) {
          startDate = cloneDate(cursor);
        }

        dailyAllocations.push({
          date: cloneDate(cursor),
          hoursAllocated: allocate,
          remainingCapacity: available - allocate,
        });
      }
    }

    cursor.setDate(cursor.getDate() + 1);
    daysSearched++;
  }

  if (accumulatedHours < requiredHours) {
    throw new Error(
      `Cannot find enough capacity for ${requiredHours}h of ${workstationType} ` +
        `within ${maxDaysToSearch} days of ${earliestDate.toISOString().slice(0, 10)}.`
    );
  }

  const endDate =
    dailyAllocations.length > 0
      ? cloneDate(dailyAllocations[dailyAllocations.length - 1].date)
      : cloneDate(startDate!);

  return {
    startDate: startDate!,
    endDate,
    dailyAllocations,
  };
}

// ---------------------------------------------------------------------------
// 3. Project Timeline Calculator
// ---------------------------------------------------------------------------

/**
 * For a project with multiple jobs, calculate the overall timeline.
 *
 * Each job gets backward-scheduled from the project's target date. Jobs that
 * have dependencies are scheduled such that the dependent job cannot start
 * production until its predecessor's production is complete.
 *
 * Returns overall project start date, material order dates, and milestones.
 */
export function calculateProjectTimeline(params: ProjectTimelineParams): ProjectTimeline {
  const {
    targetDate,
    jobs,
    materialLeadDays = 10,
    hoursPerDay = 8,
    excludeWeekends = true,
  } = params;

  // First pass: schedule every job backward from the target date
  const jobSchedules = new Map<string, ScheduleResult>();
  const jobMeta = new Map<string, (typeof jobs)[number]>();
  for (const job of jobs) {
    jobMeta.set(job.jobId, job);
  }

  // Topological sort: schedule independent jobs first, then dependent ones
  const scheduled = new Set<string>();
  const results: ProjectTimeline["jobs"] = [];

  // Iteratively resolve dependencies
  let iterations = 0;
  const maxIterations = jobs.length * 2; // safety valve

  while (scheduled.size < jobs.length && iterations < maxIterations) {
    iterations++;

    for (const job of jobs) {
      if (scheduled.has(job.jobId)) continue;

      // Check if dependency is satisfied
      if (job.dependsOnJobId && !scheduled.has(job.dependsOnJobId)) {
        continue; // wait for dependency
      }

      let effectiveInstallDate = ensureBusinessDay(targetDate, excludeWeekends);

      // If this job depends on another, its install date is still the project
      // target but its production cannot start before the dependency finishes.
      // We schedule backward first, then check and adjust if needed.
      const schedule = backwardScheduleJob({
        installDate: effectiveInstallDate,
        operations: job.operations,
        materialLeadDays,
        hoursPerDay,
        excludeWeekends,
      });

      // If there is a dependency, ensure production does not overlap
      if (job.dependsOnJobId) {
        const depSchedule = jobSchedules.get(job.dependsOnJobId);
        if (depSchedule) {
          const depEnd = depSchedule.operations.length > 0
            ? depSchedule.operations[depSchedule.operations.length - 1].latestEnd
            : depSchedule.productionStartDate;

          // If our production start is before the dependency ends, we need to
          // push our install date forward to accommodate.
          if (schedule.productionStartDate <= depEnd) {
            // Calculate how many production days this job needs
            const productionDaysNeeded = countBusinessDays(
              schedule.productionStartDate,
              schedule.installDate,
              excludeWeekends
            );

            // New production start = day after dependency ends
            const newProductionStart = addBusinessDays(depEnd, 1, excludeWeekends);
            const newInstallDate = addBusinessDays(
              newProductionStart,
              productionDaysNeeded,
              excludeWeekends
            );

            // Re-schedule with the adjusted install date
            const adjustedSchedule = backwardScheduleJob({
              installDate: newInstallDate,
              operations: job.operations,
              materialLeadDays,
              hoursPerDay,
              excludeWeekends,
            });

            jobSchedules.set(job.jobId, adjustedSchedule);
            results.push({
              jobId: job.jobId,
              jobName: job.jobName,
              schedule: adjustedSchedule,
            });
            scheduled.add(job.jobId);
            continue;
          }
        }
      }

      jobSchedules.set(job.jobId, schedule);
      results.push({
        jobId: job.jobId,
        jobName: job.jobName,
        schedule,
      });
      scheduled.add(job.jobId);
    }
  }

  if (scheduled.size < jobs.length) {
    const unresolved = jobs
      .filter((j) => !scheduled.has(j.jobId))
      .map((j) => j.jobId);
    throw new Error(
      `Circular or unresolvable dependencies detected for jobs: ${unresolved.join(", ")}`
    );
  }

  // Overall project dates
  const allSchedules = results.map((r) => r.schedule);
  const projectStartDate = allSchedules.reduce(
    (earliest, s) => (s.productionStartDate < earliest ? s.productionStartDate : earliest),
    allSchedules[0].productionStartDate
  );

  const projectEndDate = allSchedules.reduce(
    (latest, s) => (s.installDate > latest ? s.installDate : latest),
    allSchedules[0].installDate
  );

  const materialOrderByDate = allSchedules.reduce(
    (earliest, s) =>
      s.materialOrderByDate < earliest ? s.materialOrderByDate : earliest,
    allSchedules[0].materialOrderByDate
  );

  // Critical path: the job(s) with the longest total production duration
  // determine the project's critical path.
  const criticalPathJobs = findCriticalPathJobs(results);

  // Generate milestones
  const milestones: ProjectTimeline["milestones"] = [];
  for (const job of results) {
    milestones.push({
      name: `${job.jobName} - Material Order By`,
      date: job.schedule.materialOrderByDate,
      jobId: job.jobId,
    });
    milestones.push({
      name: `${job.jobName} - Production Start`,
      date: job.schedule.productionStartDate,
      jobId: job.jobId,
    });
    milestones.push({
      name: `${job.jobName} - QC`,
      date: job.schedule.qcDate,
      jobId: job.jobId,
    });
    milestones.push({
      name: `${job.jobName} - Delivery`,
      date: job.schedule.deliveryDate,
      jobId: job.jobId,
    });
    milestones.push({
      name: `${job.jobName} - Install`,
      date: job.schedule.installDate,
      jobId: job.jobId,
    });
  }

  // Sort milestones chronologically
  milestones.sort((a, b) => a.date.getTime() - b.date.getTime());

  return {
    projectStartDate,
    projectEndDate,
    materialOrderByDate,
    jobs: results,
    criticalPathJobs: criticalPathJobs.map((j) => j.jobId),
    milestones,
  };
}

/**
 * Identify which jobs are on the critical path. A job is critical if
 * it has the earliest production start (i.e., least slack).
 */
function findCriticalPathJobs(
  jobs: { jobId: string; jobName: string; schedule: ScheduleResult }[]
): { jobId: string; jobName: string }[] {
  if (jobs.length === 0) return [];

  // The job(s) with the latest install date and earliest production start
  // form the critical path (longest overall span).
  let maxSpan = 0;
  const spans = jobs.map((job) => {
    const span =
      job.schedule.installDate.getTime() - job.schedule.productionStartDate.getTime();
    if (span > maxSpan) maxSpan = span;
    return { jobId: job.jobId, jobName: job.jobName, span };
  });

  // Jobs within 1 day of the max span are considered critical
  const threshold = 24 * 60 * 60 * 1000; // 1 day
  return spans
    .filter((s) => maxSpan - s.span <= threshold)
    .map((s) => ({ jobId: s.jobId, jobName: s.jobName }));
}

// ---------------------------------------------------------------------------
// 4. Available Capacity Calculator
// ---------------------------------------------------------------------------

/**
 * For the sales team to see what capacity is available over a date range.
 *
 * Returns a week-by-week breakdown of available hours per workstation,
 * utilisation percentages, bottlenecks, and the earliest date a new job
 * of average size could start.
 */
export function getAvailableCapacity(params: AvailableCapacityParams): AvailableCapacityResult {
  const {
    rangeStart,
    rangeEnd,
    workstations,
    existingBookings,
    hoursPerDay = 8,
    excludeWeekends = true,
  } = params;

  // Build booking lookup: workstationType -> date -> bookedHours
  const bookingLookup = new Map<string, Map<string, number>>();
  for (const booking of existingBookings) {
    const typeKey = booking.workstationType;
    if (!bookingLookup.has(typeKey)) {
      bookingLookup.set(typeKey, new Map());
    }
    const dKey = dateKey(booking.date);
    const current = bookingLookup.get(typeKey)!.get(dKey) ?? 0;
    bookingLookup.get(typeKey)!.set(dKey, current + booking.bookedHours);
  }

  // Split the range into ISO weeks (Monday to Friday for a workshop)
  const weeks = splitIntoWeeks(startOfDay(rangeStart), startOfDay(rangeEnd));

  const weekOverviews: CapacityOverview[] = [];
  let totalCapacityAllWeeks = 0;
  let totalBookedAllWeeks = 0;

  for (const week of weeks) {
    // Count working days in this week
    const workingDays = getWorkingDaysInRange(week.start, week.end, excludeWeekends);

    const wsCapacities: WorkstationCapacity[] = [];
    let minAvailableRatio = Infinity;
    let bottleneckName = "";

    for (const ws of workstations) {
      const totalCapacity = workingDays.length * ws.hoursPerDay;

      // Sum booked hours for this workstation in this week
      let booked = 0;
      const wsBookings = bookingLookup.get(ws.type);
      if (wsBookings) {
        for (const day of workingDays) {
          const dKey = dateKey(day);
          booked += wsBookings.get(dKey) ?? 0;
        }
      }

      const available = Math.max(0, totalCapacity - booked);
      const utilization = totalCapacity > 0 ? (booked / totalCapacity) * 100 : 0;

      wsCapacities.push({
        name: ws.name,
        type: ws.type,
        totalCapacityHours: totalCapacity,
        bookedHours: booked,
        availableHours: available,
        utilizationPercent: Math.round(utilization * 10) / 10,
      });

      totalCapacityAllWeeks += totalCapacity;
      totalBookedAllWeeks += booked;

      // Track bottleneck (highest utilisation)
      const availableRatio = totalCapacity > 0 ? available / totalCapacity : 0;
      if (availableRatio < minAvailableRatio) {
        minAvailableRatio = availableRatio;
        bottleneckName = ws.type;
      }
    }

    // Determine earliest new job start for this week
    // A new job can start on the first working day that has capacity across
    // all workstation types.
    const earliestStart = findEarliestStartInRange(
      workingDays,
      workstations,
      bookingLookup
    );

    weekOverviews.push({
      weekStart: week.start,
      weekEnd: week.end,
      workstations: wsCapacities,
      bottleneck: bottleneckName,
      earliestNewJobStart: earliestStart ?? week.start,
    });
  }

  const overallUtilization =
    totalCapacityAllWeeks > 0
      ? Math.round((totalBookedAllWeeks / totalCapacityAllWeeks) * 1000) / 10
      : 0;

  // Overall earliest new job start: first week that has meaningful capacity
  const earliestNewJobStart = weekOverviews.reduce<Date | null>((earliest, w) => {
    // Consider a week "available" if at least 20% capacity is free across
    // all workstations
    const totalAvail = w.workstations.reduce((s, ws) => s + ws.availableHours, 0);
    const totalCap = w.workstations.reduce((s, ws) => s + ws.totalCapacityHours, 0);
    if (totalCap > 0 && totalAvail / totalCap >= 0.2) {
      if (!earliest || w.earliestNewJobStart < earliest) {
        return w.earliestNewJobStart;
      }
    }
    return earliest;
  }, null);

  return {
    weeks: weekOverviews,
    overallUtilizationPercent: overallUtilization,
    earliestNewJobStart: earliestNewJobStart ?? startOfDay(rangeStart),
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

interface WeekRange {
  start: Date;
  end: Date;
}

/**
 * Split a date range into week-sized chunks (Monday-Sunday).
 */
function splitIntoWeeks(from: Date, to: Date): WeekRange[] {
  const weeks: WeekRange[] = [];
  const cursor = cloneDate(from);

  // Align cursor to Monday
  const dayOfWeek = cursor.getDay();
  const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  cursor.setDate(cursor.getDate() + daysToMonday);

  while (cursor <= to) {
    const weekStart = cloneDate(cursor);
    const weekEnd = new Date(
      cursor.getFullYear(),
      cursor.getMonth(),
      cursor.getDate() + 6
    );

    weeks.push({
      start: weekStart,
      end: weekEnd > to ? cloneDate(to) : weekEnd,
    });

    cursor.setDate(cursor.getDate() + 7);
  }

  return weeks;
}

/**
 * Get all working days (non-weekend, non-holiday) within a date range (inclusive).
 */
function getWorkingDaysInRange(
  from: Date,
  to: Date,
  excludeWeekends: boolean
): Date[] {
  const days: Date[] = [];
  const cursor = cloneDate(from);
  const end = startOfDay(to);

  while (cursor <= end) {
    if (!isNonWorkingDay(cursor, excludeWeekends)) {
      days.push(cloneDate(cursor));
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return days;
}

/**
 * Within a set of working days, find the first day where all workstation
 * types have at least some capacity remaining.
 */
function findEarliestStartInRange(
  workingDays: Date[],
  workstations: { name: string; type: string; hoursPerDay: number }[],
  bookingLookup: Map<string, Map<string, number>>
): Date | null {
  for (const day of workingDays) {
    const dKey = dateKey(day);
    let allAvailable = true;

    for (const ws of workstations) {
      const wsBookings = bookingLookup.get(ws.type);
      const booked = wsBookings?.get(dKey) ?? 0;
      if (booked >= ws.hoursPerDay) {
        allAvailable = false;
        break;
      }
    }

    if (allAvailable) {
      return cloneDate(day);
    }
  }

  return null;
}

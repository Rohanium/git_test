"use client";

import { useState, useMemo } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { cn, formatDate } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────

type OperationStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
type JobPriority = "URGENT" | "HIGH" | "NORMAL" | "LOW";
type JobStatus = "PENDING" | "IN_PROGRESS" | "ON_HOLD" | "COMPLETED";
type ViewMode = "timeline" | "list";
type SortDirection = "asc" | "desc";

interface ScheduleOperation {
  id: string;
  name: string;
  workstation: string;
  estimatedHours: number;
  /** Number of business days this operation takes */
  durationDays: number;
  scheduledStart: Date;
  scheduledEnd: Date;
  /** Backward-calculated: must start by this date or the install will be late */
  latestStartDate: Date;
  latestEndDate: Date;
  status: OperationStatus;
  sequence: number;
}

interface ScheduleJob {
  id: string;
  jobNumber: string;
  projectName: string;
  customerName: string;
  projectType: string;
  installDate: Date;
  deliveryDate: Date;
  materialOrderByDate: Date;
  materialLeadTimeDays: number;
  priority: JobPriority;
  status: JobStatus;
  operations: ScheduleOperation[];
}

interface SortConfig {
  key: string;
  direction: SortDirection;
}

// ── Helper: Add Business Days ──────────────────────────────────

function addBusinessDays(date: Date, days: number): Date {
  const result = new Date(date);
  let added = 0;
  const direction = days >= 0 ? 1 : -1;
  const absDays = Math.abs(days);
  while (added < absDays) {
    result.setDate(result.getDate() + direction);
    const dayOfWeek = result.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      added++;
    }
  }
  return result;
}

function businessDaysBetween(start: Date, end: Date): number {
  let count = 0;
  const current = new Date(start);
  while (current < end) {
    current.setDate(current.getDate() + 1);
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
  }
  return count;
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysBetween(a: Date, b: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.floor((b.getTime() - a.getTime()) / msPerDay);
}

function formatShortDate(date: Date): string {
  return new Intl.DateTimeFormat("en-NZ", {
    day: "numeric",
    month: "short",
  }).format(date);
}

// ── Sample Data: Backward Scheduling ───────────────────────────
// Each job is backward-scheduled from its install date.
// The backward schedule flows:
//   Install -> Delivery -> Final QC -> Finishing -> Assembly ->
//   Edge Banding -> CNC Machining -> Cutting -> Material Order By

function buildBackwardSchedule(
  installDate: Date,
  materialLeadTimeDays: number,
  operationDefs: {
    name: string;
    workstation: string;
    durationDays: number;
    estimatedHours: number;
    status: OperationStatus;
  }[],
  scheduledOffsetDays: number // how many days ahead of latestStart the schedule actually is
): { operations: ScheduleOperation[]; deliveryDate: Date; materialOrderByDate: Date } {
  // Work backwards from install date
  let cursor = new Date(installDate);

  // Delivery is 1 business day before install
  const deliveryDate = addBusinessDays(cursor, -1);
  cursor = deliveryDate;

  // Final QC is 1 business day before delivery
  cursor = addBusinessDays(cursor, -1);

  // Build operations in reverse (from last operation to first)
  const reversedDefs = [...operationDefs].reverse();
  const latestDates: { latestStart: Date; latestEnd: Date }[] = [];

  for (const def of reversedDefs) {
    const latestEnd = new Date(cursor);
    const latestStart = addBusinessDays(cursor, -(def.durationDays - 1));
    latestDates.unshift({ latestStart, latestEnd });
    // Move cursor back to day before this operation starts
    cursor = addBusinessDays(latestStart, -1);
  }

  // Material order by date: materialLeadTimeDays before first operation must start
  const firstOpLatestStart = latestDates[0]?.latestStart ?? installDate;
  const materialOrderByDate = addBusinessDays(firstOpLatestStart, -materialLeadTimeDays);

  // Build operations with both latest (backward) dates and scheduled dates
  const operations: ScheduleOperation[] = operationDefs.map((def, idx) => {
    const latest = latestDates[idx];
    // Scheduled dates may be offset from latest dates (could be earlier)
    const scheduledStart = addBusinessDays(latest.latestStart, -scheduledOffsetDays);
    const scheduledEnd = addBusinessDays(scheduledStart, def.durationDays - 1);

    return {
      id: `op-${idx}`,
      name: def.name,
      workstation: def.workstation,
      estimatedHours: def.estimatedHours,
      durationDays: def.durationDays,
      scheduledStart,
      scheduledEnd,
      latestStartDate: latest.latestStart,
      latestEndDate: latest.latestEnd,
      status: def.status,
      sequence: idx + 1,
    };
  });

  return { operations, deliveryDate, materialOrderByDate };
}

// ── Generate Sample Jobs ───────────────────────────────────────

function generateSampleJobs(): ScheduleJob[] {
  const today = startOfDay(new Date());

  // Job 1: Kitchen - Henderson Residence (on track, install in 4 weeks)
  const install1 = addBusinessDays(today, 20);
  const sched1 = buildBackwardSchedule(install1, 10, [
    { name: "Cutting", workstation: "Panel Saw", durationDays: 1, estimatedHours: 6, status: "COMPLETED" },
    { name: "CNC Machining", workstation: "CNC Router", durationDays: 2, estimatedHours: 14, status: "COMPLETED" },
    { name: "Edge Banding", workstation: "Edge Bander", durationDays: 2, estimatedHours: 10, status: "IN_PROGRESS" },
    { name: "Drilling", workstation: "Line Borer", durationDays: 1, estimatedHours: 4, status: "NOT_STARTED" },
    { name: "Assembly", workstation: "Assembly Bench 1", durationDays: 4, estimatedHours: 28, status: "NOT_STARTED" },
    { name: "Spray Painting", workstation: "Spray Booth", durationDays: 3, estimatedHours: 18, status: "NOT_STARTED" },
    { name: "Final QC", workstation: "QC Station", durationDays: 1, estimatedHours: 3, status: "NOT_STARTED" },
  ], 3);

  // Job 2: Bathroom Vanity - Smith Project (urgent, tight timeline)
  const install2 = addBusinessDays(today, 8);
  const sched2 = buildBackwardSchedule(install2, 7, [
    { name: "Cutting", workstation: "Panel Saw", durationDays: 1, estimatedHours: 3, status: "COMPLETED" },
    { name: "CNC Machining", workstation: "CNC Router", durationDays: 1, estimatedHours: 6, status: "COMPLETED" },
    { name: "Edge Banding", workstation: "Edge Bander", durationDays: 1, estimatedHours: 4, status: "COMPLETED" },
    { name: "Assembly", workstation: "Assembly Bench 2", durationDays: 2, estimatedHours: 12, status: "IN_PROGRESS" },
    { name: "Spray Painting", workstation: "Spray Booth", durationDays: 2, estimatedHours: 10, status: "NOT_STARTED" },
    { name: "Final QC", workstation: "QC Station", durationDays: 1, estimatedHours: 2, status: "NOT_STARTED" },
  ], 0);

  // Job 3: Wardrobe - Taylor Build (overdue, should have started already)
  const install3 = addBusinessDays(today, 5);
  const sched3 = buildBackwardSchedule(install3, 8, [
    { name: "Cutting", workstation: "Panel Saw", durationDays: 1, estimatedHours: 5, status: "NOT_STARTED" },
    { name: "CNC Machining", workstation: "CNC Router", durationDays: 1, estimatedHours: 8, status: "NOT_STARTED" },
    { name: "Edge Banding", workstation: "Edge Bander", durationDays: 1, estimatedHours: 5, status: "NOT_STARTED" },
    { name: "Assembly", workstation: "Assembly Bench 1", durationDays: 3, estimatedHours: 20, status: "NOT_STARTED" },
    { name: "Hand Finishing", workstation: "Finishing Bench", durationDays: 2, estimatedHours: 12, status: "NOT_STARTED" },
    { name: "Final QC", workstation: "QC Station", durationDays: 1, estimatedHours: 2, status: "NOT_STARTED" },
  ], 0);

  // Job 4: Commercial Fitout - Auckland CBD Office (large job, in progress)
  const install4 = addBusinessDays(today, 30);
  const sched4 = buildBackwardSchedule(install4, 15, [
    { name: "Cutting", workstation: "Panel Saw", durationDays: 3, estimatedHours: 20, status: "COMPLETED" },
    { name: "CNC Machining", workstation: "CNC Router", durationDays: 4, estimatedHours: 30, status: "IN_PROGRESS" },
    { name: "Edge Banding", workstation: "Edge Bander", durationDays: 3, estimatedHours: 18, status: "NOT_STARTED" },
    { name: "Drilling", workstation: "Line Borer", durationDays: 2, estimatedHours: 10, status: "NOT_STARTED" },
    { name: "Assembly", workstation: "Assembly Bench 1", durationDays: 5, estimatedHours: 40, status: "NOT_STARTED" },
    { name: "Spray Painting", workstation: "Spray Booth", durationDays: 4, estimatedHours: 28, status: "NOT_STARTED" },
    { name: "Fitting Hardware", workstation: "Assembly Bench 2", durationDays: 2, estimatedHours: 14, status: "NOT_STARTED" },
    { name: "Final QC", workstation: "QC Station", durationDays: 1, estimatedHours: 4, status: "NOT_STARTED" },
  ], 5);

  // Job 5: Study/Office - Patel Home (coming due soon)
  const install5 = addBusinessDays(today, 10);
  const sched5 = buildBackwardSchedule(install5, 7, [
    { name: "Cutting", workstation: "Panel Saw", durationDays: 1, estimatedHours: 4, status: "COMPLETED" },
    { name: "CNC Machining", workstation: "CNC Router", durationDays: 1, estimatedHours: 6, status: "COMPLETED" },
    { name: "Edge Banding", workstation: "Edge Bander", durationDays: 1, estimatedHours: 4, status: "COMPLETED" },
    { name: "Assembly", workstation: "Assembly Bench 2", durationDays: 2, estimatedHours: 14, status: "NOT_STARTED" },
    { name: "Staining", workstation: "Finishing Bench", durationDays: 2, estimatedHours: 8, status: "NOT_STARTED" },
    { name: "Lacquering", workstation: "Spray Booth", durationDays: 1, estimatedHours: 4, status: "NOT_STARTED" },
    { name: "Final QC", workstation: "QC Station", durationDays: 1, estimatedHours: 2, status: "NOT_STARTED" },
  ], 1);

  // Job 6: Kitchen - Westmere Renovation (completed)
  const install6 = addBusinessDays(today, -2);
  const sched6 = buildBackwardSchedule(install6, 10, [
    { name: "Cutting", workstation: "Panel Saw", durationDays: 1, estimatedHours: 6, status: "COMPLETED" },
    { name: "CNC Machining", workstation: "CNC Router", durationDays: 2, estimatedHours: 14, status: "COMPLETED" },
    { name: "Edge Banding", workstation: "Edge Bander", durationDays: 2, estimatedHours: 10, status: "COMPLETED" },
    { name: "Assembly", workstation: "Assembly Bench 1", durationDays: 3, estimatedHours: 22, status: "COMPLETED" },
    { name: "Spray Painting", workstation: "Spray Booth", durationDays: 3, estimatedHours: 18, status: "COMPLETED" },
    { name: "Final QC", workstation: "QC Station", durationDays: 1, estimatedHours: 3, status: "COMPLETED" },
  ], 2);

  // Job 7: Laundry - Brown Apartment (needs materials ordered this week)
  const install7 = addBusinessDays(today, 18);
  const sched7 = buildBackwardSchedule(install7, 8, [
    { name: "Cutting", workstation: "Panel Saw", durationDays: 1, estimatedHours: 3, status: "NOT_STARTED" },
    { name: "Edge Banding", workstation: "Edge Bander", durationDays: 1, estimatedHours: 3, status: "NOT_STARTED" },
    { name: "Assembly", workstation: "Assembly Bench 2", durationDays: 2, estimatedHours: 10, status: "NOT_STARTED" },
    { name: "Spray Painting", workstation: "Spray Booth", durationDays: 2, estimatedHours: 8, status: "NOT_STARTED" },
    { name: "Final QC", workstation: "QC Station", durationDays: 1, estimatedHours: 2, status: "NOT_STARTED" },
  ], 0);

  // Job 8: Entertainment Unit - Wilson Lounge (at risk)
  const install8 = addBusinessDays(today, 7);
  const sched8 = buildBackwardSchedule(install8, 5, [
    { name: "Cutting", workstation: "Panel Saw", durationDays: 1, estimatedHours: 3, status: "COMPLETED" },
    { name: "CNC Machining", workstation: "CNC Router", durationDays: 1, estimatedHours: 5, status: "IN_PROGRESS" },
    { name: "Edge Banding", workstation: "Edge Bander", durationDays: 1, estimatedHours: 3, status: "NOT_STARTED" },
    { name: "Assembly", workstation: "Assembly Bench 1", durationDays: 2, estimatedHours: 10, status: "NOT_STARTED" },
    { name: "Hand Finishing", workstation: "Finishing Bench", durationDays: 1, estimatedHours: 5, status: "NOT_STARTED" },
    { name: "Final QC", workstation: "QC Station", durationDays: 1, estimatedHours: 2, status: "NOT_STARTED" },
  ], 0);

  // Job 9: Bookcase - Morgan Library (future job)
  const install9 = addBusinessDays(today, 35);
  const sched9 = buildBackwardSchedule(install9, 10, [
    { name: "Cutting", workstation: "Panel Saw", durationDays: 1, estimatedHours: 4, status: "NOT_STARTED" },
    { name: "CNC Machining", workstation: "CNC Router", durationDays: 2, estimatedHours: 12, status: "NOT_STARTED" },
    { name: "Edge Banding", workstation: "Edge Bander", durationDays: 1, estimatedHours: 5, status: "NOT_STARTED" },
    { name: "Assembly", workstation: "Assembly Bench 2", durationDays: 3, estimatedHours: 18, status: "NOT_STARTED" },
    { name: "Staining", workstation: "Finishing Bench", durationDays: 2, estimatedHours: 10, status: "NOT_STARTED" },
    { name: "Lacquering", workstation: "Spray Booth", durationDays: 2, estimatedHours: 10, status: "NOT_STARTED" },
    { name: "Final QC", workstation: "QC Station", durationDays: 1, estimatedHours: 3, status: "NOT_STARTED" },
  ], 0);

  // Job 10: Exterior Joinery - Devonport Deck (needs materials this week)
  const install10 = addBusinessDays(today, 16);
  const sched10 = buildBackwardSchedule(install10, 12, [
    { name: "Cutting", workstation: "Panel Saw", durationDays: 2, estimatedHours: 12, status: "NOT_STARTED" },
    { name: "Routing", workstation: "CNC Router", durationDays: 2, estimatedHours: 10, status: "NOT_STARTED" },
    { name: "Sanding", workstation: "Sanding Station", durationDays: 1, estimatedHours: 6, status: "NOT_STARTED" },
    { name: "Assembly", workstation: "Assembly Bench 1", durationDays: 3, estimatedHours: 20, status: "NOT_STARTED" },
    { name: "Staining", workstation: "Finishing Bench", durationDays: 2, estimatedHours: 10, status: "NOT_STARTED" },
    { name: "Final QC", workstation: "QC Station", durationDays: 1, estimatedHours: 3, status: "NOT_STARTED" },
  ], 0);

  return [
    {
      id: "job-1", jobNumber: "JOB-2506-0012", projectName: "Henderson Kitchen",
      customerName: "Henderson Builders Ltd", projectType: "Kitchen",
      installDate: install1, deliveryDate: sched1.deliveryDate,
      materialOrderByDate: sched1.materialOrderByDate, materialLeadTimeDays: 10,
      priority: "NORMAL", status: "IN_PROGRESS", operations: sched1.operations,
    },
    {
      id: "job-2", jobNumber: "JOB-2506-0013", projectName: "Smith Vanity",
      customerName: "Smith & Partners", projectType: "Bathroom Vanity",
      installDate: install2, deliveryDate: sched2.deliveryDate,
      materialOrderByDate: sched2.materialOrderByDate, materialLeadTimeDays: 7,
      priority: "URGENT", status: "IN_PROGRESS", operations: sched2.operations,
    },
    {
      id: "job-3", jobNumber: "JOB-2506-0014", projectName: "Taylor Wardrobe",
      customerName: "Taylor Construction", projectType: "Wardrobe",
      installDate: install3, deliveryDate: sched3.deliveryDate,
      materialOrderByDate: sched3.materialOrderByDate, materialLeadTimeDays: 8,
      priority: "HIGH", status: "IN_PROGRESS", operations: sched3.operations,
    },
    {
      id: "job-4", jobNumber: "JOB-2506-0015", projectName: "CBD Office Fitout",
      customerName: "Metro Commercial Group", projectType: "Commercial Fitout",
      installDate: install4, deliveryDate: sched4.deliveryDate,
      materialOrderByDate: sched4.materialOrderByDate, materialLeadTimeDays: 15,
      priority: "HIGH", status: "IN_PROGRESS", operations: sched4.operations,
    },
    {
      id: "job-5", jobNumber: "JOB-2506-0016", projectName: "Patel Home Office",
      customerName: "R. Patel", projectType: "Study / Office",
      installDate: install5, deliveryDate: sched5.deliveryDate,
      materialOrderByDate: sched5.materialOrderByDate, materialLeadTimeDays: 7,
      priority: "NORMAL", status: "IN_PROGRESS", operations: sched5.operations,
    },
    {
      id: "job-6", jobNumber: "JOB-2506-0008", projectName: "Westmere Kitchen",
      customerName: "Westmere Developments", projectType: "Kitchen",
      installDate: install6, deliveryDate: sched6.deliveryDate,
      materialOrderByDate: sched6.materialOrderByDate, materialLeadTimeDays: 10,
      priority: "NORMAL", status: "COMPLETED", operations: sched6.operations,
    },
    {
      id: "job-7", jobNumber: "JOB-2506-0017", projectName: "Brown Laundry",
      customerName: "J. Brown", projectType: "Laundry",
      installDate: install7, deliveryDate: sched7.deliveryDate,
      materialOrderByDate: sched7.materialOrderByDate, materialLeadTimeDays: 8,
      priority: "NORMAL", status: "PENDING", operations: sched7.operations,
    },
    {
      id: "job-8", jobNumber: "JOB-2506-0018", projectName: "Wilson Entertainment Unit",
      customerName: "Wilson Family Trust", projectType: "Entertainment Unit",
      installDate: install8, deliveryDate: sched8.deliveryDate,
      materialOrderByDate: sched8.materialOrderByDate, materialLeadTimeDays: 5,
      priority: "HIGH", status: "IN_PROGRESS", operations: sched8.operations,
    },
    {
      id: "job-9", jobNumber: "JOB-2506-0019", projectName: "Morgan Library Bookcase",
      customerName: "Morgan & Associates", projectType: "Bookcase / Shelving",
      installDate: install9, deliveryDate: sched9.deliveryDate,
      materialOrderByDate: sched9.materialOrderByDate, materialLeadTimeDays: 10,
      priority: "LOW", status: "PENDING", operations: sched9.operations,
    },
    {
      id: "job-10", jobNumber: "JOB-2506-0020", projectName: "Devonport Deck Joinery",
      customerName: "Devonport Homes Ltd", projectType: "Exterior Joinery",
      installDate: install10, deliveryDate: sched10.deliveryDate,
      materialOrderByDate: sched10.materialOrderByDate, materialLeadTimeDays: 12,
      priority: "NORMAL", status: "PENDING", operations: sched10.operations,
    },
  ];
}

// ── Determine Operation Bar Color ──────────────────────────────

function getOperationColor(op: ScheduleOperation, today: Date): string {
  if (op.status === "COMPLETED") return "green";
  if (op.status === "NOT_STARTED" && startOfDay(op.latestStartDate) < today) return "red";
  if (daysBetween(today, startOfDay(op.latestStartDate)) <= 2 && op.status === "NOT_STARTED") return "amber";
  if (op.status === "IN_PROGRESS") return "blue";
  // Future operation with comfortable margin
  if (daysBetween(today, startOfDay(op.latestStartDate)) > 2) return "gray";
  return "blue";
}

function getRowColor(job: ScheduleJob, today: Date): string {
  if (job.status === "COMPLETED") return "gray";
  // Check if any NOT_STARTED operation is past its latestStartDate
  const hasOverdue = job.operations.some(
    (op) => op.status === "NOT_STARTED" && startOfDay(op.latestStartDate) < today
  );
  if (hasOverdue) return "red";
  // Check if any operation's latestStartDate is within 3 days
  const hasUrgent = job.operations.some(
    (op) =>
      op.status !== "COMPLETED" &&
      daysBetween(today, startOfDay(op.latestStartDate)) <= 3 &&
      daysBetween(today, startOfDay(op.latestStartDate)) >= 0
  );
  if (hasUrgent) return "amber";
  return "green";
}

// ── Component ──────────────────────────────────────────────────

export default function SchedulePage() {
  // tRPC pattern (commented out for sample data):
  // const { data: scheduleData, isLoading } = trpc.production.getSchedule.useQuery({
  //   dateFrom: dateRange.from,
  //   dateTo: dateRange.to,
  //   status: statusFilter,
  //   priority: priorityFilter,
  // });
  // const { data: overviewData } = trpc.production.getScheduleOverview.useQuery();

  const [viewMode, setViewMode] = useState<ViewMode>("timeline");
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: "installDate", direction: "asc" });
  const [dateRange, setDateRange] = useState(() => {
    const from = new Date();
    from.setDate(from.getDate() - 7);
    const to = new Date();
    to.setDate(to.getDate() + 42);
    return { from, to };
  });

  const today = startOfDay(new Date());
  const allJobs = useMemo(() => generateSampleJobs(), []);

  // ── Filtering ──────────────────────────────────────────────

  const filteredJobs = useMemo(() => {
    return allJobs.filter((job) => {
      if (statusFilter !== "all" && job.status !== statusFilter) return false;
      if (priorityFilter !== "all" && job.priority !== priorityFilter) return false;
      return true;
    });
  }, [allJobs, statusFilter, priorityFilter]);

  // ── Sorting (for list view) ────────────────────────────────

  const sortedJobs = useMemo(() => {
    const sorted = [...filteredJobs];
    sorted.sort((a, b) => {
      const dir = sortConfig.direction === "asc" ? 1 : -1;
      switch (sortConfig.key) {
        case "jobNumber":
          return dir * a.jobNumber.localeCompare(b.jobNumber);
        case "projectName":
          return dir * a.projectName.localeCompare(b.projectName);
        case "installDate":
          return dir * (a.installDate.getTime() - b.installDate.getTime());
        case "priority": {
          const priorityOrder: Record<string, number> = { URGENT: 0, HIGH: 1, NORMAL: 2, LOW: 3 };
          return dir * ((priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2));
        }
        case "status": {
          const statusOrder: Record<string, number> = { IN_PROGRESS: 0, PENDING: 1, ON_HOLD: 2, COMPLETED: 3 };
          return dir * ((statusOrder[a.status] ?? 2) - (statusOrder[b.status] ?? 2));
        }
        default:
          return 0;
      }
    });
    return sorted;
  }, [filteredJobs, sortConfig]);

  // ── Overview Calculations ──────────────────────────────────

  const endOfWeek = new Date(today);
  endOfWeek.setDate(endOfWeek.getDate() + (5 - endOfWeek.getDay()));

  const materialOrdersThisWeek = allJobs.filter(
    (j) =>
      j.status !== "COMPLETED" &&
      j.materialOrderByDate >= today &&
      j.materialOrderByDate <= endOfWeek
  );

  const productionStartsThisWeek = allJobs.filter((j) => {
    const firstOp = j.operations[0];
    return (
      firstOp &&
      j.status !== "COMPLETED" &&
      firstOp.scheduledStart >= today &&
      firstOp.scheduledStart <= endOfWeek
    );
  });

  const overdueOps = allJobs
    .filter((j) => j.status !== "COMPLETED")
    .flatMap((j) =>
      j.operations
        .filter((op) => op.status === "NOT_STARTED" && startOfDay(op.latestStartDate) < today)
        .map((op) => ({ job: j, operation: op }))
    );

  const dueSoon48h = allJobs
    .filter((j) => j.status !== "COMPLETED")
    .flatMap((j) =>
      j.operations
        .filter((op) => {
          const daysUntil = daysBetween(today, startOfDay(op.latestStartDate));
          return op.status !== "COMPLETED" && daysUntil >= 0 && daysUntil <= 2;
        })
        .map((op) => ({ job: j, operation: op }))
    );

  // ── Sort Handler ───────────────────────────────────────────

  function handleSort(key: string) {
    setSortConfig((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" }
    );
  }

  function SortIndicator({ column }: { column: string }) {
    if (sortConfig.key !== column) return <span className="ml-1 text-muted-foreground/40">&#x2195;</span>;
    return (
      <span className="ml-1">
        {sortConfig.direction === "asc" ? "\u2191" : "\u2193"}
      </span>
    );
  }

  // ── Gantt Timeline Calculations ────────────────────────────

  const timelineStart = startOfDay(new Date(dateRange.from));
  const timelineEnd = startOfDay(new Date(dateRange.to));
  const totalTimelineDays = daysBetween(timelineStart, timelineEnd);

  function getBarPosition(start: Date, end: Date) {
    const startDay = Math.max(0, daysBetween(timelineStart, startOfDay(start)));
    const endDay = Math.min(totalTimelineDays, daysBetween(timelineStart, startOfDay(end)) + 1);
    const left = (startDay / totalTimelineDays) * 100;
    const width = Math.max(((endDay - startDay) / totalTimelineDays) * 100, 0.5);
    return { left: `${left}%`, width: `${width}%` };
  }

  function getTodayPosition() {
    const dayOffset = daysBetween(timelineStart, today);
    return `${(dayOffset / totalTimelineDays) * 100}%`;
  }

  function getMarkerPosition(date: Date) {
    const dayOffset = daysBetween(timelineStart, startOfDay(date));
    return `${(dayOffset / totalTimelineDays) * 100}%`;
  }

  // Generate week labels for the timeline header
  const weekLabels: { label: string; left: string; width: string }[] = [];
  {
    const cursor = new Date(timelineStart);
    // Align to start of week (Monday)
    const dayOfWeek = cursor.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    cursor.setDate(cursor.getDate() + mondayOffset);

    while (cursor < timelineEnd) {
      const weekStart = new Date(cursor);
      const weekEnd = new Date(cursor);
      weekEnd.setDate(weekEnd.getDate() + 6);
      const startDay = Math.max(0, daysBetween(timelineStart, weekStart));
      const endDay = Math.min(totalTimelineDays, daysBetween(timelineStart, weekEnd) + 1);
      const left = (startDay / totalTimelineDays) * 100;
      const width = ((endDay - startDay) / totalTimelineDays) * 100;
      weekLabels.push({
        label: formatShortDate(weekStart),
        left: `${left}%`,
        width: `${width}%`,
      });
      cursor.setDate(cursor.getDate() + 7);
    }
  }

  // ── Operation Color Classes ────────────────────────────────

  const barColorClasses: Record<string, string> = {
    blue: "bg-blue-500 hover:bg-blue-600",
    green: "bg-emerald-500 hover:bg-emerald-600",
    red: "bg-red-500 hover:bg-red-600",
    amber: "bg-amber-500 hover:bg-amber-600",
    gray: "bg-gray-400 hover:bg-gray-500",
  };

  const rowHighlightClasses: Record<string, string> = {
    red: "bg-red-50 dark:bg-red-950/20 border-l-4 border-l-red-500",
    amber: "bg-amber-50 dark:bg-amber-950/20 border-l-4 border-l-amber-500",
    green: "bg-emerald-50/50 dark:bg-emerald-950/10 border-l-4 border-l-emerald-500",
    gray: "bg-gray-50 dark:bg-gray-900/20 border-l-4 border-l-gray-400 opacity-60",
  };

  // ── Render ─────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────── */}
      <PageHeader
        title="Production Schedule"
        description="View and manage factory schedule with backward-calculated deadlines."
        actions={
          <div className="flex items-center gap-3">
            {/* View Toggle */}
            <div className="flex rounded-lg border bg-muted p-1">
              <button
                onClick={() => setViewMode("timeline")}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  viewMode === "timeline"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Timeline View
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  viewMode === "list"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                List View
              </button>
            </div>

            {/* Date Range Selector */}
            <div className="flex items-center gap-2 rounded-lg border bg-background px-3 py-1.5">
              <label className="text-xs font-medium text-muted-foreground">From</label>
              <input
                type="date"
                value={dateRange.from.toISOString().split("T")[0]}
                onChange={(e) =>
                  setDateRange((prev) => ({ ...prev, from: new Date(e.target.value) }))
                }
                className="border-0 bg-transparent text-sm outline-none"
              />
              <label className="text-xs font-medium text-muted-foreground">To</label>
              <input
                type="date"
                value={dateRange.to.toISOString().split("T")[0]}
                onChange={(e) =>
                  setDateRange((prev) => ({ ...prev, to: new Date(e.target.value) }))
                }
                className="border-0 bg-transparent text-sm outline-none"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border bg-background px-3 py-2 text-sm"
            >
              <option value="all">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="ON_HOLD">On Hold</option>
              <option value="COMPLETED">Completed</option>
            </select>

            {/* Priority Filter */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="rounded-lg border bg-background px-3 py-2 text-sm"
            >
              <option value="all">All Priorities</option>
              <option value="URGENT">Urgent</option>
              <option value="HIGH">High</option>
              <option value="NORMAL">Normal</option>
              <option value="LOW">Low</option>
            </select>
          </div>
        }
      />

      {/* ── Section 1: Schedule Overview Cards ─────────────── */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Material Orders This Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{materialOrdersThisWeek.length}</p>
            {materialOrdersThisWeek.length > 0 && (
              <div className="mt-2 space-y-1">
                {materialOrdersThisWeek.map((j) => (
                  <div key={j.id} className="flex items-center justify-between text-xs">
                    <span className="font-mono">{j.jobNumber}</span>
                    <span className="text-muted-foreground">
                      Order by {formatShortDate(j.materialOrderByDate)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Production Starts This Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{productionStartsThisWeek.length}</p>
            {productionStartsThisWeek.length > 0 && (
              <div className="mt-2 space-y-1">
                {productionStartsThisWeek.map((j) => (
                  <div key={j.id} className="flex items-center justify-between text-xs">
                    <span className="font-mono">{j.jobNumber}</span>
                    <span className="text-muted-foreground">{j.projectName}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card
          className={cn(
            "cursor-pointer hover:shadow-md transition-shadow",
            overdueOps.length > 0 && "border-red-300 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20"
          )}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-600 dark:text-red-400">
              Overdue Operations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600 dark:text-red-400">
              {overdueOps.length}
            </p>
            {overdueOps.length > 0 && (
              <div className="mt-2 space-y-1">
                {overdueOps.slice(0, 4).map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <span className="font-mono text-red-700 dark:text-red-300">
                      {item.job.jobNumber}
                    </span>
                    <span className="text-red-600 dark:text-red-400">
                      {item.operation.name}
                    </span>
                  </div>
                ))}
                {overdueOps.length > 4 && (
                  <p className="text-xs text-red-500">+{overdueOps.length - 4} more</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card
          className={cn(
            "cursor-pointer hover:shadow-md transition-shadow",
            dueSoon48h.length > 0 &&
              "border-amber-300 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20"
          )}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-amber-600 dark:text-amber-400">
              Due Within 48 Hours
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">
              {dueSoon48h.length}
            </p>
            {dueSoon48h.length > 0 && (
              <div className="mt-2 space-y-1">
                {dueSoon48h.slice(0, 4).map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <span className="font-mono text-amber-700 dark:text-amber-300">
                      {item.job.jobNumber}
                    </span>
                    <span className="text-amber-600 dark:text-amber-400">
                      {item.operation.name}
                    </span>
                  </div>
                ))}
                {dueSoon48h.length > 4 && (
                  <p className="text-xs text-amber-500">+{dueSoon48h.length - 4} more</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Section 2: Gantt Timeline View ─────────────────── */}
      {viewMode === "timeline" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Gantt Timeline</CardTitle>
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="inline-block h-3 w-3 rounded-sm bg-blue-500" />
                  <span>Scheduled</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="inline-block h-3 w-3 rounded-sm bg-emerald-500" />
                  <span>Completed</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="inline-block h-3 w-3 rounded-sm bg-red-500" />
                  <span>Overdue</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="inline-block h-3 w-3 rounded-sm bg-amber-500" />
                  <span>At Risk</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="inline-block h-3 w-3 rounded-sm bg-gray-400" />
                  <span>Future</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="inline-block text-red-500 text-sm font-bold leading-none">|</span>
                  <span>Today</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="inline-block text-violet-500 text-sm leading-none">&#9670;</span>
                  <span>Install</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="inline-block text-orange-500 text-sm leading-none">&#9650;</span>
                  <span>Material Order By</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <div className="min-w-[900px]">
                {/* Timeline Header */}
                <div className="flex border-b">
                  <div className="w-64 shrink-0 border-r px-3 py-2">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Job
                    </span>
                  </div>
                  <div className="relative flex-1">
                    <div className="flex">
                      {weekLabels.map((wl, idx) => (
                        <div
                          key={idx}
                          className="border-r py-2 text-center text-xs font-medium text-muted-foreground"
                          style={{
                            position: "absolute",
                            left: wl.left,
                            width: wl.width,
                          }}
                        >
                          {wl.label}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Timeline Rows */}
                {sortedJobs.map((job) => {
                  const rowColor = getRowColor(job, today);
                  return (
                    <div
                      key={job.id}
                      className={cn(
                        "flex border-b transition-colors hover:bg-muted/30 cursor-pointer",
                        expandedJobId === job.id && "bg-muted/20"
                      )}
                      onClick={() =>
                        setExpandedJobId(expandedJobId === job.id ? null : job.id)
                      }
                    >
                      {/* Job Info Column */}
                      <div className="w-64 shrink-0 border-r px-3 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-semibold">
                            {job.jobNumber}
                          </span>
                          <Badge
                            variant={
                              job.priority === "URGENT"
                                ? "destructive"
                                : job.priority === "HIGH"
                                  ? "warning"
                                  : "outline"
                            }
                          >
                            {job.priority}
                          </Badge>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground truncate">
                          {job.projectName}
                        </p>
                        <p className="text-[10px] text-muted-foreground/70">
                          Install: {formatShortDate(job.installDate)}
                        </p>
                      </div>

                      {/* Timeline Column */}
                      <div className="relative flex-1 py-2 min-h-[56px]">
                        {/* Today vertical line */}
                        <div
                          className="absolute top-0 bottom-0 w-px bg-red-500 z-10"
                          style={{ left: getTodayPosition() }}
                        >
                          <div className="absolute -top-0 -left-[8px] text-[8px] font-bold text-red-500 bg-background px-0.5">
                            TODAY
                          </div>
                        </div>

                        {/* Install Date diamond marker */}
                        <div
                          className="absolute top-1/2 -translate-y-1/2 z-20"
                          style={{ left: getMarkerPosition(job.installDate) }}
                          title={`Install: ${formatDate(job.installDate)}`}
                        >
                          <span className="text-violet-500 text-sm leading-none">&#9670;</span>
                        </div>

                        {/* Material Order By triangle marker */}
                        <div
                          className="absolute bottom-1 z-20"
                          style={{ left: getMarkerPosition(job.materialOrderByDate) }}
                          title={`Material Order By: ${formatDate(job.materialOrderByDate)}`}
                        >
                          <span className="text-orange-500 text-[10px] leading-none">&#9650;</span>
                        </div>

                        {/* Operation Bars */}
                        {job.operations.map((op) => {
                          const color = getOperationColor(op, today);
                          const pos = getBarPosition(op.scheduledStart, op.scheduledEnd);
                          return (
                            <div
                              key={op.id}
                              className={cn(
                                "absolute top-1/2 -translate-y-1/2 h-5 rounded-sm text-white text-[9px] flex items-center px-1 truncate cursor-pointer transition-all group",
                                barColorClasses[color]
                              )}
                              style={{
                                left: pos.left,
                                width: pos.width,
                                minWidth: "4px",
                              }}
                              title={[
                                op.name,
                                `Scheduled: ${formatShortDate(op.scheduledStart)} - ${formatShortDate(op.scheduledEnd)}`,
                                `Latest Start: ${formatShortDate(op.latestStartDate)}`,
                                `Workstation: ${op.workstation}`,
                                `Est. Hours: ${op.estimatedHours}h`,
                              ].join("\n")}
                            >
                              <span className="truncate">{op.name}</span>
                              {/* Hover tooltip */}
                              <div className="absolute bottom-full left-0 mb-1 hidden group-hover:block z-50 pointer-events-none">
                                <div className="rounded-lg border bg-popover p-2 text-popover-foreground shadow-lg text-[10px] whitespace-nowrap space-y-0.5">
                                  <p className="font-semibold text-xs">{op.name}</p>
                                  <p>
                                    Scheduled: {formatShortDate(op.scheduledStart)} -{" "}
                                    {formatShortDate(op.scheduledEnd)}
                                  </p>
                                  <p>Latest Start: {formatShortDate(op.latestStartDate)}</p>
                                  <p>Workstation: {op.workstation}</p>
                                  <p>Est. Hours: {op.estimatedHours}h</p>
                                  <p>Status: {op.status.replace(/_/g, " ")}</p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Section 3: List View (tabular) ─────────────────── */}
      {viewMode === "list" && (
        <Card>
          <CardHeader>
            <CardTitle>Schedule List</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    {[
                      { key: "jobNumber", label: "Job Number" },
                      { key: "projectName", label: "Project Name" },
                      { key: "operation", label: "Operation" },
                      { key: "workstation", label: "Workstation" },
                      { key: "latestStart", label: "Latest Start" },
                      { key: "scheduledStart", label: "Scheduled Start" },
                      { key: "scheduledEnd", label: "Scheduled End" },
                      { key: "estHours", label: "Est. Hours" },
                      { key: "status", label: "Status" },
                      { key: "priority", label: "Priority" },
                      { key: "installDate", label: "Install Date" },
                      { key: "materialOrderBy", label: "Material Order By" },
                    ].map((col) => (
                      <th
                        key={col.key}
                        className="px-3 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground whitespace-nowrap"
                        onClick={() => handleSort(col.key)}
                      >
                        {col.label}
                        <SortIndicator column={col.key} />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedJobs.flatMap((job) => {
                    const rowColor = getRowColor(job, today);
                    return job.operations.map((op, opIdx) => {
                      const opColor = getOperationColor(op, today);
                      const isLatestStartOverdue =
                        op.status === "NOT_STARTED" &&
                        startOfDay(op.latestStartDate) < today;
                      return (
                        <tr
                          key={`${job.id}-${op.id}`}
                          className={cn(
                            "border-b transition-colors hover:bg-muted/30 cursor-pointer",
                            rowHighlightClasses[rowColor]
                          )}
                          onClick={() =>
                            setExpandedJobId(expandedJobId === job.id ? null : job.id)
                          }
                        >
                          {/* Job Number — only show on first row per job */}
                          <td className="px-3 py-2.5">
                            {opIdx === 0 ? (
                              <span className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                                {job.jobNumber}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground/40">
                                {"\u2514"}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-xs">
                            {opIdx === 0 ? job.projectName : ""}
                          </td>
                          <td className="px-3 py-2.5 text-xs font-medium">{op.name}</td>
                          <td className="px-3 py-2.5 text-xs text-muted-foreground">
                            {op.workstation}
                          </td>
                          <td
                            className={cn(
                              "px-3 py-2.5 text-xs font-medium whitespace-nowrap",
                              isLatestStartOverdue
                                ? "text-red-600 dark:text-red-400 font-bold"
                                : ""
                            )}
                          >
                            {formatShortDate(op.latestStartDate)}
                            {isLatestStartOverdue && (
                              <Badge variant="destructive" className="ml-1.5 text-[9px] px-1.5 py-0">
                                OVERDUE
                              </Badge>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-xs whitespace-nowrap">
                            {formatShortDate(op.scheduledStart)}
                          </td>
                          <td className="px-3 py-2.5 text-xs whitespace-nowrap">
                            {formatShortDate(op.scheduledEnd)}
                          </td>
                          <td className="px-3 py-2.5 text-xs text-center">
                            {op.estimatedHours}h
                          </td>
                          <td className="px-3 py-2.5">
                            <Badge
                              variant={
                                op.status === "COMPLETED"
                                  ? "success"
                                  : op.status === "IN_PROGRESS"
                                    ? "warning"
                                    : "secondary"
                              }
                            >
                              {op.status.replace(/_/g, " ")}
                            </Badge>
                          </td>
                          <td className="px-3 py-2.5">
                            {opIdx === 0 && (
                              <Badge
                                variant={
                                  job.priority === "URGENT"
                                    ? "destructive"
                                    : job.priority === "HIGH"
                                      ? "warning"
                                      : "outline"
                                }
                              >
                                {job.priority}
                              </Badge>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-xs whitespace-nowrap">
                            {opIdx === 0 ? formatShortDate(job.installDate) : ""}
                          </td>
                          <td className="px-3 py-2.5 text-xs whitespace-nowrap">
                            {opIdx === 0 ? formatShortDate(job.materialOrderByDate) : ""}
                          </td>
                        </tr>
                      );
                    });
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Section 4: Backward Schedule Detail (expanded job) */}
      {expandedJobId && (
        <BackwardScheduleDetail
          job={sortedJobs.find((j) => j.id === expandedJobId) ?? null}
          today={today}
          onClose={() => setExpandedJobId(null)}
        />
      )}
    </div>
  );
}

// ── Backward Schedule Detail Component ───────────────────────

function BackwardScheduleDetail({
  job,
  today,
  onClose,
}: {
  job: ScheduleJob | null;
  today: Date;
  onClose: () => void;
}) {
  if (!job) return null;

  // Build the full backward chain for display
  const backwardSteps: {
    label: string;
    dateRange: string;
    detail: string;
    isOverdue: boolean;
    isAtRisk: boolean;
    isCompleted: boolean;
  }[] = [];

  // Install Date
  backwardSteps.push({
    label: "Install Date",
    dateRange: formatShortDate(job.installDate),
    detail: "",
    isOverdue: false,
    isAtRisk: false,
    isCompleted: job.status === "COMPLETED",
  });

  // Delivery
  backwardSteps.push({
    label: "Delivery",
    dateRange: formatShortDate(job.deliveryDate),
    detail: "1 day before install",
    isOverdue: false,
    isAtRisk: false,
    isCompleted: job.status === "COMPLETED",
  });

  // Final QC (1 day before delivery)
  const qcDate = addBusinessDays(job.deliveryDate, -1);
  backwardSteps.push({
    label: "Final QC",
    dateRange: formatShortDate(qcDate),
    detail: "1 day before delivery",
    isOverdue: false,
    isAtRisk: false,
    isCompleted: job.status === "COMPLETED",
  });

  // Operations in reverse order (skipping Final QC if present, since we added it above)
  const opsReversed = [...job.operations].reverse();
  for (const op of opsReversed) {
    if (op.name === "Final QC") continue; // Already shown above
    const isOverdue = op.status === "NOT_STARTED" && startOfDay(op.latestStartDate) < today;
    const daysUntilLatest = daysBetween(today, startOfDay(op.latestStartDate));
    const isAtRisk = !isOverdue && op.status !== "COMPLETED" && daysUntilLatest >= 0 && daysUntilLatest <= 2;

    backwardSteps.push({
      label: op.name,
      dateRange:
        op.durationDays === 1
          ? formatShortDate(op.latestStartDate)
          : `${formatShortDate(op.latestStartDate)} - ${formatShortDate(op.latestEndDate)}`,
      detail: `${op.durationDays} day${op.durationDays > 1 ? "s" : ""}, ${op.workstation}`,
      isOverdue,
      isAtRisk,
      isCompleted: op.status === "COMPLETED",
    });
  }

  // Material Order By
  const matOverdue = startOfDay(job.materialOrderByDate) < today && job.status !== "COMPLETED";
  backwardSteps.push({
    label: "Material Order By",
    dateRange: formatShortDate(job.materialOrderByDate),
    detail: `${job.materialLeadTimeDays} business days lead time`,
    isOverdue: matOverdue,
    isAtRisk: false,
    isCompleted: job.status === "COMPLETED" || (!matOverdue && startOfDay(job.materialOrderByDate) <= today),
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <CardTitle>Backward Schedule: {job.jobNumber}</CardTitle>
              <Badge
                variant={
                  job.priority === "URGENT"
                    ? "destructive"
                    : job.priority === "HIGH"
                      ? "warning"
                      : "outline"
                }
              >
                {job.priority}
              </Badge>
              <Badge
                variant={
                  job.status === "IN_PROGRESS"
                    ? "warning"
                    : job.status === "COMPLETED"
                      ? "success"
                      : "secondary"
                }
              >
                {job.status.replace(/_/g, " ")}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {job.projectName} &mdash; {job.customerName} &mdash; {job.projectType}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg border px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            Close
          </button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Textual backward schedule */}
          <div className="space-y-0">
            {backwardSteps.map((step, idx) => (
              <div key={idx} className="flex items-start gap-3">
                {/* Vertical timeline connector */}
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      "h-4 w-4 rounded-full border-2 shrink-0 mt-1",
                      step.isCompleted
                        ? "bg-emerald-500 border-emerald-500"
                        : step.isOverdue
                          ? "bg-red-500 border-red-500"
                          : step.isAtRisk
                            ? "bg-amber-500 border-amber-500"
                            : "bg-background border-muted-foreground/30"
                    )}
                  />
                  {idx < backwardSteps.length - 1 && (
                    <div className="w-px h-8 bg-muted-foreground/20" />
                  )}
                </div>

                {/* Step content */}
                <div className="pb-4 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {idx > 0 && (
                      <span className="text-muted-foreground text-xs">&larr;</span>
                    )}
                    <span
                      className={cn(
                        "font-medium text-sm",
                        step.isOverdue && "text-red-600 dark:text-red-400",
                        step.isAtRisk && "text-amber-600 dark:text-amber-400",
                        step.isCompleted && "text-emerald-600 dark:text-emerald-400"
                      )}
                    >
                      {step.label}:
                    </span>
                    <span
                      className={cn(
                        "font-mono text-sm font-semibold",
                        step.isOverdue && "text-red-600 dark:text-red-400"
                      )}
                    >
                      {step.dateRange}
                    </span>
                    {step.isOverdue && (
                      <Badge variant="destructive" className="text-[9px] px-1.5 py-0">
                        OVERDUE
                      </Badge>
                    )}
                    {step.isAtRisk && (
                      <Badge variant="warning" className="text-[9px] px-1.5 py-0">
                        AT RISK
                      </Badge>
                    )}
                    {step.isCompleted && (
                      <Badge variant="success" className="text-[9px] px-1.5 py-0">
                        DONE
                      </Badge>
                    )}
                  </div>
                  {step.detail && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      ({step.detail})
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Visual timeline with backward flow arrows */}
          <div className="rounded-lg border bg-muted/20 p-4">
            <h4 className="text-sm font-semibold mb-4">Visual Backward Flow</h4>
            <div className="relative">
              {/* Horizontal timeline bar */}
              <div className="relative h-8 bg-muted rounded-full mb-4">
                {/* Material order by marker */}
                {(() => {
                  const totalDays = daysBetween(
                    startOfDay(job.materialOrderByDate),
                    startOfDay(job.installDate)
                  );
                  return (
                    <div
                      className="absolute top-0 bottom-0 flex items-center"
                      style={{ left: "0%" }}
                      title={`Material Order By: ${formatDate(job.materialOrderByDate)}`}
                    >
                      <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-b-[10px] border-l-transparent border-r-transparent border-b-orange-500 -mt-3" />
                    </div>
                  );
                })()}

                {/* Operation bars along the timeline */}
                {(() => {
                  const totalDays = Math.max(
                    1,
                    daysBetween(startOfDay(job.materialOrderByDate), startOfDay(job.installDate))
                  );
                  const barColorMap: Record<string, string> = {
                    COMPLETED: "bg-emerald-500",
                    IN_PROGRESS: "bg-blue-500",
                    NOT_STARTED: "bg-gray-400",
                  };

                  return job.operations.map((op) => {
                    const opStart = daysBetween(
                      startOfDay(job.materialOrderByDate),
                      startOfDay(op.latestStartDate)
                    );
                    const opEnd = daysBetween(
                      startOfDay(job.materialOrderByDate),
                      startOfDay(op.latestEndDate)
                    );
                    const left = (opStart / totalDays) * 100;
                    const width = Math.max(((opEnd - opStart + 1) / totalDays) * 100, 2);

                    const isOverdue =
                      op.status === "NOT_STARTED" &&
                      startOfDay(op.latestStartDate) < startOfDay(new Date());
                    const bgClass = isOverdue
                      ? "bg-red-500"
                      : barColorMap[op.status] ?? "bg-gray-400";

                    return (
                      <div
                        key={op.id}
                        className={cn(
                          "absolute top-1 h-6 rounded text-[8px] text-white flex items-center justify-center px-0.5 truncate",
                          bgClass
                        )}
                        style={{
                          left: `${Math.max(left, 0)}%`,
                          width: `${width}%`,
                          minWidth: "8px",
                        }}
                        title={`${op.name}: ${formatShortDate(op.latestStartDate)} - ${formatShortDate(op.latestEndDate)}`}
                      >
                        <span className="truncate">{op.name}</span>
                      </div>
                    );
                  });
                })()}

                {/* Install date diamond */}
                <div
                  className="absolute top-0 bottom-0 flex items-center"
                  style={{ right: "0%" }}
                  title={`Install: ${formatDate(job.installDate)}`}
                >
                  <span className="text-violet-500 text-sm">&#9670;</span>
                </div>
              </div>

              {/* Backward flow arrows and labels */}
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span className="font-mono">
                  {formatShortDate(job.materialOrderByDate)}
                </span>
                <div className="flex-1 flex items-center justify-center gap-1">
                  <span>&larr;</span>
                  <span>&larr;</span>
                  <span className="text-xs font-medium text-muted-foreground">
                    Backward flow from install date
                  </span>
                  <span>&larr;</span>
                  <span>&larr;</span>
                </div>
                <span className="font-mono">
                  {formatShortDate(job.installDate)}
                </span>
              </div>

              {/* Operations summary table */}
              <div className="mt-4 space-y-1.5">
                {job.operations.map((op) => {
                  const isOverdue =
                    op.status === "NOT_STARTED" &&
                    startOfDay(op.latestStartDate) < startOfDay(new Date());
                  const daysUntil = daysBetween(startOfDay(new Date()), startOfDay(op.latestStartDate));
                  const isAtRisk = !isOverdue && op.status !== "COMPLETED" && daysUntil >= 0 && daysUntil <= 2;

                  return (
                    <div
                      key={op.id}
                      className={cn(
                        "flex items-center justify-between rounded px-2 py-1 text-xs",
                        isOverdue
                          ? "bg-red-100 dark:bg-red-950/30"
                          : isAtRisk
                            ? "bg-amber-100 dark:bg-amber-950/30"
                            : op.status === "COMPLETED"
                              ? "bg-emerald-100 dark:bg-emerald-950/30"
                              : "bg-muted/50"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{op.name}</span>
                        <span className="text-muted-foreground">({op.workstation})</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-muted-foreground">
                          {formatShortDate(op.latestStartDate)}
                          {op.durationDays > 1 && ` - ${formatShortDate(op.latestEndDate)}`}
                        </span>
                        <span className="text-muted-foreground">{op.estimatedHours}h</span>
                        <Badge
                          variant={
                            op.status === "COMPLETED"
                              ? "success"
                              : op.status === "IN_PROGRESS"
                                ? "warning"
                                : isOverdue
                                  ? "destructive"
                                  : "secondary"
                          }
                          className="text-[9px]"
                        >
                          {isOverdue
                            ? "OVERDUE"
                            : op.status.replace(/_/g, " ")}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

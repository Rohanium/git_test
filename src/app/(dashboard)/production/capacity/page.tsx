"use client";

import { useState, useMemo } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

// --------------------------------------------------------------------------
// tRPC integration (commented out -- wire up when backend routes are ready)
// --------------------------------------------------------------------------
// import { trpc } from "@/lib/trpc";
//
// const { data: capacityData } = trpc.production.capacityOverview.useQuery();
// const { data: heatmapData }  = trpc.production.capacityHeatmap.useQuery({ weeks: 12 });
// const { data: milestones }   = trpc.production.upcomingMilestones.useQuery();
// const checkAvailability      = trpc.production.checkAvailability.useMutation();
//
// To call the estimator:
//   checkAvailability.mutate({ projectType, size, hours, materialLeadDays, preferredDate });

// --------------------------------------------------------------------------
// Types
// --------------------------------------------------------------------------

interface HeatmapCell {
  booked: number;
  available: number;
}

interface WorkstationWeekly {
  workstation: string;
  weeks: HeatmapCell[];
}

interface DaySchedule {
  date: string;
  dayLabel: string;
  available: number;
  booked: number;
  jobs: { jobNumber: string; operation: string; hours: number }[];
}

interface Milestone {
  type: "material" | "production" | "delivery" | "install";
  jobNumber: string;
  description: string;
  date: string;
}

interface EstimatorResult {
  earliestInstall: string;
  materialOrderBy: string;
  productionStart: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  preferredAchievable: boolean;
  warnings: string[];
}

// --------------------------------------------------------------------------
// Mock data
// --------------------------------------------------------------------------

const WEEK_LABELS = [
  "Mar 3", "Mar 10", "Mar 17", "Mar 24",
  "Mar 31", "Apr 7", "Apr 14", "Apr 21",
  "Apr 28", "May 5", "May 12", "May 19",
];

const WORKSTATIONS: WorkstationWeekly[] = [
  {
    workstation: "Panel Saw",
    weeks: [
      { booked: 30, available: 40 }, { booked: 36, available: 40 }, { booked: 22, available: 40 },
      { booked: 38, available: 40 }, { booked: 28, available: 40 }, { booked: 18, available: 40 },
      { booked: 35, available: 40 }, { booked: 32, available: 40 }, { booked: 24, available: 40 },
      { booked: 37, available: 40 }, { booked: 20, available: 40 }, { booked: 15, available: 40 },
    ],
  },
  {
    workstation: "CNC Router",
    weeks: [
      { booked: 34, available: 40 }, { booked: 38, available: 40 }, { booked: 30, available: 40 },
      { booked: 40, available: 40 }, { booked: 26, available: 40 }, { booked: 20, available: 40 },
      { booked: 32, available: 40 }, { booked: 36, available: 40 }, { booked: 28, available: 40 },
      { booked: 34, available: 40 }, { booked: 22, available: 40 }, { booked: 18, available: 40 },
    ],
  },
  {
    workstation: "Edge Bander",
    weeks: [
      { booked: 20, available: 40 }, { booked: 28, available: 40 }, { booked: 32, available: 40 },
      { booked: 36, available: 40 }, { booked: 24, available: 40 }, { booked: 16, available: 40 },
      { booked: 30, available: 40 }, { booked: 26, available: 40 }, { booked: 22, available: 40 },
      { booked: 34, available: 40 }, { booked: 18, available: 40 }, { booked: 14, available: 40 },
    ],
  },
  {
    workstation: "Assembly Bench 1",
    weeks: [
      { booked: 36, available: 40 }, { booked: 34, available: 40 }, { booked: 28, available: 40 },
      { booked: 38, available: 40 }, { booked: 30, available: 40 }, { booked: 24, available: 40 },
      { booked: 32, available: 40 }, { booked: 36, available: 40 }, { booked: 26, available: 40 },
      { booked: 38, available: 40 }, { booked: 24, available: 40 }, { booked: 20, available: 40 },
    ],
  },
  {
    workstation: "Assembly Bench 2",
    weeks: [
      { booked: 24, available: 40 }, { booked: 30, available: 40 }, { booked: 18, available: 40 },
      { booked: 34, available: 40 }, { booked: 20, available: 40 }, { booked: 12, available: 40 },
      { booked: 28, available: 40 }, { booked: 22, available: 40 }, { booked: 16, available: 40 },
      { booked: 30, available: 40 }, { booked: 14, available: 40 }, { booked: 10, available: 40 },
    ],
  },
  {
    workstation: "Spray Booth",
    weeks: [
      { booked: 32, available: 40 }, { booked: 38, available: 40 }, { booked: 36, available: 40 },
      { booked: 40, available: 40 }, { booked: 34, available: 40 }, { booked: 26, available: 40 },
      { booked: 38, available: 40 }, { booked: 36, available: 40 }, { booked: 30, available: 40 },
      { booked: 38, available: 40 }, { booked: 28, available: 40 }, { booked: 22, available: 40 },
    ],
  },
  {
    workstation: "Finishing Bay",
    weeks: [
      { booked: 28, available: 40 }, { booked: 32, available: 40 }, { booked: 26, available: 40 },
      { booked: 36, available: 40 }, { booked: 22, available: 40 }, { booked: 18, available: 40 },
      { booked: 30, available: 40 }, { booked: 28, available: 40 }, { booked: 20, available: 40 },
      { booked: 32, available: 40 }, { booked: 16, available: 40 }, { booked: 12, available: 40 },
    ],
  },
];

const WORKSTATION_DETAIL: Record<string, DaySchedule[]> = {
  "Panel Saw": [
    { date: "2025-03-03", dayLabel: "Mon 3 Mar", available: 8, booked: 6, jobs: [{ jobNumber: "JOB-2025-0041", operation: "Panel Cutting", hours: 3.5 }, { jobNumber: "JOB-2025-0043", operation: "Sheet Breakdown", hours: 2.5 }] },
    { date: "2025-03-04", dayLabel: "Tue 4 Mar", available: 8, booked: 7, jobs: [{ jobNumber: "JOB-2025-0044", operation: "Panel Cutting", hours: 4 }, { jobNumber: "JOB-2025-0045", operation: "Ripping", hours: 3 }] },
    { date: "2025-03-05", dayLabel: "Wed 5 Mar", available: 8, booked: 5, jobs: [{ jobNumber: "JOB-2025-0041", operation: "Re-cut", hours: 1.5 }, { jobNumber: "JOB-2025-0046", operation: "Panel Cutting", hours: 3.5 }] },
    { date: "2025-03-06", dayLabel: "Thu 6 Mar", available: 8, booked: 4, jobs: [{ jobNumber: "JOB-2025-0047", operation: "Sheet Breakdown", hours: 4 }] },
    { date: "2025-03-07", dayLabel: "Fri 7 Mar", available: 8, booked: 8, jobs: [{ jobNumber: "JOB-2025-0043", operation: "Panel Cutting", hours: 4.5 }, { jobNumber: "JOB-2025-0048", operation: "Panel Cutting", hours: 3.5 }] },
    { date: "2025-03-10", dayLabel: "Mon 10 Mar", available: 8, booked: 7, jobs: [{ jobNumber: "JOB-2025-0049", operation: "Panel Cutting", hours: 4 }, { jobNumber: "JOB-2025-0050", operation: "Ripping", hours: 3 }] },
    { date: "2025-03-11", dayLabel: "Tue 11 Mar", available: 8, booked: 6, jobs: [{ jobNumber: "JOB-2025-0051", operation: "Sheet Breakdown", hours: 6 }] },
    { date: "2025-03-12", dayLabel: "Wed 12 Mar", available: 8, booked: 8, jobs: [{ jobNumber: "JOB-2025-0052", operation: "Panel Cutting", hours: 5 }, { jobNumber: "JOB-2025-0053", operation: "Panel Cutting", hours: 3 }] },
    { date: "2025-03-13", dayLabel: "Thu 13 Mar", available: 8, booked: 7, jobs: [{ jobNumber: "JOB-2025-0054", operation: "Sheet Breakdown", hours: 3.5 }, { jobNumber: "JOB-2025-0055", operation: "Panel Cutting", hours: 3.5 }] },
    { date: "2025-03-14", dayLabel: "Fri 14 Mar", available: 8, booked: 8, jobs: [{ jobNumber: "JOB-2025-0056", operation: "Panel Cutting", hours: 8 }] },
    { date: "2025-03-17", dayLabel: "Mon 17 Mar", available: 8, booked: 4, jobs: [{ jobNumber: "JOB-2025-0057", operation: "Panel Cutting", hours: 4 }] },
    { date: "2025-03-18", dayLabel: "Tue 18 Mar", available: 8, booked: 5, jobs: [{ jobNumber: "JOB-2025-0058", operation: "Sheet Breakdown", hours: 5 }] },
    { date: "2025-03-19", dayLabel: "Wed 19 Mar", available: 8, booked: 3, jobs: [{ jobNumber: "JOB-2025-0059", operation: "Ripping", hours: 3 }] },
    { date: "2025-03-20", dayLabel: "Thu 20 Mar", available: 8, booked: 6, jobs: [{ jobNumber: "JOB-2025-0060", operation: "Panel Cutting", hours: 6 }] },
    { date: "2025-03-21", dayLabel: "Fri 21 Mar", available: 8, booked: 4, jobs: [{ jobNumber: "JOB-2025-0061", operation: "Panel Cutting", hours: 4 }] },
    { date: "2025-03-24", dayLabel: "Mon 24 Mar", available: 8, booked: 7, jobs: [{ jobNumber: "JOB-2025-0062", operation: "Sheet Breakdown", hours: 4 }, { jobNumber: "JOB-2025-0063", operation: "Panel Cutting", hours: 3 }] },
    { date: "2025-03-25", dayLabel: "Tue 25 Mar", available: 8, booked: 8, jobs: [{ jobNumber: "JOB-2025-0064", operation: "Panel Cutting", hours: 8 }] },
    { date: "2025-03-26", dayLabel: "Wed 26 Mar", available: 8, booked: 8, jobs: [{ jobNumber: "JOB-2025-0065", operation: "Panel Cutting", hours: 5 }, { jobNumber: "JOB-2025-0066", operation: "Sheet Breakdown", hours: 3 }] },
    { date: "2025-03-27", dayLabel: "Thu 27 Mar", available: 8, booked: 7, jobs: [{ jobNumber: "JOB-2025-0067", operation: "Panel Cutting", hours: 7 }] },
    { date: "2025-03-28", dayLabel: "Fri 28 Mar", available: 8, booked: 8, jobs: [{ jobNumber: "JOB-2025-0068", operation: "Panel Cutting", hours: 4 }, { jobNumber: "JOB-2025-0069", operation: "Ripping", hours: 4 }] },
  ],
  "CNC Router": [
    { date: "2025-03-03", dayLabel: "Mon 3 Mar", available: 8, booked: 7, jobs: [{ jobNumber: "JOB-2025-0041", operation: "CNC Machining", hours: 4 }, { jobNumber: "JOB-2025-0042", operation: "CNC Drilling", hours: 3 }] },
    { date: "2025-03-04", dayLabel: "Tue 4 Mar", available: 8, booked: 8, jobs: [{ jobNumber: "JOB-2025-0043", operation: "CNC Machining", hours: 8 }] },
    { date: "2025-03-05", dayLabel: "Wed 5 Mar", available: 8, booked: 6, jobs: [{ jobNumber: "JOB-2025-0044", operation: "CNC Profiling", hours: 6 }] },
    { date: "2025-03-06", dayLabel: "Thu 6 Mar", available: 8, booked: 5, jobs: [{ jobNumber: "JOB-2025-0045", operation: "CNC Machining", hours: 5 }] },
    { date: "2025-03-07", dayLabel: "Fri 7 Mar", available: 8, booked: 8, jobs: [{ jobNumber: "JOB-2025-0046", operation: "CNC Machining", hours: 4.5 }, { jobNumber: "JOB-2025-0047", operation: "CNC Drilling", hours: 3.5 }] },
    { date: "2025-03-10", dayLabel: "Mon 10 Mar", available: 8, booked: 7, jobs: [{ jobNumber: "JOB-2025-0048", operation: "CNC Machining", hours: 7 }] },
    { date: "2025-03-11", dayLabel: "Tue 11 Mar", available: 8, booked: 8, jobs: [{ jobNumber: "JOB-2025-0049", operation: "CNC Profiling", hours: 5 }, { jobNumber: "JOB-2025-0050", operation: "CNC Drilling", hours: 3 }] },
    { date: "2025-03-12", dayLabel: "Wed 12 Mar", available: 8, booked: 6, jobs: [{ jobNumber: "JOB-2025-0051", operation: "CNC Machining", hours: 6 }] },
    { date: "2025-03-13", dayLabel: "Thu 13 Mar", available: 8, booked: 5, jobs: [{ jobNumber: "JOB-2025-0052", operation: "CNC Machining", hours: 5 }] },
    { date: "2025-03-14", dayLabel: "Fri 14 Mar", available: 8, booked: 7, jobs: [{ jobNumber: "JOB-2025-0053", operation: "CNC Drilling", hours: 3 }, { jobNumber: "JOB-2025-0054", operation: "CNC Profiling", hours: 4 }] },
    { date: "2025-03-17", dayLabel: "Mon 17 Mar", available: 8, booked: 6, jobs: [{ jobNumber: "JOB-2025-0055", operation: "CNC Machining", hours: 6 }] },
    { date: "2025-03-18", dayLabel: "Tue 18 Mar", available: 8, booked: 4, jobs: [{ jobNumber: "JOB-2025-0056", operation: "CNC Drilling", hours: 4 }] },
    { date: "2025-03-19", dayLabel: "Wed 19 Mar", available: 8, booked: 7, jobs: [{ jobNumber: "JOB-2025-0057", operation: "CNC Machining", hours: 7 }] },
    { date: "2025-03-20", dayLabel: "Thu 20 Mar", available: 8, booked: 5, jobs: [{ jobNumber: "JOB-2025-0058", operation: "CNC Profiling", hours: 5 }] },
    { date: "2025-03-21", dayLabel: "Fri 21 Mar", available: 8, booked: 8, jobs: [{ jobNumber: "JOB-2025-0059", operation: "CNC Machining", hours: 4.5 }, { jobNumber: "JOB-2025-0060", operation: "CNC Drilling", hours: 3.5 }] },
    { date: "2025-03-24", dayLabel: "Mon 24 Mar", available: 8, booked: 8, jobs: [{ jobNumber: "JOB-2025-0061", operation: "CNC Machining", hours: 8 }] },
    { date: "2025-03-25", dayLabel: "Tue 25 Mar", available: 8, booked: 7, jobs: [{ jobNumber: "JOB-2025-0062", operation: "CNC Profiling", hours: 4 }, { jobNumber: "JOB-2025-0063", operation: "CNC Drilling", hours: 3 }] },
    { date: "2025-03-26", dayLabel: "Wed 26 Mar", available: 8, booked: 8, jobs: [{ jobNumber: "JOB-2025-0064", operation: "CNC Machining", hours: 8 }] },
    { date: "2025-03-27", dayLabel: "Thu 27 Mar", available: 8, booked: 7, jobs: [{ jobNumber: "JOB-2025-0065", operation: "CNC Machining", hours: 7 }] },
    { date: "2025-03-28", dayLabel: "Fri 28 Mar", available: 8, booked: 6, jobs: [{ jobNumber: "JOB-2025-0066", operation: "CNC Drilling", hours: 6 }] },
  ],
};

// Generate simple detail data for remaining workstations so the dropdown works
(function seedRemainingDetails() {
  const names = ["Edge Bander", "Assembly Bench 1", "Assembly Bench 2", "Spray Booth", "Finishing Bay"];
  const ops: Record<string, string[]> = {
    "Edge Bander": ["Edge Banding", "Re-edge"],
    "Assembly Bench 1": ["Cabinet Assembly", "Frame Assembly"],
    "Assembly Bench 2": ["Cabinet Assembly", "Drawer Build"],
    "Spray Booth": ["Primer Coat", "Top Coat", "Lacquer"],
    "Finishing Bay": ["Final Sand", "Touch Up", "Hardware Fit"],
  };
  names.forEach((name) => {
    const days: DaySchedule[] = [];
    let d = new Date(2025, 2, 3); // Mar 3 2025
    for (let i = 0; i < 20; i++) {
      // skip weekends
      while (d.getDay() === 0 || d.getDay() === 6) {
        d = new Date(d.getTime() + 86400000);
      }
      const booked = Math.floor(Math.random() * 5) + 3; // 3-7
      const opList = ops[name] ?? ["Operation"];
      const jobCount = booked > 5 ? 2 : 1;
      const jobs: DaySchedule["jobs"] = [];
      let remaining = booked;
      for (let j = 0; j < jobCount; j++) {
        const hrs = j === jobCount - 1 ? remaining : Math.ceil(remaining / 2);
        remaining -= hrs;
        jobs.push({
          jobNumber: `JOB-2025-${String(41 + i * 2 + j).padStart(4, "0")}`,
          operation: opList[j % opList.length],
          hours: hrs,
        });
      }
      days.push({
        date: d.toISOString().slice(0, 10),
        dayLabel: d.toLocaleDateString("en-NZ", { weekday: "short", day: "numeric", month: "short" }),
        available: 8,
        booked,
        jobs,
      });
      d = new Date(d.getTime() + 86400000);
    }
    WORKSTATION_DETAIL[name] = days;
  });
})();

const MILESTONES: Milestone[] = [
  { type: "material", jobNumber: "JOB-2025-0041", description: "Plywood 18mm (12 sheets) - order from PlyWorld", date: "2025-03-04" },
  { type: "material", jobNumber: "JOB-2025-0043", description: "Blum hinges (24 pcs) - order from Hafele NZ", date: "2025-03-05" },
  { type: "material", jobNumber: "JOB-2025-0046", description: "Melamine board White (8 sheets)", date: "2025-03-06" },
  { type: "production", jobNumber: "JOB-2025-0044", description: "Kitchen cabinets - Williams residence", date: "2025-03-03" },
  { type: "production", jobNumber: "JOB-2025-0045", description: "Bathroom vanity - Henderson project", date: "2025-03-05" },
  { type: "production", jobNumber: "JOB-2025-0048", description: "Walk-in wardrobe - Clarke build", date: "2025-03-07" },
  { type: "delivery", jobNumber: "JOB-2025-0038", description: "Kitchen delivery - Thompson residence", date: "2025-03-04" },
  { type: "delivery", jobNumber: "JOB-2025-0039", description: "Laundry cabinets - Patel project", date: "2025-03-06" },
  { type: "install", jobNumber: "JOB-2025-0036", description: "Kitchen install - Morgan residence (Day 1 of 2)", date: "2025-03-03" },
  { type: "install", jobNumber: "JOB-2025-0036", description: "Kitchen install - Morgan residence (Day 2 of 2)", date: "2025-03-04" },
  { type: "install", jobNumber: "JOB-2025-0037", description: "Vanity install - Brooks apartment", date: "2025-03-07" },
];

// --------------------------------------------------------------------------
// Hour pre-fill templates for Delivery Date Estimator
// --------------------------------------------------------------------------

type ProjectType = "kitchen" | "vanity" | "wardrobe" | "laundry" | "commercial" | "custom";
type ProjectSize = "small" | "medium" | "large";

const HOUR_TEMPLATES: Record<ProjectType, Record<ProjectSize, { cutting: number; cnc: number; edgeBanding: number; assembly: number; sprayFinishing: number }>> = {
  kitchen:    { small: { cutting: 4,  cnc: 3,  edgeBanding: 2,  assembly: 8,  sprayFinishing: 6  }, medium: { cutting: 8,  cnc: 6,  edgeBanding: 4,  assembly: 16, sprayFinishing: 12 }, large: { cutting: 14, cnc: 10, edgeBanding: 6,  assembly: 28, sprayFinishing: 20 } },
  vanity:     { small: { cutting: 2,  cnc: 1,  edgeBanding: 1,  assembly: 3,  sprayFinishing: 2  }, medium: { cutting: 3,  cnc: 2,  edgeBanding: 2,  assembly: 5,  sprayFinishing: 4  }, large: { cutting: 5,  cnc: 3,  edgeBanding: 3,  assembly: 8,  sprayFinishing: 6  } },
  wardrobe:   { small: { cutting: 3,  cnc: 2,  edgeBanding: 2,  assembly: 6,  sprayFinishing: 4  }, medium: { cutting: 6,  cnc: 4,  edgeBanding: 3,  assembly: 12, sprayFinishing: 8  }, large: { cutting: 10, cnc: 7,  edgeBanding: 5,  assembly: 20, sprayFinishing: 14 } },
  laundry:    { small: { cutting: 2,  cnc: 1,  edgeBanding: 1,  assembly: 3,  sprayFinishing: 2  }, medium: { cutting: 4,  cnc: 2,  edgeBanding: 2,  assembly: 6,  sprayFinishing: 4  }, large: { cutting: 6,  cnc: 4,  edgeBanding: 3,  assembly: 10, sprayFinishing: 6  } },
  commercial: { small: { cutting: 6,  cnc: 4,  edgeBanding: 3,  assembly: 10, sprayFinishing: 8  }, medium: { cutting: 12, cnc: 8,  edgeBanding: 6,  assembly: 20, sprayFinishing: 14 }, large: { cutting: 20, cnc: 14, edgeBanding: 10, assembly: 36, sprayFinishing: 24 } },
  custom:     { small: { cutting: 4,  cnc: 3,  edgeBanding: 2,  assembly: 6,  sprayFinishing: 4  }, medium: { cutting: 8,  cnc: 6,  edgeBanding: 4,  assembly: 12, sprayFinishing: 8  }, large: { cutting: 12, cnc: 8,  edgeBanding: 6,  assembly: 20, sprayFinishing: 14 } },
};

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

function utilPct(booked: number, available: number): number {
  if (available === 0) return 100;
  return Math.round((booked / available) * 100);
}

function heatColor(pct: number): string {
  if (pct >= 90) return "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400";
  if (pct >= 80) return "bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400";
  if (pct >= 60) return "bg-yellow-50 text-yellow-600 dark:bg-yellow-950/40 dark:text-yellow-400";
  return "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400";
}

function dayUtilColor(pct: number): string {
  if (pct >= 90) return "bg-red-50/60 border-red-200/60 dark:bg-red-950/20 dark:border-red-800/40";
  if (pct >= 80) return "bg-orange-50/60 border-orange-200/60 dark:bg-orange-950/20 dark:border-orange-800/40";
  if (pct >= 60) return "bg-yellow-50/60 border-yellow-200/60 dark:bg-yellow-950/20 dark:border-yellow-800/40";
  return "bg-emerald-50/60 border-emerald-200/60 dark:bg-emerald-950/20 dark:border-emerald-800/40";
}

function confidenceBadge(level: "HIGH" | "MEDIUM" | "LOW") {
  const map = { HIGH: "success", MEDIUM: "warning", LOW: "destructive" } as const;
  return <Badge variant={map[level]}>{level}</Badge>;
}

const milestoneIcon: Record<Milestone["type"], string> = {
  material: "Package",
  production: "Factory",
  delivery: "Truck",
  install: "Wrench",
};

const milestoneColor: Record<Milestone["type"], string> = {
  material: "text-blue-600 dark:text-blue-400",
  production: "text-amber-600 dark:text-amber-400",
  delivery: "text-purple-600 dark:text-purple-400",
  install: "text-emerald-600 dark:text-emerald-400",
};

// --------------------------------------------------------------------------
// Page Component
// --------------------------------------------------------------------------

export default function CapacityPlanningPage() {
  // ----- Delivery Date Estimator state -----
  const [projectType, setProjectType] = useState<ProjectType>("kitchen");
  const [projectSize, setProjectSize] = useState<ProjectSize>("medium");
  const [materialLeadDays, setMaterialLeadDays] = useState(10);
  const [preferredDate, setPreferredDate] = useState("");
  const [hourOverrides, setHourOverrides] = useState<Record<string, number> | null>(null);
  const [estimatorResult, setEstimatorResult] = useState<EstimatorResult | null>(null);

  // When type or size changes, reset hour overrides
  const templateHours = HOUR_TEMPLATES[projectType][projectSize];
  const currentHours = hourOverrides ?? templateHours;

  function handleTypeChange(t: ProjectType) {
    setProjectType(t);
    setHourOverrides(null);
    setEstimatorResult(null);
  }

  function handleSizeChange(s: ProjectSize) {
    setProjectSize(s);
    setHourOverrides(null);
    setEstimatorResult(null);
  }

  function setHour(key: string, val: number) {
    setHourOverrides({ ...currentHours, [key]: val });
  }

  // ----- Workstation Detail state -----
  const [selectedWorkstation, setSelectedWorkstation] = useState("Panel Saw");
  const detailDays = WORKSTATION_DETAIL[selectedWorkstation] ?? [];

  // ----- Estimator logic (mock) -----
  function checkAvailability() {
    // tRPC call in production:
    // checkAvailability.mutate({ projectType, projectSize, hours: currentHours, materialLeadDays, preferredDate });

    const totalHours = Object.values(currentHours).reduce((a, b) => a + b, 0);
    const productionWeeks = Math.ceil(totalHours / 32); // assume ~32 effective hrs/week throughput
    const materialDays = materialLeadDays;

    // earliest start = today + material lead time (skip weekends naively)
    const today = new Date(2025, 2, 3); // mock "today" = Mar 3 2025
    const materialOrderBy = new Date(today);
    const prodStart = new Date(today.getTime() + materialDays * 86400000);
    // skip to Monday if weekend
    while (prodStart.getDay() === 0 || prodStart.getDay() === 6) {
      prodStart.setDate(prodStart.getDate() + 1);
    }
    const prodEnd = new Date(prodStart.getTime() + productionWeeks * 7 * 86400000);
    // add 3 business days for QC + delivery
    const installDate = new Date(prodEnd.getTime() + 5 * 86400000);
    while (installDate.getDay() === 0 || installDate.getDay() === 6) {
      installDate.setDate(installDate.getDate() + 1);
    }

    const fmt = (d: Date) => d.toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric" });

    const preferredAchievable = preferredDate ? new Date(preferredDate) >= installDate : true;

    let confidence: "HIGH" | "MEDIUM" | "LOW" = "HIGH";
    if (totalHours > 60) confidence = "MEDIUM";
    if (totalHours > 100 || !preferredAchievable) confidence = "LOW";

    const warnings: string[] = [];
    if (!preferredAchievable) {
      warnings.push(
        `Preferred date of ${new Date(preferredDate).toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric" })} is not achievable. Earliest install is ${fmt(installDate)}.`
      );
    }
    if (totalHours > 80) {
      warnings.push("Large job -- consider splitting across multiple production weeks for better flow.");
    }

    setEstimatorResult({
      earliestInstall: fmt(installDate),
      materialOrderBy: fmt(materialOrderBy),
      productionStart: fmt(prodStart),
      confidence,
      preferredAchievable,
      warnings,
    });
  }

  // ----- Milestone grouping -----
  const groupedMilestones = useMemo(() => {
    const groups: Record<string, Milestone[]> = {
      material: [],
      production: [],
      delivery: [],
      install: [],
    };
    MILESTONES.forEach((m) => groups[m.type].push(m));
    return groups;
  }, []);

  return (
    <div className="space-y-6">
      {/* ================================================================
          HEADER
          ================================================================ */}
      <PageHeader
        title="Factory Capacity"
        description="View available capacity, schedule jobs, and estimate delivery dates."
        helpText="Plan your workshop capacity — see workstation utilisation, identify bottlenecks, and forecast production load."
      />

      {/* ================================================================
          SECTION 1: Quick Stats
          ================================================================ */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          title="Current Week Utilization"
          value="78%"
          description="Across all workstations"
          className="border-l-4 border-l-amber-500"
        />
        <StatCard
          title="Jobs In Production"
          value={12}
          description="Active on the floor"
        />
        <StatCard
          title="Available Hours This Week"
          value="42 hrs"
          description="Remaining unbooked capacity"
        />
        <StatCard
          title="Next Available Start"
          value="Mar 15, 2025"
          description="Earliest slot for a new job"
        />
      </div>

      {/* ================================================================
          SECTION 2: Capacity Heatmap (12 Weeks)
          ================================================================ */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Capacity Heatmap -- Next 12 Weeks</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Hours booked vs available per workstation per week. Click any cell to drill into daily detail.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-emerald-200" /> 0-60%</span>
              <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-yellow-200" /> 60-80%</span>
              <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-orange-200" /> 80-90%</span>
              <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-red-200" /> 90-100%</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 bg-card px-3 py-2 text-left font-medium text-muted-foreground">
                    Workstation
                  </th>
                  {WEEK_LABELS.map((wk) => (
                    <th key={wk} className="px-2 py-2 text-center font-medium text-muted-foreground whitespace-nowrap">
                      {wk}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {WORKSTATIONS.map((ws) => (
                  <tr key={ws.workstation} className="border-t">
                    <td className="sticky left-0 z-10 bg-card px-3 py-2 font-medium whitespace-nowrap">
                      {ws.workstation}
                    </td>
                    {ws.weeks.map((cell, idx) => {
                      const pct = utilPct(cell.booked, cell.available);
                      return (
                        <td key={idx} className="px-1 py-1">
                          <button
                            type="button"
                            onClick={() => setSelectedWorkstation(ws.workstation)}
                            className={cn(
                              "flex w-full flex-col items-center justify-center rounded-lg px-2 py-1.5 text-[11px] font-semibold transition-all duration-150 hover:ring-2 hover:ring-ring/30 hover:scale-[1.02]",
                              heatColor(pct)
                            )}
                            title={`${ws.workstation} -- Week of ${WEEK_LABELS[idx]}: ${pct}% utilised`}
                          >
                            <span>{cell.booked}/{cell.available} hrs</span>
                            <span className="text-[10px] opacity-70">{pct}%</span>
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ================================================================
          SECTION 3: Delivery Date Estimator
          ================================================================ */}
      <Card>
        <CardHeader>
          <CardTitle>Delivery Date Estimator</CardTitle>
          <p className="text-sm text-muted-foreground">
            For the sales team -- enter project details to get a realistic delivery/install date based on current capacity.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 lg:grid-cols-2">
            {/* --- Form --- */}
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Project Type</label>
                  <Select
                    value={projectType}
                    onChange={(e) => handleTypeChange(e.target.value as ProjectType)}
                    options={[
                      { value: "kitchen", label: "Kitchen" },
                      { value: "vanity", label: "Vanity" },
                      { value: "wardrobe", label: "Wardrobe" },
                      { value: "laundry", label: "Laundry" },
                      { value: "commercial", label: "Commercial Fitout" },
                      { value: "custom", label: "Custom / Other" },
                    ]}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Estimated Size</label>
                  <Select
                    value={projectSize}
                    onChange={(e) => handleSizeChange(e.target.value as ProjectSize)}
                    options={[
                      { value: "small", label: "Small" },
                      { value: "medium", label: "Medium" },
                      { value: "large", label: "Large" },
                    ]}
                  />
                </div>
              </div>

              {/* Estimated hours by operation */}
              <div>
                <p className="mb-2 text-sm font-medium">Estimated Hours by Operation</p>
                <p className="mb-3 text-xs text-muted-foreground">
                  Pre-filled from project type and size. Adjust as needed.
                </p>
                <div className="grid gap-3 sm:grid-cols-5">
                  {([
                    ["cutting", "Cutting"],
                    ["cnc", "CNC"],
                    ["edgeBanding", "Edge Banding"],
                    ["assembly", "Assembly"],
                    ["sprayFinishing", "Spray / Finishing"],
                  ] as const).map(([key, label]) => (
                    <Input
                      key={key}
                      label={label}
                      type="number"
                      min={0}
                      step={0.5}
                      value={currentHours[key]}
                      onChange={(e) => setHour(key, parseFloat(e.target.value) || 0)}
                    />
                  ))}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Material Lead Time (days)"
                  type="number"
                  min={0}
                  value={materialLeadDays}
                  onChange={(e) => setMaterialLeadDays(parseInt(e.target.value) || 0)}
                />
                <Input
                  label="Preferred Install Date"
                  type="date"
                  value={preferredDate}
                  onChange={(e) => setPreferredDate(e.target.value)}
                />
              </div>

              <Button onClick={checkAvailability}>Check Availability</Button>
            </div>

            {/* --- Results panel --- */}
            <div>
              {estimatorResult ? (
                <div className="rounded-lg border bg-muted/30 p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">Availability Result</h4>
                    {confidenceBadge(estimatorResult.confidence)}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-md border bg-card p-3">
                      <p className="text-xs text-muted-foreground">Material Order By</p>
                      <p className="text-lg font-bold">{estimatorResult.materialOrderBy}</p>
                    </div>
                    <div className="rounded-md border bg-card p-3">
                      <p className="text-xs text-muted-foreground">Production Start</p>
                      <p className="text-lg font-bold">{estimatorResult.productionStart}</p>
                    </div>
                    <div className="rounded-md border bg-card p-3 sm:col-span-2">
                      <p className="text-xs text-muted-foreground">Earliest Possible Install Date</p>
                      <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                        {estimatorResult.earliestInstall}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">Confidence:</span>
                    {confidenceBadge(estimatorResult.confidence)}
                    <span className="text-muted-foreground">
                      {estimatorResult.confidence === "HIGH" && "-- High certainty this date is achievable"}
                      {estimatorResult.confidence === "MEDIUM" && "-- Achievable with careful scheduling"}
                      {estimatorResult.confidence === "LOW" && "-- At risk, consider adjusting scope or timeline"}
                    </span>
                  </div>

                  {estimatorResult.warnings.length > 0 && (
                    <div className="rounded-md border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950/30">
                      <p className="mb-1 text-sm font-medium text-red-800 dark:text-red-300">Warnings</p>
                      <ul className="list-inside list-disc space-y-1 text-sm text-red-700 dark:text-red-400">
                        {estimatorResult.warnings.map((w, i) => (
                          <li key={i}>{w}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex h-full items-center justify-center rounded-lg border border-dashed bg-muted/20 p-10">
                  <div className="text-center">
                    <p className="text-lg font-semibold text-muted-foreground">No estimate yet</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Fill in project details and click &quot;Check Availability&quot; to see delivery date estimates.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ================================================================
          SECTION 4: Workstation Detail View (Day-by-Day)
          ================================================================ */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Workstation Detail View</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Day-by-day breakdown for the next 4 weeks.
              </p>
            </div>
            <div className="w-56">
              <Select
                value={selectedWorkstation}
                onChange={(e) => setSelectedWorkstation(e.target.value)}
                options={WORKSTATIONS.map((ws) => ({
                  value: ws.workstation,
                  label: ws.workstation,
                }))}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {detailDays.map((day) => {
              const pct = utilPct(day.booked, day.available);
              return (
                <div
                  key={day.date}
                  className={cn(
                    "rounded-xl border p-3 text-[13px]",
                    dayUtilColor(pct)
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{day.dayLabel}</span>
                    <Badge
                      variant={
                        pct >= 90 ? "destructive" :
                        pct >= 80 ? "warning" :
                        pct >= 60 ? "warning" : "success"
                      }
                      className="text-[10px]"
                    >
                      {pct}%
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {day.booked}/{day.available} hrs booked
                  </p>
                  <div className="mt-2 space-y-1">
                    {day.jobs.map((job, jIdx) => (
                      <div key={jIdx} className="rounded-lg bg-card/80 px-2 py-1 text-[11px]">
                        <span className="font-mono font-medium">{job.jobNumber}</span>
                        <span className="mx-1 text-muted-foreground">--</span>
                        <span>{job.operation}</span>
                        <span className="ml-auto float-right font-medium">{job.hours} hrs</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ================================================================
          SECTION 5: Upcoming Milestones
          ================================================================ */}
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Milestones This Week</CardTitle>
          <p className="text-sm text-muted-foreground">
            Critical dates for materials, production starts, deliveries, and installations.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 lg:grid-cols-4">
            {/* Material Orders Due */}
            <div>
              <h4 className="mb-3 flex items-center gap-2 font-semibold">
                <span className={milestoneColor.material}>
                  {/* Package icon placeholder */}
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16.5 9.4 7.55 4.24" /><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.29 7 12 12 20.71 7" /><line x1="12" x2="12" y1="22" y2="12" /></svg>
                </span>
                Material Orders Due
                <Badge variant="secondary">{groupedMilestones.material.length}</Badge>
              </h4>
              <div className="space-y-2">
                {groupedMilestones.material.map((m, i) => (
                  <div key={i} className="rounded-md border p-2.5 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-medium">{m.jobNumber}</span>
                      <span className="text-xs text-muted-foreground">{m.date}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{m.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Productions Starting */}
            <div>
              <h4 className="mb-3 flex items-center gap-2 font-semibold">
                <span className={milestoneColor.production}>
                  {/* Factory icon placeholder */}
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" /><path d="M17 18h1" /><path d="M12 18h1" /><path d="M7 18h1" /></svg>
                </span>
                Productions Starting
                <Badge variant="secondary">{groupedMilestones.production.length}</Badge>
              </h4>
              <div className="space-y-2">
                {groupedMilestones.production.map((m, i) => (
                  <div key={i} className="rounded-md border p-2.5 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-medium">{m.jobNumber}</span>
                      <span className="text-xs text-muted-foreground">{m.date}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{m.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Deliveries */}
            <div>
              <h4 className="mb-3 flex items-center gap-2 font-semibold">
                <span className={milestoneColor.delivery}>
                  {/* Truck icon placeholder */}
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" /><path d="M15 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 13.52 9H12" /><circle cx="17" cy="18" r="2" /><circle cx="7" cy="18" r="2" /></svg>
                </span>
                Deliveries
                <Badge variant="secondary">{groupedMilestones.delivery.length}</Badge>
              </h4>
              <div className="space-y-2">
                {groupedMilestones.delivery.map((m, i) => (
                  <div key={i} className="rounded-md border p-2.5 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-medium">{m.jobNumber}</span>
                      <span className="text-xs text-muted-foreground">{m.date}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{m.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Installs */}
            <div>
              <h4 className="mb-3 flex items-center gap-2 font-semibold">
                <span className={milestoneColor.install}>
                  {/* Wrench icon placeholder */}
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /></svg>
                </span>
                Installations
                <Badge variant="secondary">{groupedMilestones.install.length}</Badge>
              </h4>
              <div className="space-y-2">
                {groupedMilestones.install.map((m, i) => (
                  <div key={i} className="rounded-md border p-2.5 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-medium">{m.jobNumber}</span>
                      <span className="text-xs text-muted-foreground">{m.date}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{m.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

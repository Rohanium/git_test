"use client";

import { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
// import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Tabs } from "@/components/ui/tabs";
import { formatCurrency, formatDate } from "@/lib/utils";
import { OPERATIONS, JOB_STATUSES } from "@/lib/constants";

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

type ProjectStatus =
  | "DRAFT"
  | "ACTIVE"
  | "ON_HOLD"
  | "COMPLETED"
  | "CANCELLED"
  | "WARRANTY";

type JobStatus = keyof typeof JOB_STATUSES;

type Priority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

type QuoteStatus = "DRAFT" | "SENT" | "APPROVED" | "REJECTED" | "CONVERTED";

type InvoiceStatus = "DRAFT" | "SENT" | "PAID" | "OVERDUE" | "CANCELLED";

type MilestoneStatus = "PLANNED" | "INVOICED" | "PAID";

interface Job {
  id: string;
  jobNumber: string;
  description: string;
  status: JobStatus;
  priority: Priority;
  materialCost: number;
  labourCost: number;
  labourHours: number;
  hardwareCost: number;
  margin: number;
  sellPrice: number;
  installDate: string;
  productionStartDate: string;
  materialOrderByDate: string;
  qcDate: string;
  deliveryDate: string;
  operations: {
    id: string;
    operationType: string;
    status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
    startDate: string;
    endDate: string;
    estimatedMins: number;
  }[];
}

interface Quote {
  id: string;
  quoteNumber: string;
  status: QuoteStatus;
  total: number;
  createdAt: string;
}

interface PlannedMilestone {
  id: string;
  milestone: string;
  amount: number;
  plannedDate: string;
  status: MilestoneStatus;
  invoiceId?: string;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  total: number;
  amountPaid: number;
  outstanding: number;
  dueDate: string;
  issuedDate: string;
}

interface CabinetVisionImport {
  id: string;
  fileName: string;
  importDate: string;
  totalLabourHours: number;
  itemCount: number;
}

interface Project {
  id: string;
  projectNumber: string;
  name: string;
  description: string;
  status: ProjectStatus;
  type: string;
  priority: Priority;
  startDate: string;
  targetCompletionDate: string;
  actualCompletionDate: string | null;
  siteAddress: string;
  siteCity: string;
  sitePostcode: string;
  company: { id: string; name: string; phone: string; email: string };
  contact: { id: string; name: string; phone: string; email: string };
  projectManager: string;
  totalBudget: number;
  totalQuoted: number;
  totalInvoiced: number;
  totalPaid: number;
  outstanding: number;
  jobs: Job[];
  quotes: Quote[];
  plannedMilestones: PlannedMilestone[];
  invoices: Invoice[];
  cabinetVisionImports: CabinetVisionImport[];
  designBrief: { summary: string; rooms: string[]; notes: string } | null;
}

// ═══════════════════════════════════════════════════════════════
// Status helpers
// ═══════════════════════════════════════════════════════════════

const projectStatusConfig: Record<
  ProjectStatus,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" | "success" | "warning" }
> = {
  DRAFT: { label: "Draft", variant: "secondary" },
  ACTIVE: { label: "Active", variant: "default" },
  ON_HOLD: { label: "On Hold", variant: "warning" },
  COMPLETED: { label: "Completed", variant: "success" },
  CANCELLED: { label: "Cancelled", variant: "destructive" },
  WARRANTY: { label: "Warranty", variant: "outline" },
};

const PROJECT_STATUSES = [
  { value: "DRAFT", label: "Draft" },
  { value: "ACTIVE", label: "Active" },
  { value: "ON_HOLD", label: "On Hold" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "WARRANTY", label: "Warranty" },
];

const jobStatusVariant: Record<string, "default" | "secondary" | "outline" | "destructive" | "success" | "warning"> = {
  PENDING: "secondary",
  MATERIALS_ORDERED: "outline",
  MATERIALS_RECEIVED: "outline",
  READY_TO_START: "default",
  IN_PROGRESS: "warning",
  ON_HOLD: "destructive",
  QC_PENDING: "outline",
  QC_PASSED: "success",
  READY_FOR_DELIVERY: "success",
  COMPLETED: "success",
  CANCELLED: "destructive",
};

const quoteStatusVariant: Record<string, "default" | "secondary" | "outline" | "destructive" | "success" | "warning"> = {
  DRAFT: "secondary",
  SENT: "default",
  APPROVED: "success",
  REJECTED: "destructive",
  CONVERTED: "success",
};

const invoiceStatusVariant: Record<string, "default" | "secondary" | "outline" | "destructive" | "success" | "warning"> = {
  DRAFT: "secondary",
  SENT: "default",
  PAID: "success",
  OVERDUE: "destructive",
  CANCELLED: "destructive",
};

const milestoneStatusVariant: Record<string, "default" | "secondary" | "outline" | "destructive" | "success" | "warning"> = {
  PLANNED: "outline",
  INVOICED: "warning",
  PAID: "success",
};

// ═══════════════════════════════════════════════════════════════
// Sample Data
// ═══════════════════════════════════════════════════════════════

const sampleProject: Project = {
  id: "proj-001",
  projectNumber: "PRJ-2025-0042",
  name: "Henderson Kitchen & Laundry Renovation",
  description:
    "Full kitchen renovation with new cabinetry, stone benchtops, and integrated appliances. Includes laundry cabinetry and a built-in study nook off the kitchen. Heritage villa requiring careful templating around existing features.",
  status: "ACTIVE",
  type: "KITCHEN",
  priority: "HIGH",
  startDate: "2025-03-10",
  targetCompletionDate: "2025-06-20",
  actualCompletionDate: null,
  siteAddress: "47 Henderson Valley Road",
  siteCity: "Henderson, Auckland",
  sitePostcode: "0612",
  company: {
    id: "comp-001",
    name: "Westside Developments Ltd",
    phone: "09 837 2200",
    email: "projects@westsidedev.co.nz",
  },
  contact: {
    id: "cont-001",
    name: "Sarah Mitchell",
    phone: "021 555 1234",
    email: "sarah@westsidedev.co.nz",
  },
  projectManager: "James Hartley",
  totalBudget: 68000,
  totalQuoted: 72450,
  totalInvoiced: 36225,
  totalPaid: 28980,
  outstanding: 7245,
  jobs: [
    {
      id: "job-001",
      jobNumber: "JOB-0042-01",
      description: "Kitchen Base Cabinets (x12)",
      status: "IN_PROGRESS",
      priority: "HIGH",
      materialCost: 8400,
      labourCost: 6200,
      labourHours: 62,
      hardwareCost: 3100,
      margin: 0.35,
      sellPrice: 27230,
      installDate: "2025-06-10",
      productionStartDate: "2025-04-28",
      materialOrderByDate: "2025-04-14",
      qcDate: "2025-06-02",
      deliveryDate: "2025-06-06",
      operations: [
        { id: "op-001", operationType: "CUTTING", status: "COMPLETED", startDate: "2025-04-28", endDate: "2025-04-29", estimatedMins: 480 },
        { id: "op-002", operationType: "CNC_MACHINING", status: "COMPLETED", startDate: "2025-04-30", endDate: "2025-05-01", estimatedMins: 960 },
        { id: "op-003", operationType: "EDGE_BANDING", status: "COMPLETED", startDate: "2025-05-02", endDate: "2025-05-02", estimatedMins: 240 },
        { id: "op-004", operationType: "DRILLING", status: "IN_PROGRESS", startDate: "2025-05-05", endDate: "2025-05-06", estimatedMins: 360 },
        { id: "op-005", operationType: "ASSEMBLY", status: "PENDING", startDate: "2025-05-07", endDate: "2025-05-12", estimatedMins: 1200 },
        { id: "op-006", operationType: "FITTING_HARDWARE", status: "PENDING", startDate: "2025-05-13", endDate: "2025-05-14", estimatedMins: 480 },
        { id: "op-007", operationType: "SPRAY_PAINTING", status: "PENDING", startDate: "2025-05-15", endDate: "2025-05-20", estimatedMins: 720 },
        { id: "op-008", operationType: "PACKING", status: "PENDING", startDate: "2025-05-30", endDate: "2025-06-02", estimatedMins: 120 },
      ],
    },
    {
      id: "job-002",
      jobNumber: "JOB-0042-02",
      description: "Kitchen Wall Cabinets (x8)",
      status: "MATERIALS_ORDERED",
      priority: "HIGH",
      materialCost: 4800,
      labourCost: 3600,
      labourHours: 36,
      hardwareCost: 1600,
      margin: 0.35,
      sellPrice: 15385,
      installDate: "2025-06-12",
      productionStartDate: "2025-05-12",
      materialOrderByDate: "2025-04-28",
      qcDate: "2025-06-06",
      deliveryDate: "2025-06-09",
      operations: [
        { id: "op-009", operationType: "CUTTING", status: "PENDING", startDate: "2025-05-12", endDate: "2025-05-12", estimatedMins: 300 },
        { id: "op-010", operationType: "CNC_MACHINING", status: "PENDING", startDate: "2025-05-13", endDate: "2025-05-14", estimatedMins: 720 },
        { id: "op-011", operationType: "EDGE_BANDING", status: "PENDING", startDate: "2025-05-15", endDate: "2025-05-15", estimatedMins: 180 },
        { id: "op-012", operationType: "ASSEMBLY", status: "PENDING", startDate: "2025-05-16", endDate: "2025-05-20", estimatedMins: 900 },
        { id: "op-013", operationType: "SPRAY_PAINTING", status: "PENDING", startDate: "2025-05-21", endDate: "2025-05-26", estimatedMins: 600 },
        { id: "op-014", operationType: "PACKING", status: "PENDING", startDate: "2025-06-04", endDate: "2025-06-06", estimatedMins: 90 },
      ],
    },
    {
      id: "job-003",
      jobNumber: "JOB-0042-03",
      description: "Laundry Cabinets & Benchtop",
      status: "PENDING",
      priority: "NORMAL",
      materialCost: 3200,
      labourCost: 2400,
      labourHours: 24,
      hardwareCost: 850,
      margin: 0.35,
      sellPrice: 9923,
      installDate: "2025-06-16",
      productionStartDate: "2025-05-26",
      materialOrderByDate: "2025-05-12",
      qcDate: "2025-06-10",
      deliveryDate: "2025-06-13",
      operations: [
        { id: "op-015", operationType: "CUTTING", status: "PENDING", startDate: "2025-05-26", endDate: "2025-05-26", estimatedMins: 240 },
        { id: "op-016", operationType: "CNC_MACHINING", status: "PENDING", startDate: "2025-05-27", endDate: "2025-05-27", estimatedMins: 300 },
        { id: "op-017", operationType: "EDGE_BANDING", status: "PENDING", startDate: "2025-05-28", endDate: "2025-05-28", estimatedMins: 120 },
        { id: "op-018", operationType: "ASSEMBLY", status: "PENDING", startDate: "2025-05-29", endDate: "2025-05-30", estimatedMins: 600 },
        { id: "op-019", operationType: "SPRAY_PAINTING", status: "PENDING", startDate: "2025-06-02", endDate: "2025-06-05", estimatedMins: 480 },
        { id: "op-020", operationType: "PACKING", status: "PENDING", startDate: "2025-06-09", endDate: "2025-06-10", estimatedMins: 60 },
      ],
    },
    {
      id: "job-004",
      jobNumber: "JOB-0042-04",
      description: "Study Nook Built-in Desk & Shelving",
      status: "PENDING",
      priority: "LOW",
      materialCost: 2100,
      labourCost: 1800,
      labourHours: 18,
      hardwareCost: 420,
      margin: 0.35,
      sellPrice: 6646,
      installDate: "2025-06-18",
      productionStartDate: "2025-06-02",
      materialOrderByDate: "2025-05-19",
      qcDate: "2025-06-13",
      deliveryDate: "2025-06-16",
      operations: [
        { id: "op-021", operationType: "CUTTING", status: "PENDING", startDate: "2025-06-02", endDate: "2025-06-02", estimatedMins: 180 },
        { id: "op-022", operationType: "CNC_MACHINING", status: "PENDING", startDate: "2025-06-03", endDate: "2025-06-03", estimatedMins: 240 },
        { id: "op-023", operationType: "ASSEMBLY", status: "PENDING", startDate: "2025-06-04", endDate: "2025-06-05", estimatedMins: 480 },
        { id: "op-024", operationType: "STAINING", status: "PENDING", startDate: "2025-06-06", endDate: "2025-06-09", estimatedMins: 360 },
        { id: "op-025", operationType: "HAND_FINISHING", status: "PENDING", startDate: "2025-06-10", endDate: "2025-06-11", estimatedMins: 300 },
        { id: "op-026", operationType: "PACKING", status: "PENDING", startDate: "2025-06-12", endDate: "2025-06-13", estimatedMins: 60 },
      ],
    },
  ],
  quotes: [
    { id: "q-001", quoteNumber: "QT-2025-0067", status: "APPROVED", total: 72450, createdAt: "2025-02-28" },
    { id: "q-002", quoteNumber: "QT-2025-0071", status: "DRAFT", total: 6500, createdAt: "2025-04-05" },
  ],
  plannedMilestones: [
    { id: "ms-001", milestone: "Deposit (50%)", amount: 36225, plannedDate: "2025-03-15", status: "PAID" },
    { id: "ms-002", milestone: "Production Complete (30%)", amount: 21735, plannedDate: "2025-06-01", status: "PLANNED" },
    { id: "ms-003", milestone: "Installation Complete (15%)", amount: 10867.5, plannedDate: "2025-06-20", status: "PLANNED" },
    { id: "ms-004", milestone: "Final Sign-off (5%)", amount: 3622.5, plannedDate: "2025-07-01", status: "PLANNED" },
  ],
  invoices: [
    { id: "inv-001", invoiceNumber: "INV-2025-0089", status: "PAID", total: 36225, amountPaid: 36225, outstanding: 0, dueDate: "2025-03-29", issuedDate: "2025-03-15" },
  ],
  cabinetVisionImports: [
    { id: "cv-001", fileName: "Henderson_Kitchen_Base_v3.cvm", importDate: "2025-03-20", totalLabourHours: 62, itemCount: 12 },
    { id: "cv-002", fileName: "Henderson_Kitchen_Wall_v2.cvm", importDate: "2025-03-22", totalLabourHours: 36, itemCount: 8 },
    { id: "cv-003", fileName: "Henderson_Laundry_v1.cvm", importDate: "2025-04-01", totalLabourHours: 24, itemCount: 5 },
  ],
  designBrief: {
    summary:
      "Modern Scandinavian-inspired kitchen with flat-panel cabinetry in matte white 2-pack paint. Timber (American Oak) accents on open shelving and island end panels. Integrated Fisher & Paykel appliance suite. Stone benchtops (Caesarstone Cloudburst Concrete). Matching laundry with overhead drying cabinets.",
    rooms: ["Kitchen", "Laundry", "Study Nook"],
    notes:
      "Client is particular about timber grain matching on island panels. Heritage villa -- existing architraves and skirting to remain. Plumber and electrician booked by builder (Westside). Site access via rear driveway only -- 2.4m clearance.",
  },
};

// ═══════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════

export default function ProjectDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");
  const [showStatusChange, setShowStatusChange] = useState(false);
  const [showAddJob, setShowAddJob] = useState(false);
  const [showAddMilestone, setShowAddMilestone] = useState(false);
  const [showImportCV, setShowImportCV] = useState(false);
  const [newStatus, setNewStatus] = useState<string>(sampleProject.status);

  // ── tRPC queries (commented out, using sample data) ──────────
  // const { data: project, isLoading, refetch } = trpc.projects.getById.useQuery(id as string);
  // const updateStatusMutation = trpc.projects.updateStatus.useMutation({
  //   onSuccess: () => { setShowStatusChange(false); refetch(); },
  // });
  // const addJobMutation = trpc.projects.addJob.useMutation({
  //   onSuccess: () => { setShowAddJob(false); refetch(); },
  // });
  // const addMilestoneMutation = trpc.projects.addPlannedMilestone.useMutation({
  //   onSuccess: () => { setShowAddMilestone(false); refetch(); },
  // });
  // const generateInvoiceMutation = trpc.finance.generateInvoiceFromMilestone.useMutation({
  //   onSuccess: () => { refetch(); },
  // });
  // const importCVMutation = trpc.design.importCabinetVision.useMutation({
  //   onSuccess: () => { setShowImportCV(false); refetch(); },
  // });

  const project = sampleProject;

  // ── Add Job form state ───────────────────────────────────────
  const [jobForm, setJobForm] = useState({
    description: "",
    operations: [] as string[],
    estimatedHours: "",
    materialCost: "",
    labourCost: "",
    labourHours: "",
    hardwareCost: "",
    margin: "35",
    sellPrice: "",
    installDate: "",
  });

  // ── Add Milestone form state ─────────────────────────────────
  const [milestoneForm, setMilestoneForm] = useState({
    milestone: "",
    amount: "",
    plannedDate: "",
  });

  const OPERATION_OPTIONS = Object.entries(OPERATIONS).map(([k, v]) => ({
    value: k,
    label: v,
  }));

  // ── Compute backward scheduling dates from install date ──────
  function computeBackwardDates(installDate: string) {
    if (!installDate) return null;
    const install = new Date(installDate);
    const delivery = new Date(install);
    delivery.setDate(delivery.getDate() - 4);
    const qc = new Date(delivery);
    qc.setDate(qc.getDate() - 4);
    const productionStart = new Date(qc);
    productionStart.setDate(productionStart.getDate() - 21);
    const materialOrderBy = new Date(productionStart);
    materialOrderBy.setDate(materialOrderBy.getDate() - 14);
    return {
      materialOrderBy: materialOrderBy.toISOString().split("T")[0],
      productionStart: productionStart.toISOString().split("T")[0],
      qc: qc.toISOString().split("T")[0],
      delivery: delivery.toISOString().split("T")[0],
    };
  }

  const computedDates = computeBackwardDates(jobForm.installDate);

  // ── Auto-calculate sell price from costs and margin ──────────
  const computedSellPrice = useMemo(() => {
    const mat = parseFloat(jobForm.materialCost) || 0;
    const lab = parseFloat(jobForm.labourCost) || 0;
    const hw = parseFloat(jobForm.hardwareCost) || 0;
    const margin = parseFloat(jobForm.margin) || 0;
    const totalCost = mat + lab + hw;
    if (margin >= 100) return totalCost;
    return totalCost / (1 - margin / 100);
  }, [jobForm.materialCost, jobForm.labourCost, jobForm.hardwareCost, jobForm.margin]);

  // ── Cashflow data ────────────────────────────────────────────
  const cashflowData = useMemo(() => {
    const months: {
      month: string;
      planned: number;
      invoiced: number;
      paid: number;
      runningPlanned: number;
      runningInvoiced: number;
      runningPaid: number;
    }[] = [];

    const allDates = [
      ...project.plannedMilestones.map((m) => m.plannedDate),
      ...project.invoices.map((i) => i.issuedDate),
    ];
    const monthSet = new Set(allDates.map((d) => d.substring(0, 7)));
    const sortedMonths = Array.from(monthSet).sort();

    let runPlanned = 0;
    let runInvoiced = 0;
    let runPaid = 0;

    for (const month of sortedMonths) {
      const planned = project.plannedMilestones
        .filter((m) => m.plannedDate.startsWith(month))
        .reduce((sum, m) => sum + m.amount, 0);
      const invoiced = project.invoices
        .filter((i) => i.issuedDate.startsWith(month))
        .reduce((sum, i) => sum + i.total, 0);
      const paid = project.invoices
        .filter((i) => i.issuedDate.startsWith(month) && i.status === "PAID")
        .reduce((sum, i) => sum + i.amountPaid, 0);

      runPlanned += planned;
      runInvoiced += invoiced;
      runPaid += paid;

      months.push({
        month,
        planned,
        invoiced,
        paid,
        runningPlanned: runPlanned,
        runningInvoiced: runInvoiced,
        runningPaid: runPaid,
      });
    }

    return months;
  }, [project.plannedMilestones, project.invoices]);

  // ── Gantt schedule helpers ───────────────────────────────────
  const scheduleRange = useMemo(() => {
    const allDates: string[] = [];
    for (const job of project.jobs) {
      allDates.push(job.materialOrderByDate, job.installDate);
      for (const op of job.operations) {
        allDates.push(op.startDate, op.endDate);
      }
    }
    const sorted = allDates.sort();
    const start = new Date(sorted[0]);
    start.setDate(start.getDate() - 3);
    const end = new Date(sorted[sorted.length - 1]);
    end.setDate(end.getDate() + 3);
    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return { start, end, totalDays };
  }, [project.jobs]);

  function dayOffset(dateStr: string): number {
    const d = new Date(dateStr);
    return Math.ceil((d.getTime() - scheduleRange.start.getTime()) / (1000 * 60 * 60 * 24));
  }

  function daySpan(startStr: string, endStr: string): number {
    return Math.max(1, Math.ceil((new Date(endStr).getTime() - new Date(startStr).getTime()) / (1000 * 60 * 60 * 24)) + 1);
  }

  const todayOffset = dayOffset(new Date().toISOString().split("T")[0]);
  const todayStr = new Date().toISOString().split("T")[0];

  // ── Progress calculations ────────────────────────────────────
  const quotedVsBudgetPct = project.totalBudget > 0 ? Math.round((project.totalQuoted / project.totalBudget) * 100) : 0;
  const invoicedVsQuotedPct = project.totalQuoted > 0 ? Math.round((project.totalInvoiced / project.totalQuoted) * 100) : 0;
  const paidVsInvoicedPct = project.totalInvoiced > 0 ? Math.round((project.totalPaid / project.totalInvoiced) * 100) : 0;

  // ── Status config for this project ───────────────────────────
  const statusCfg = projectStatusConfig[project.status];

  // ── Tab definitions ──────────────────────────────────────────
  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "jobs", label: "Jobs", count: project.jobs.length },
    { key: "quotes", label: "Quotes & Invoicing", count: project.quotes.length + project.invoices.length },
    { key: "cashflow", label: "Cashflow" },
    { key: "schedule", label: "Schedule" },
    { key: "design", label: "Design & Files", count: project.cabinetVisionImports.length },
  ];

  // ═════════════════════════════════════════════════════════════
  // Render
  // ═════════════════════════════════════════════════════════════

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <button
          onClick={() => router.push("/projects")}
          className="hover:text-foreground transition-colors"
        >
          &larr; Projects
        </button>
        <span>/</span>
        <span className="text-foreground">{project.projectNumber}</span>
      </div>

      <PageHeader
        title={`${project.projectNumber} -- ${project.name}`}
        description={project.company.name}
        helpText="View this project's full details including timeline, budget tracking, linked orders, and milestones."
        actions={
          <div className="flex items-center gap-2">
            <Badge variant={statusCfg.variant} className="text-sm">
              {statusCfg.label}
            </Badge>
            <Button
              variant="outline"
              onClick={() => router.push(`/projects/${project.id}/edit`)}
            >
              Edit
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setNewStatus(project.status);
                setShowStatusChange(true);
              }}
            >
              Change Status
            </Button>
            <Button onClick={() => setShowAddJob(true)}>+ Add Job</Button>
          </div>
        }
      />

      {/* ── Summary Cards ───────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Budget
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(project.totalBudget)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Quoted
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">
              {formatCurrency(project.totalQuoted)}
            </p>
            <div className="mt-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>vs Budget</span>
                <span>{quotedVsBudgetPct}%</span>
              </div>
              <div className="mt-1 h-1.5 w-full rounded-full bg-muted">
                <div
                  className="h-1.5 rounded-full bg-primary transition-all"
                  style={{ width: `${Math.min(quotedVsBudgetPct, 100)}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Invoiced
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(project.totalInvoiced)}</p>
            <div className="mt-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>vs Quoted</span>
                <span>{invoicedVsQuotedPct}%</span>
              </div>
              <div className="mt-1 h-1.5 w-full rounded-full bg-muted">
                <div
                  className="h-1.5 rounded-full bg-amber-500 transition-all"
                  style={{ width: `${Math.min(invoicedVsQuotedPct, 100)}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Paid
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-600">
              {formatCurrency(project.totalPaid)}
            </p>
            <div className="mt-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>vs Invoiced</span>
                <span>{paidVsInvoicedPct}%</span>
              </div>
              <div className="mt-1 h-1.5 w-full rounded-full bg-muted">
                <div
                  className="h-1.5 rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${Math.min(paidVsInvoicedPct, 100)}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Outstanding
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">
              {formatCurrency(project.outstanding)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Remaining: {formatCurrency(project.totalQuoted - project.totalInvoiced)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Tabs ────────────────────────────────────────────── */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* ═══════════════════════════════════════════════════════
          Tab 1: Overview
          ═══════════════════════════════════════════════════════ */}
      {activeTab === "overview" && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Project Details */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Project Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Description</p>
                <p className="mt-1 text-sm">{project.description}</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-sm text-muted-foreground">Type</p>
                  <p className="mt-1 text-sm font-medium">{project.type}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Priority</p>
                  <Badge
                    variant={
                      project.priority === "URGENT"
                        ? "destructive"
                        : project.priority === "HIGH"
                        ? "warning"
                        : "outline"
                    }
                  >
                    {project.priority}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Project Manager</p>
                  <p className="mt-1 text-sm font-medium">{project.projectManager}</p>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Start Date</p>
                  <p className="mt-1 text-sm font-medium">{formatDate(project.startDate)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Target Completion</p>
                  <p className="mt-1 text-sm font-medium">
                    {formatDate(project.targetCompletionDate)}
                  </p>
                </div>
              </div>

              {/* Site Address */}
              <div>
                <p className="text-sm text-muted-foreground">Site Address</p>
                <p className="mt-1 text-sm font-medium">
                  {project.siteAddress}, {project.siteCity} {project.sitePostcode}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Company & Contact */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Company</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="font-medium">{project.company.name}</p>
                <p className="text-sm text-muted-foreground">{project.company.phone}</p>
                <p className="text-sm text-muted-foreground">{project.company.email}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Primary Contact</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="font-medium">{project.contact.name}</p>
                <p className="text-sm text-muted-foreground">{project.contact.phone}</p>
                <p className="text-sm text-muted-foreground">{project.contact.email}</p>
              </CardContent>
            </Card>
          </div>

          {/* Timeline */}
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>Project Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-muted" />
                {[
                  {
                    label: "Project Start",
                    date: project.startDate,
                    color: "bg-primary",
                    past: new Date(project.startDate) <= new Date(),
                  },
                  ...project.jobs.map((j) => ({
                    label: `Material Order -- ${j.description}`,
                    date: j.materialOrderByDate,
                    color: "bg-amber-500",
                    past: new Date(j.materialOrderByDate) <= new Date(),
                  })),
                  ...project.jobs.map((j) => ({
                    label: `Production Start -- ${j.description}`,
                    date: j.productionStartDate,
                    color: "bg-blue-500",
                    past: new Date(j.productionStartDate) <= new Date(),
                  })),
                  ...project.jobs.map((j) => ({
                    label: `Install -- ${j.description}`,
                    date: j.installDate,
                    color: "bg-emerald-500",
                    past: new Date(j.installDate) <= new Date(),
                  })),
                  {
                    label: "Target Completion",
                    date: project.targetCompletionDate,
                    color: "bg-primary",
                    past: new Date(project.targetCompletionDate) <= new Date(),
                  },
                ]
                  .sort((a, b) => a.date.localeCompare(b.date))
                  .map((event, idx) => (
                    <div key={idx} className="relative flex items-start gap-4 pb-6 pl-10">
                      <div
                        className={`absolute left-[11px] top-1 h-3 w-3 rounded-full border-2 border-background ${
                          event.past ? event.color : "bg-muted"
                        }`}
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{event.label}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(event.date)}</p>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          Tab 2: Jobs
          ═══════════════════════════════════════════════════════ */}
      {activeTab === "jobs" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Jobs ({project.jobs.length})</CardTitle>
            <Button size="sm" onClick={() => setShowAddJob(true)}>
              + Add Job
            </Button>
          </CardHeader>
          <CardContent>
            {project.jobs.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">
                No jobs yet. Add the first job to start production planning.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                        Job #
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                        Description
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                        Status
                      </th>
                      <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                        Priority
                      </th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                        Material
                      </th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                        Labour
                      </th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                        Hardware
                      </th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                        Sell Price
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                        Install
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                        Prod. Start
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                        Mat. Order By
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {project.jobs.map((job) => (
                      <tr key={job.id} className="border-b hover:bg-muted/50 transition-colors">
                        <td className="px-4 py-3 font-mono font-medium">{job.jobNumber}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium">{job.description}</div>
                          <div className="mt-1 flex gap-1">
                            {job.operations.map((op) => (
                              <div
                                key={op.id}
                                title={(OPERATIONS as any)[op.operationType] ?? op.operationType}
                                className={`h-5 w-5 rounded text-center text-[9px] leading-5 ${
                                  op.status === "COMPLETED"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : op.status === "IN_PROGRESS"
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-muted text-muted-foreground"
                                }`}
                              >
                                {((OPERATIONS as any)[op.operationType] ?? "?")[0]}
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={jobStatusVariant[job.status] ?? "secondary"}>
                            {(JOB_STATUSES as any)[job.status]?.label ?? job.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-center">
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
                        </td>
                        <td className="px-4 py-3 text-right">
                          {formatCurrency(job.materialCost)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div>{formatCurrency(job.labourCost)}</div>
                          <div className="text-xs text-muted-foreground">
                            {job.labourHours}h
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {formatCurrency(job.hardwareCost)}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold">
                          {formatCurrency(job.sellPrice)}
                        </td>
                        <td className="px-4 py-3 text-sm">{formatDate(job.installDate)}</td>
                        <td className="px-4 py-3 text-sm">
                          {formatDate(job.productionStartDate)}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span
                            className={
                              new Date(job.materialOrderByDate) < new Date()
                                ? "text-destructive font-medium"
                                : ""
                            }
                          >
                            {formatDate(job.materialOrderByDate)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-muted/30">
                      <td colSpan={4} className="px-4 py-3 text-right font-semibold">
                        Totals
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">
                        {formatCurrency(
                          project.jobs.reduce((s, j) => s + j.materialCost, 0)
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">
                        {formatCurrency(
                          project.jobs.reduce((s, j) => s + j.labourCost, 0)
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">
                        {formatCurrency(
                          project.jobs.reduce((s, j) => s + j.hardwareCost, 0)
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">
                        {formatCurrency(
                          project.jobs.reduce((s, j) => s + j.sellPrice, 0)
                        )}
                      </td>
                      <td colSpan={3} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ═══════════════════════════════════════════════════════
          Tab 3: Quotes & Invoicing
          ═══════════════════════════════════════════════════════ */}
      {activeTab === "quotes" && (
        <div className="space-y-6">
          {/* Section 1: Quotes */}
          <Card>
            <CardHeader>
              <CardTitle>Quotes</CardTitle>
            </CardHeader>
            <CardContent>
              {project.quotes.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">No quotes linked.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                          Quote #
                        </th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                          Status
                        </th>
                        <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                          Total
                        </th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                          Date
                        </th>
                        <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {project.quotes.map((q) => (
                        <tr key={q.id} className="border-b hover:bg-muted/50 transition-colors">
                          <td className="px-4 py-3 font-mono font-medium">{q.quoteNumber}</td>
                          <td className="px-4 py-3">
                            <Badge variant={quoteStatusVariant[q.status] ?? "secondary"}>
                              {q.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right font-semibold">
                            {formatCurrency(q.total)}
                          </td>
                          <td className="px-4 py-3">{formatDate(q.createdAt)}</td>
                          <td className="px-4 py-3 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => router.push(`/quotes/${q.id}`)}
                            >
                              View
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Section 2: Planned Invoice Schedule */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Planned Invoice Schedule</CardTitle>
              <Button size="sm" variant="outline" onClick={() => setShowAddMilestone(true)}>
                + Add Milestone
              </Button>
            </CardHeader>
            <CardContent>
              {project.plannedMilestones.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">
                  No invoicing milestones planned.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                          Milestone
                        </th>
                        <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                          Amount
                        </th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                          Planned Date
                        </th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                          Status
                        </th>
                        <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {project.plannedMilestones.map((ms) => (
                        <tr
                          key={ms.id}
                          className="border-b hover:bg-muted/50 transition-colors"
                        >
                          <td className="px-4 py-3 font-medium">{ms.milestone}</td>
                          <td className="px-4 py-3 text-right font-semibold">
                            {formatCurrency(ms.amount)}
                          </td>
                          <td className="px-4 py-3">{formatDate(ms.plannedDate)}</td>
                          <td className="px-4 py-3">
                            <Badge variant={milestoneStatusVariant[ms.status] ?? "outline"}>
                              {ms.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right">
                            {ms.status === "PLANNED" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  // generateInvoiceMutation.mutate({ milestoneId: ms.id, projectId: project.id });
                                  alert(`Generate invoice for milestone: ${ms.milestone}`);
                                }}
                              >
                                Generate Invoice
                              </Button>
                            )}
                            {ms.status === "INVOICED" && (
                              <span className="text-xs text-muted-foreground">Invoiced</span>
                            )}
                            {ms.status === "PAID" && (
                              <span className="text-xs text-emerald-600 font-medium">Paid</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-muted/30">
                        <td className="px-4 py-3 font-semibold">Total</td>
                        <td className="px-4 py-3 text-right font-semibold">
                          {formatCurrency(
                            project.plannedMilestones.reduce((s, m) => s + m.amount, 0)
                          )}
                        </td>
                        <td colSpan={3} />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Section 3: Actual Invoices */}
          <Card>
            <CardHeader>
              <CardTitle>Invoices</CardTitle>
            </CardHeader>
            <CardContent>
              {project.invoices.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">No invoices yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                          Invoice #
                        </th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                          Status
                        </th>
                        <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                          Total
                        </th>
                        <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                          Paid
                        </th>
                        <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                          Outstanding
                        </th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                          Issued
                        </th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                          Due
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {project.invoices.map((inv) => (
                        <tr
                          key={inv.id}
                          className="border-b hover:bg-muted/50 transition-colors"
                        >
                          <td className="px-4 py-3 font-mono font-medium">
                            {inv.invoiceNumber}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={invoiceStatusVariant[inv.status] ?? "secondary"}>
                              {inv.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right font-semibold">
                            {formatCurrency(inv.total)}
                          </td>
                          <td className="px-4 py-3 text-right text-emerald-600">
                            {formatCurrency(inv.amountPaid)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {inv.outstanding > 0 ? (
                              <span className="text-destructive font-medium">
                                {formatCurrency(inv.outstanding)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">--</span>
                            )}
                          </td>
                          <td className="px-4 py-3">{formatDate(inv.issuedDate)}</td>
                          <td className="px-4 py-3">{formatDate(inv.dueDate)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          Tab 4: Cashflow
          ═══════════════════════════════════════════════════════ */}
      {activeTab === "cashflow" && (
        <div className="space-y-6">
          {/* Visual progress bar */}
          <Card>
            <CardHeader>
              <CardTitle>Invoicing & Payment Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-medium">Invoiced vs Total Quoted</span>
                  <span className="text-muted-foreground">
                    {formatCurrency(project.totalInvoiced)} of{" "}
                    {formatCurrency(project.totalQuoted)} ({invoicedVsQuotedPct}%)
                  </span>
                </div>
                <div className="h-4 w-full rounded-full bg-muted">
                  <div
                    className="h-4 rounded-full bg-amber-500 transition-all"
                    style={{ width: `${Math.min(invoicedVsQuotedPct, 100)}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-medium">Paid vs Total Quoted</span>
                  <span className="text-muted-foreground">
                    {formatCurrency(project.totalPaid)} of{" "}
                    {formatCurrency(project.totalQuoted)} (
                    {project.totalQuoted > 0
                      ? Math.round((project.totalPaid / project.totalQuoted) * 100)
                      : 0}
                    %)
                  </span>
                </div>
                <div className="h-4 w-full rounded-full bg-muted">
                  <div
                    className="h-4 rounded-full bg-emerald-500 transition-all"
                    style={{
                      width: `${Math.min(
                        project.totalQuoted > 0
                          ? (project.totalPaid / project.totalQuoted) * 100
                          : 0,
                        100
                      )}%`,
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Month-by-month cashflow table */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly Cashflow</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                        Month
                      </th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                        Planned
                      </th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                        Actual Invoiced
                      </th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                        Actual Paid
                      </th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                        Running Planned
                      </th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                        Running Invoiced
                      </th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                        Running Paid
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {cashflowData.map((row) => (
                      <tr key={row.month} className="border-b hover:bg-muted/50 transition-colors">
                        <td className="px-4 py-3 font-medium">
                          {new Date(row.month + "-01").toLocaleDateString("en-NZ", {
                            year: "numeric",
                            month: "short",
                          })}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {row.planned > 0 ? formatCurrency(row.planned) : "--"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {row.invoiced > 0 ? formatCurrency(row.invoiced) : "--"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {row.paid > 0 ? (
                            <span className="text-emerald-600">
                              {formatCurrency(row.paid)}
                            </span>
                          ) : (
                            "--"
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-medium">
                          {formatCurrency(row.runningPlanned)}
                        </td>
                        <td className="px-4 py-3 text-right font-medium">
                          {formatCurrency(row.runningInvoiced)}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-emerald-600">
                          {formatCurrency(row.runningPaid)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Payment Milestones */}
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Payment Milestones</CardTitle>
            </CardHeader>
            <CardContent>
              {project.plannedMilestones.filter((m) => m.status !== "PAID").length === 0 ? (
                <p className="py-4 text-center text-muted-foreground">
                  All milestones have been paid.
                </p>
              ) : (
                <div className="space-y-3">
                  {project.plannedMilestones
                    .filter((m) => m.status !== "PAID")
                    .sort((a, b) => a.plannedDate.localeCompare(b.plannedDate))
                    .map((ms) => (
                      <div
                        key={ms.id}
                        className="flex items-center justify-between rounded-lg border p-4"
                      >
                        <div>
                          <p className="font-medium">{ms.milestone}</p>
                          <p className="text-sm text-muted-foreground">
                            Planned: {formatDate(ms.plannedDate)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold">{formatCurrency(ms.amount)}</p>
                          <Badge variant={milestoneStatusVariant[ms.status] ?? "outline"}>
                            {ms.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          Tab 5: Schedule (Gantt-style)
          ═══════════════════════════════════════════════════════ */}
      {activeTab === "schedule" && (
        <Card>
          <CardHeader>
            <CardTitle>Production Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Legend */}
            <div className="mb-4 flex flex-wrap items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded bg-emerald-500" />
                <span>Completed</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded bg-red-500" />
                <span>Overdue</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded bg-blue-500" />
                <span>In Progress</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded bg-gray-300" />
                <span>Pending</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-1 w-4 bg-red-400" />
                <span>Today</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-0.5 bg-amber-500" />
                <span>Material Order</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-0.5 bg-blue-600" />
                <span>Prod. Start</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-0.5 bg-purple-500" />
                <span>QC</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-0.5 bg-teal-500" />
                <span>Delivery</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-0.5 bg-emerald-600" />
                <span>Install</span>
              </div>
            </div>

            {/* Timeline header (week markers) */}
            <div className="overflow-x-auto">
              <div style={{ minWidth: `${scheduleRange.totalDays * 12 + 240}px` }}>
                {/* Date header */}
                <div className="flex border-b">
                  <div className="w-[240px] shrink-0 px-4 py-2 text-xs font-medium text-muted-foreground">
                    Job
                  </div>
                  <div className="relative flex-1">
                    {Array.from({ length: Math.ceil(scheduleRange.totalDays / 7) }).map(
                      (_, weekIdx) => {
                        const weekDate = new Date(scheduleRange.start);
                        weekDate.setDate(weekDate.getDate() + weekIdx * 7);
                        return (
                          <div
                            key={weekIdx}
                            className="absolute top-0 text-[10px] text-muted-foreground"
                            style={{ left: `${weekIdx * 7 * 12}px` }}
                          >
                            <div className="border-l border-muted pl-1 py-1">
                              {weekDate.toLocaleDateString("en-NZ", {
                                day: "numeric",
                                month: "short",
                              })}
                            </div>
                          </div>
                        );
                      }
                    )}
                  </div>
                </div>

                {/* Job rows */}
                {project.jobs.map((job) => (
                  <div key={job.id} className="flex border-b hover:bg-muted/30 transition-colors">
                    {/* Job label */}
                    <div className="w-[240px] shrink-0 px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-muted-foreground">
                          {job.jobNumber}
                        </span>
                        <Badge
                          variant={jobStatusVariant[job.status] ?? "secondary"}
                          className="text-[10px]"
                        >
                          {(JOB_STATUSES as any)[job.status]?.label ?? job.status}
                        </Badge>
                      </div>
                      <p className="text-xs font-medium mt-0.5 truncate" title={job.description}>
                        {job.description}
                      </p>
                    </div>

                    {/* Gantt bar area */}
                    <div className="relative flex-1" style={{ height: "56px" }}>
                      {/* Today marker */}
                      {todayOffset >= 0 && todayOffset <= scheduleRange.totalDays && (
                        <div
                          className="absolute top-0 bottom-0 w-0.5 bg-red-400 z-10"
                          style={{ left: `${todayOffset * 12}px` }}
                        />
                      )}

                      {/* Key date markers */}
                      {[
                        {
                          date: job.materialOrderByDate,
                          color: "bg-amber-500",
                          label: "Mat",
                        },
                        {
                          date: job.productionStartDate,
                          color: "bg-blue-600",
                          label: "Prod",
                        },
                        { date: job.qcDate, color: "bg-purple-500", label: "QC" },
                        { date: job.deliveryDate, color: "bg-teal-500", label: "Del" },
                        { date: job.installDate, color: "bg-emerald-600", label: "Inst" },
                      ].map((marker) => {
                        const offset = dayOffset(marker.date);
                        if (offset < 0 || offset > scheduleRange.totalDays) return null;
                        return (
                          <div
                            key={marker.label}
                            className={`absolute top-0 w-0.5 ${marker.color}`}
                            style={{
                              left: `${offset * 12}px`,
                              height: "100%",
                              opacity: 0.6,
                            }}
                            title={`${marker.label}: ${formatDate(marker.date)}`}
                          />
                        );
                      })}

                      {/* Operation blocks */}
                      {job.operations.map((op) => {
                        const left = dayOffset(op.startDate) * 12;
                        const width = daySpan(op.startDate, op.endDate) * 12;
                        let bgColor: string;
                        if (op.status === "COMPLETED") {
                          bgColor = "bg-emerald-500";
                        } else if (op.status === "IN_PROGRESS") {
                          bgColor = "bg-blue-500";
                        } else if (new Date(op.endDate) < new Date() && todayStr > op.endDate) {
                          bgColor = "bg-red-500";
                        } else {
                          bgColor = "bg-gray-300 dark:bg-gray-600";
                        }
                        return (
                          <div
                            key={op.id}
                            className={`absolute rounded-sm ${bgColor} text-white text-[9px] leading-[18px] px-0.5 overflow-hidden whitespace-nowrap`}
                            style={{
                              left: `${left}px`,
                              width: `${Math.max(width, 12)}px`,
                              top: "19px",
                              height: "18px",
                            }}
                            title={`${(OPERATIONS as any)[op.operationType] ?? op.operationType} (${op.status})\n${formatDate(op.startDate)} - ${formatDate(op.endDate)}`}
                          >
                            {width >= 36
                              ? (OPERATIONS as any)[op.operationType] ?? op.operationType
                              : ((OPERATIONS as any)[op.operationType] ?? "?")[0]}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ═══════════════════════════════════════════════════════
          Tab 6: Design & Files
          ═══════════════════════════════════════════════════════ */}
      {activeTab === "design" && (
        <div className="space-y-6">
          {/* Design Brief */}
          <Card>
            <CardHeader>
              <CardTitle>Design Brief</CardTitle>
            </CardHeader>
            <CardContent>
              {project.designBrief ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Summary</p>
                    <p className="mt-1 text-sm">{project.designBrief.summary}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Rooms</p>
                    <div className="mt-1 flex gap-2">
                      {project.designBrief.rooms.map((room) => (
                        <Badge key={room} variant="outline">
                          {room}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Notes</p>
                    <p className="mt-1 text-sm">{project.designBrief.notes}</p>
                  </div>
                </div>
              ) : (
                <p className="py-4 text-center text-muted-foreground">
                  No design brief has been created for this project.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Cabinet Vision Imports */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Cabinet Vision Imports</CardTitle>
              <Button size="sm" variant="outline" onClick={() => setShowImportCV(true)}>
                Import CV File
              </Button>
            </CardHeader>
            <CardContent>
              {project.cabinetVisionImports.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">
                  No Cabinet Vision imports yet.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                          File Name
                        </th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                          Import Date
                        </th>
                        <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                          Labour Hours
                        </th>
                        <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                          Items
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {project.cabinetVisionImports.map((cv) => (
                        <tr
                          key={cv.id}
                          className="border-b hover:bg-muted/50 transition-colors"
                        >
                          <td className="px-4 py-3 font-mono text-sm">{cv.fileName}</td>
                          <td className="px-4 py-3">{formatDate(cv.importDate)}</td>
                          <td className="px-4 py-3 text-right font-medium">
                            {cv.totalLabourHours}h
                          </td>
                          <td className="px-4 py-3 text-right">{cv.itemCount}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-muted/30">
                        <td colSpan={2} className="px-4 py-3 font-semibold">
                          Total
                        </td>
                        <td className="px-4 py-3 text-right font-semibold">
                          {project.cabinetVisionImports.reduce(
                            (s, cv) => s + cv.totalLabourHours,
                            0
                          )}
                          h
                        </td>
                        <td className="px-4 py-3 text-right font-semibold">
                          {project.cabinetVisionImports.reduce(
                            (s, cv) => s + cv.itemCount,
                            0
                          )}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* File Upload Area */}
          <Card>
            <CardHeader>
              <CardTitle>Project Files</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 px-6 py-12">
                <div className="text-4xl text-muted-foreground/50 mb-3">&#128196;</div>
                <p className="text-sm font-medium text-muted-foreground">
                  Drag and drop files here, or click to browse
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Supports PDFs, images, CAD files, and spreadsheets
                </p>
                <Button variant="outline" size="sm" className="mt-4">
                  Browse Files
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          Modals
          ═══════════════════════════════════════════════════════ */}

      {/* ── Change Status Modal ─────────────────────────────── */}
      <Modal
        isOpen={showStatusChange}
        onClose={() => setShowStatusChange(false)}
        title="Change Project Status"
        description="Update the current status of this project."
      >
        <div className="space-y-4">
          <Select
            options={PROJECT_STATUSES}
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowStatusChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                // updateStatusMutation.mutate({ id: project.id, status: newStatus });
                alert(`Status changed to: ${newStatus}`);
                setShowStatusChange(false);
              }}
            >
              Update Status
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Add Job Modal ───────────────────────────────────── */}
      <Modal
        isOpen={showAddJob}
        onClose={() => setShowAddJob(false)}
        title="Add Job to Project"
        description="Create a new production job for this project. Backward scheduling dates are calculated automatically from the install date."
        className="max-w-2xl"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            // addJobMutation.mutate({
            //   projectId: project.id,
            //   description: jobForm.description,
            //   operations: jobForm.operations,
            //   estimatedHours: parseFloat(jobForm.estimatedHours) || undefined,
            //   materialCost: parseFloat(jobForm.materialCost) || 0,
            //   labourCost: parseFloat(jobForm.labourCost) || 0,
            //   labourHours: parseFloat(jobForm.labourHours) || 0,
            //   hardwareCost: parseFloat(jobForm.hardwareCost) || 0,
            //   margin: parseFloat(jobForm.margin) || 0,
            //   sellPrice: parseFloat(jobForm.sellPrice) || computedSellPrice,
            //   installDate: jobForm.installDate ? new Date(jobForm.installDate) : undefined,
            // });
            alert("Job created (sample)");
            setShowAddJob(false);
          }}
          className="space-y-4"
        >
          <Input
            label="Description"
            value={jobForm.description}
            onChange={(e) => setJobForm({ ...jobForm, description: e.target.value })}
            placeholder="e.g. Kitchen Base Cabinets (x12)"
            required
          />

          {/* Operations checkboxes */}
          <div>
            <label className="mb-1.5 block text-sm font-medium">Operations</label>
            <div className="grid grid-cols-3 gap-2">
              {OPERATION_OPTIONS.map((op) => (
                <label
                  key={op.value}
                  className="flex items-center gap-2 rounded border p-2 text-xs cursor-pointer hover:bg-muted/50"
                >
                  <input
                    type="checkbox"
                    checked={jobForm.operations.includes(op.value)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setJobForm({
                          ...jobForm,
                          operations: [...jobForm.operations, op.value],
                        });
                      } else {
                        setJobForm({
                          ...jobForm,
                          operations: jobForm.operations.filter((o) => o !== op.value),
                        });
                      }
                    }}
                    className="rounded"
                  />
                  {op.label}
                </label>
              ))}
            </div>
          </div>

          <Input
            label="Estimated Hours"
            type="number"
            step="0.5"
            value={jobForm.estimatedHours}
            onChange={(e) => setJobForm({ ...jobForm, estimatedHours: e.target.value })}
            placeholder="Total estimated workshop hours"
          />

          {/* Pricing fields */}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Material Cost ($)"
              type="number"
              step="0.01"
              value={jobForm.materialCost}
              onChange={(e) => setJobForm({ ...jobForm, materialCost: e.target.value })}
              placeholder="0.00"
            />
            <Input
              label="Labour Cost ($)"
              type="number"
              step="0.01"
              value={jobForm.labourCost}
              onChange={(e) => setJobForm({ ...jobForm, labourCost: e.target.value })}
              placeholder="0.00"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Labour Hours"
              type="number"
              step="0.5"
              value={jobForm.labourHours}
              onChange={(e) => setJobForm({ ...jobForm, labourHours: e.target.value })}
              placeholder="0"
            />
            <Input
              label="Hardware Cost ($)"
              type="number"
              step="0.01"
              value={jobForm.hardwareCost}
              onChange={(e) => setJobForm({ ...jobForm, hardwareCost: e.target.value })}
              placeholder="0.00"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Margin (%)"
              type="number"
              step="1"
              value={jobForm.margin}
              onChange={(e) => setJobForm({ ...jobForm, margin: e.target.value })}
              placeholder="35"
            />
            <Input
              label="Sell Price ($)"
              type="number"
              step="0.01"
              value={jobForm.sellPrice}
              onChange={(e) => setJobForm({ ...jobForm, sellPrice: e.target.value })}
              placeholder={computedSellPrice > 0 ? computedSellPrice.toFixed(2) : "0.00"}
            />
          </div>
          {computedSellPrice > 0 && !jobForm.sellPrice && (
            <p className="text-xs text-muted-foreground">
              Calculated sell price at {jobForm.margin || 35}% margin:{" "}
              {formatCurrency(computedSellPrice)}
            </p>
          )}

          {/* Install date with backward scheduling */}
          <Input
            label="Install Date"
            type="date"
            value={jobForm.installDate}
            onChange={(e) => setJobForm({ ...jobForm, installDate: e.target.value })}
          />

          {computedDates && (
            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Backward Scheduling (calculated from install date)
              </p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Material Order By:</span>{" "}
                  <span className="font-medium">{formatDate(computedDates.materialOrderBy)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Production Start:</span>{" "}
                  <span className="font-medium">{formatDate(computedDates.productionStart)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">QC Date:</span>{" "}
                  <span className="font-medium">{formatDate(computedDates.qc)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Delivery:</span>{" "}
                  <span className="font-medium">{formatDate(computedDates.delivery)}</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => setShowAddJob(false)}>
              Cancel
            </Button>
            <Button type="submit">Create Job</Button>
          </div>
        </form>
      </Modal>

      {/* ── Add Milestone Modal ─────────────────────────────── */}
      <Modal
        isOpen={showAddMilestone}
        onClose={() => setShowAddMilestone(false)}
        title="Add Invoicing Milestone"
        description="Plan a new invoicing milestone for this project."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            // addMilestoneMutation.mutate({
            //   projectId: project.id,
            //   milestone: milestoneForm.milestone,
            //   amount: parseFloat(milestoneForm.amount) || 0,
            //   plannedDate: new Date(milestoneForm.plannedDate),
            // });
            alert("Milestone added (sample)");
            setShowAddMilestone(false);
            setMilestoneForm({ milestone: "", amount: "", plannedDate: "" });
          }}
          className="space-y-4"
        >
          <Input
            label="Milestone Name"
            value={milestoneForm.milestone}
            onChange={(e) =>
              setMilestoneForm({ ...milestoneForm, milestone: e.target.value })
            }
            placeholder="e.g. Production Complete (30%)"
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Amount ($)"
              type="number"
              step="0.01"
              value={milestoneForm.amount}
              onChange={(e) =>
                setMilestoneForm({ ...milestoneForm, amount: e.target.value })
              }
              placeholder="0.00"
              required
            />
            <Input
              label="Planned Date"
              type="date"
              value={milestoneForm.plannedDate}
              onChange={(e) =>
                setMilestoneForm({ ...milestoneForm, plannedDate: e.target.value })
              }
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              type="button"
              onClick={() => setShowAddMilestone(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Add Milestone</Button>
          </div>
        </form>
      </Modal>

      {/* ── Import CV File Modal ────────────────────────────── */}
      <Modal
        isOpen={showImportCV}
        onClose={() => setShowImportCV(false)}
        title="Import Cabinet Vision File"
        description="Upload a Cabinet Vision export file (.cvm) to import job items and labour hours."
      >
        <div className="space-y-4">
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 p-8">
            <p className="text-sm font-medium text-muted-foreground">
              Drag and drop a .cvm file, or click to browse
            </p>
            <Button variant="outline" size="sm" className="mt-3">
              Choose File
            </Button>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Link to Job (optional)</label>
            <Select
              options={project.jobs.map((j) => ({
                value: j.id,
                label: `${j.jobNumber} -- ${j.description}`,
              }))}
              placeholder="Select a job..."
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowImportCV(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                // importCVMutation.mutate({ projectId: project.id, file: ... });
                alert("CV file imported (sample)");
                setShowImportCV(false);
              }}
            >
              Import
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

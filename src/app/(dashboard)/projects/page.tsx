"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Plus, Search, X } from "lucide-react";

const PROJECT_STATUSES = [
  "PLANNING", "DESIGN", "QUOTING", "APPROVED", "IN_PRODUCTION",
  "ON_HOLD", "READY_FOR_DELIVERY", "INSTALLING", "COMPLETED", "CANCELLED",
] as const;

type ProjectStatus = (typeof PROJECT_STATUSES)[number];
type BadgeVariant = "default" | "secondary" | "destructive" | "outline" | "success" | "warning";

const statusBadgeColor: Record<ProjectStatus, string> = {
  PLANNING: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  DESIGN: "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400",
  QUOTING: "bg-yellow-50 text-yellow-600 dark:bg-yellow-950/40 dark:text-yellow-400",
  APPROVED: "bg-green-50 text-green-600 dark:bg-green-950/40 dark:text-green-400",
  IN_PRODUCTION: "bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400",
  ON_HOLD: "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400",
  READY_FOR_DELIVERY: "bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400",
  INSTALLING: "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400",
  COMPLETED: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400",
  CANCELLED: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
};

const statusBadgeVariant: Record<ProjectStatus, BadgeVariant> = {
  PLANNING: "secondary", DESIGN: "default", QUOTING: "warning",
  APPROVED: "success", IN_PRODUCTION: "warning", ON_HOLD: "destructive",
  READY_FOR_DELIVERY: "secondary", INSTALLING: "default",
  COMPLETED: "success", CANCELLED: "destructive",
};

const PROJECT_TYPES = [
  { value: "RESIDENTIAL", label: "Residential" },
  { value: "COMMERCIAL", label: "Commercial" },
  { value: "RENOVATION", label: "Renovation" },
  { value: "NEW_BUILD", label: "New Build" },
  { value: "FIT_OUT", label: "Fit-Out" },
  { value: "OTHER", label: "Other" },
];

const PRIORITY_OPTIONS = [
  { value: "LOW", label: "Low" },
  { value: "NORMAL", label: "Normal" },
  { value: "HIGH", label: "High" },
  { value: "URGENT", label: "Urgent" },
];

const SAMPLE_COMPANIES = [
  { id: "comp-1", name: "Harrison Builders Ltd" },
  { id: "comp-2", name: "Coastal Developments" },
  { id: "comp-3", name: "Smith & Wyatt Architecture" },
  { id: "comp-4", name: "Prestige Homes NZ" },
  { id: "comp-5", name: "Greenfield Commercial" },
];

const SAMPLE_CONTACTS = [
  { id: "cont-1", name: "James Harrison", companyId: "comp-1" },
  { id: "cont-2", name: "Sarah Mitchell", companyId: "comp-2" },
  { id: "cont-3", name: "David Wyatt", companyId: "comp-3" },
  { id: "cont-4", name: "Rachel Chen", companyId: "comp-4" },
  { id: "cont-5", name: "Tom Greenfield", companyId: "comp-5" },
];

interface SampleProject {
  id: string;
  projectNumber: string;
  name: string;
  companyName: string;
  status: ProjectStatus;
  projectType: string;
  targetDate: string;
  totalBudget: number;
  totalQuoted: number;
  totalInvoiced: number;
  jobsCount: number;
  managerName: string;
}

const SAMPLE_PROJECTS: SampleProject[] = [
  { id: "prj-1", projectNumber: "PRJ-0001", name: "Waterfront Apartment Kitchen & Bathrooms", companyName: "Harrison Builders Ltd", status: "IN_PRODUCTION", projectType: "RENOVATION", targetDate: "2026-04-15", totalBudget: 85000, totalQuoted: 78500, totalInvoiced: 32000, jobsCount: 4, managerName: "Mike Thompson" },
  { id: "prj-2", projectNumber: "PRJ-0002", name: "Coastal Retreat – Full Joinery Package", companyName: "Coastal Developments", status: "APPROVED", projectType: "NEW_BUILD", targetDate: "2026-06-30", totalBudget: 210000, totalQuoted: 195000, totalInvoiced: 0, jobsCount: 12, managerName: "Sarah Williams" },
  { id: "prj-3", projectNumber: "PRJ-0003", name: "Smith & Wyatt Office Fit-Out", companyName: "Smith & Wyatt Architecture", status: "DESIGN", projectType: "FIT_OUT", targetDate: "2026-05-20", totalBudget: 120000, totalQuoted: 0, totalInvoiced: 0, jobsCount: 0, managerName: "Mike Thompson" },
  { id: "prj-4", projectNumber: "PRJ-0004", name: "Prestige Homes Show Home", companyName: "Prestige Homes NZ", status: "QUOTING", projectType: "NEW_BUILD", targetDate: "2026-08-01", totalBudget: 150000, totalQuoted: 142000, totalInvoiced: 0, jobsCount: 0, managerName: "Sarah Williams" },
  { id: "prj-5", projectNumber: "PRJ-0005", name: "Greenfield Tower – Levels 1-3 Joinery", companyName: "Greenfield Commercial", status: "PLANNING", projectType: "COMMERCIAL", targetDate: "2026-10-01", totalBudget: 540000, totalQuoted: 0, totalInvoiced: 0, jobsCount: 0, managerName: "Mike Thompson" },
  { id: "prj-6", projectNumber: "PRJ-0006", name: "Mitchell Residence – Kitchen Remodel", companyName: "Coastal Developments", status: "COMPLETED", projectType: "RESIDENTIAL", targetDate: "2026-01-15", totalBudget: 45000, totalQuoted: 43500, totalInvoiced: 43500, jobsCount: 2, managerName: "Sarah Williams" },
  { id: "prj-7", projectNumber: "PRJ-0007", name: "Harbor View Vanities & Wardrobes", companyName: "Harrison Builders Ltd", status: "READY_FOR_DELIVERY", projectType: "RESIDENTIAL", targetDate: "2026-03-10", totalBudget: 62000, totalQuoted: 58000, totalInvoiced: 29000, jobsCount: 3, managerName: "Mike Thompson" },
  { id: "prj-8", projectNumber: "PRJ-0008", name: "CBD Restaurant – Custom Millwork", companyName: "Greenfield Commercial", status: "INSTALLING", projectType: "COMMERCIAL", targetDate: "2026-03-01", totalBudget: 95000, totalQuoted: 91000, totalInvoiced: 68000, jobsCount: 5, managerName: "Sarah Williams" },
  { id: "prj-9", projectNumber: "PRJ-0009", name: "Prestige Homes Lot 42 – Laundry & Mudroom", companyName: "Prestige Homes NZ", status: "ON_HOLD", projectType: "NEW_BUILD", targetDate: "2026-07-15", totalBudget: 28000, totalQuoted: 26500, totalInvoiced: 0, jobsCount: 1, managerName: "Mike Thompson" },
  { id: "prj-10", projectNumber: "PRJ-0010", name: "Old Warehouse Conversion – Cabinetry", companyName: "Smith & Wyatt Architecture", status: "CANCELLED", projectType: "RENOVATION", targetDate: "2026-09-01", totalBudget: 175000, totalQuoted: 168000, totalInvoiced: 0, jobsCount: 0, managerName: "Sarah Williams" },
];

function StatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <Badge variant={statusBadgeVariant[status]} className={statusBadgeColor[status]}>
      {status.replace(/_/g, " ")}
    </Badge>
  );
}

function formatProjectType(type: string): string {
  return PROJECT_TYPES.find((t) => t.value === type)?.label ?? type.replace(/_/g, " ");
}

const EMPTY_FORM = {
  name: "", companyId: "", contactId: "", projectType: "",
  priority: "NORMAL", startDate: "", targetDate: "",
  siteAddress: "", siteCity: "", sitePostcode: "",
  totalBudget: "", description: "",
};

export default function ProjectsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const filteredProjects = SAMPLE_PROJECTS.filter((p) => {
    if (search) {
      const q = search.toLowerCase();
      if (!p.name.toLowerCase().includes(q) && !p.projectNumber.toLowerCase().includes(q)) return false;
    }
    if (statusFilter && p.status !== statusFilter) return false;
    if (typeFilter && p.projectType !== typeFilter) return false;
    return true;
  });

  const filteredContacts = form.companyId
    ? SAMPLE_CONTACTS.filter((c) => c.companyId === form.companyId)
    : SAMPLE_CONTACTS;

  const columns = [
    {
      key: "projectNumber",
      header: "Project #",
      render: (p: SampleProject) => (
        <span className="font-mono text-[12px] font-semibold text-muted-foreground">{p.projectNumber}</span>
      ),
    },
    {
      key: "name",
      header: "Project Name",
      render: (p: SampleProject) => (
        <div>
          <p className="font-medium text-foreground">{p.name}</p>
          <p className="text-[12px] text-muted-foreground">{p.companyName}</p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (p: SampleProject) => <StatusBadge status={p.status} />,
    },
    {
      key: "projectType",
      header: "Type",
      render: (p: SampleProject) => (
        <span className="text-muted-foreground">{formatProjectType(p.projectType)}</span>
      ),
    },
    {
      key: "targetDate",
      header: "Target Date",
      render: (p: SampleProject) => p.targetDate ? formatDate(p.targetDate) : "\u2014",
    },
    {
      key: "budget",
      header: "Budget",
      className: "text-right",
      render: (p: SampleProject) => (
        <div className="text-right">
          <div className="font-semibold">{formatCurrency(p.totalBudget)}</div>
          <div className="text-[11px] text-muted-foreground">
            Q: {formatCurrency(p.totalQuoted)} / I: {formatCurrency(p.totalInvoiced)}
          </div>
        </div>
      ),
    },
    {
      key: "jobsCount",
      header: "Jobs",
      render: (p: SampleProject) => <span className="text-muted-foreground">{p.jobsCount}</span>,
    },
  ];

  function updateForm(field: string, value: string) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
      ...(field === "companyId" ? { contactId: "" } : {}),
    }));
  }

  function handleCreateSubmit(e: React.FormEvent) {
    e.preventDefault();
    console.log("New project form submitted:", form);
    setShowCreate(false);
    setForm({ ...EMPTY_FORM });
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Projects"
        description="Manage projects from lead through to completion."
        helpText="View all your projects with their timelines, budgets, and progress — click any row to see full project details and linked orders."
        actions={
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="mr-1.5 h-4 w-4" /> New Project
          </Button>
        }
      />

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-xl border-0 bg-muted/60 pl-9 pr-3 text-[13px] placeholder:text-muted-foreground/50 focus:bg-muted focus:outline-none focus:ring-2 focus:ring-ring/20 transition-smooth"
          />
        </div>

        <Select
          options={PROJECT_STATUSES.map((s) => ({ value: s, label: s.replace(/_/g, " ") }))}
          placeholder="All Statuses"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-44"
        />

        <Select
          options={PROJECT_TYPES}
          placeholder="All Types"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="w-40"
        />

        {(search || statusFilter || typeFilter) && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setStatusFilter(""); setTypeFilter(""); }}>
            <X className="mr-1 h-3.5 w-3.5" /> Clear
          </Button>
        )}

        <span className="ml-auto text-[13px] text-muted-foreground">
          {filteredProjects.length} project{filteredProjects.length !== 1 ? "s" : ""}
        </span>
      </div>

      <DataTable
        columns={columns}
        data={filteredProjects}
        loading={false}
        emptyMessage="No projects found. Adjust your filters or create your first project to get started."
        onRowClick={(p) => router.push(`/projects/${p.id}`)}
      />

      <Modal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="New Project"
        description="Create a new project to track joinery work from design through to installation."
        className="max-w-2xl"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <Input label="Project Name" placeholder="e.g. Waterfront Apartment Kitchen & Bathrooms" value={form.name} onChange={(e) => updateForm("name", e.target.value)} required />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Company</label>
              <Select options={SAMPLE_COMPANIES.map((c) => ({ value: c.id, label: c.name }))} placeholder="Select company..." value={form.companyId} onChange={(e) => updateForm("companyId", e.target.value)} />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Contact</label>
              <Select options={filteredContacts.map((c) => ({ value: c.id, label: c.name }))} placeholder="Select contact..." value={form.contactId} onChange={(e) => updateForm("contactId", e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Project Type</label>
              <Select options={PROJECT_TYPES} placeholder="Select type..." value={form.projectType} onChange={(e) => updateForm("projectType", e.target.value)} />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Priority</label>
              <Select options={PRIORITY_OPTIONS} value={form.priority} onChange={(e) => updateForm("priority", e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Start Date" type="date" value={form.startDate} onChange={(e) => updateForm("startDate", e.target.value)} />
            <Input label="Target Date" type="date" value={form.targetDate} onChange={(e) => updateForm("targetDate", e.target.value)} />
          </div>
          <Input label="Site Address" placeholder="123 Example Street" value={form.siteAddress} onChange={(e) => updateForm("siteAddress", e.target.value)} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="City" placeholder="Auckland" value={form.siteCity} onChange={(e) => updateForm("siteCity", e.target.value)} />
            <Input label="Postcode" placeholder="1010" value={form.sitePostcode} onChange={(e) => updateForm("sitePostcode", e.target.value)} />
          </div>
          <Input label="Total Budget" type="number" min="0" step="0.01" placeholder="0.00" value={form.totalBudget} onChange={(e) => updateForm("totalBudget", e.target.value)} />
          <Textarea label="Description" placeholder="Brief description of the project scope..." value={form.description} onChange={(e) => updateForm("description", e.target.value)} rows={3} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit">Create Project</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

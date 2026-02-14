"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/tabs";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/utils";
import { PROJECT_TYPES } from "@/lib/constants";

const LEAD_SOURCES = [
  { value: "WEBSITE", label: "Website" },
  { value: "REFERRAL_ARCHITECT", label: "Referral - Architect" },
  { value: "REFERRAL_BUILDER", label: "Referral - Builder" },
  { value: "REFERRAL_CLIENT", label: "Referral - Client" },
  { value: "TRADE_SHOW", label: "Trade Show" },
  { value: "SOCIAL_MEDIA", label: "Social Media" },
  { value: "WALK_IN", label: "Walk In" },
  { value: "PHONE", label: "Phone" },
  { value: "EMAIL", label: "Email" },
  { value: "ADVERTISING", label: "Advertising" },
  { value: "OTHER", label: "Other" },
];

const STATUS_TABS = [
  { key: "all", label: "All" },
  { key: "NEW", label: "New" },
  { key: "CONTACTED", label: "Contacted" },
  { key: "QUALIFIED", label: "Qualified" },
  { key: "CONVERTED", label: "Converted" },
  { key: "LOST", label: "Lost" },
];

const statusBadge: Record<string, "default" | "secondary" | "success" | "warning" | "destructive" | "outline"> = {
  NEW: "default",
  CONTACTED: "secondary",
  QUALIFIED: "success",
  UNQUALIFIED: "warning",
  CONVERTED: "success",
  LOST: "destructive",
};

export default function LeadsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    source: "WEBSITE" as string,
    estimatedValue: "",
    projectType: "",
    address: "",
    city: "",
    postcode: "",
  });

  const { data, isLoading, refetch } = trpc.crm.listLeads.useQuery({
    status: activeTab === "all" ? undefined : (activeTab as any),
    page: 1,
    pageSize: 50,
  });

  const createMutation = trpc.crm.createLead.useMutation({
    onSuccess: () => {
      setShowCreate(false);
      setForm({ title: "", description: "", source: "WEBSITE", estimatedValue: "", projectType: "", address: "", city: "", postcode: "" });
      refetch();
    },
  });

  const columns = [
    {
      key: "title",
      header: "Lead",
      render: (l: any) => (
        <div>
          <div className="font-medium">{l.title}</div>
          {l.contact && (
            <div className="text-xs text-muted-foreground">
              {l.contact.firstName} {l.contact.lastName}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (l: any) => (
        <Badge variant={statusBadge[l.status] ?? "secondary"}>{l.status}</Badge>
      ),
    },
    {
      key: "source",
      header: "Source",
      render: (l: any) =>
        LEAD_SOURCES.find((s) => s.value === l.source)?.label ?? l.source,
    },
    {
      key: "projectType",
      header: "Project Type",
      render: (l: any) =>
        l.projectType ? (PROJECT_TYPES as any)[l.projectType] ?? l.projectType : "—",
    },
    {
      key: "estimatedValue",
      header: "Est. Value",
      className: "text-right",
      render: (l: any) =>
        l.estimatedValue ? formatCurrency(Number(l.estimatedValue)) : "—",
    },
    {
      key: "assignedTo",
      header: "Assigned To",
      render: (l: any) => l.assignedTo?.name ?? "Unassigned",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leads"
        description="Track and qualify incoming enquiries."
        actions={
          <Button onClick={() => setShowCreate(true)}>+ New Lead</Button>
        }
      />

      <Tabs
        tabs={STATUS_TABS.map((t) => ({
          ...t,
          count: t.key === "all" ? data?.total : undefined,
        }))}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      <DataTable
        columns={columns}
        data={data?.leads ?? []}
        loading={isLoading}
        emptyMessage="No leads found. Create your first lead to start tracking enquiries."
        onRowClick={(l) => router.push("/crm/leads/" + l.id)}
      />

      <Modal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="New Lead"
        description="Capture a new enquiry."
        className="max-w-xl"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate({
              title: form.title,
              description: form.description || undefined,
              source: form.source as any,
              estimatedValue: form.estimatedValue ? Number(form.estimatedValue) : undefined,
              projectType: form.projectType ? (form.projectType as any) : undefined,
              address: form.address || undefined,
              city: form.city || undefined,
              postcode: form.postcode || undefined,
            });
          }}
          className="space-y-4"
        >
          <Input
            label="Lead Title"
            placeholder="e.g. Kitchen renovation - Smith residence"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />
          <Textarea
            label="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Details about the enquiry..."
          />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Source</label>
              <Select
                options={LEAD_SOURCES}
                value={form.source}
                onChange={(e) => setForm({ ...form, source: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Project Type</label>
              <Select
                options={Object.entries(PROJECT_TYPES).map(([k, v]) => ({ value: k, label: v }))}
                value={form.projectType}
                onChange={(e) => setForm({ ...form, projectType: e.target.value })}
                placeholder="Select type..."
              />
            </div>
          </div>
          <Input
            label="Estimated Value ($)"
            type="number"
            value={form.estimatedValue}
            onChange={(e) => setForm({ ...form, estimatedValue: e.target.value })}
            placeholder="0.00"
          />
          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Address"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="col-span-1"
            />
            <Input
              label="City"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
            />
            <Input
              label="Postcode"
              value={form.postcode}
              onChange={(e) => setForm({ ...form, postcode: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create Lead"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

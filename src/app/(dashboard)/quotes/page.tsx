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
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Plus } from "lucide-react";

const STATUS_TABS = [
  { key: "all", label: "All" },
  { key: "DRAFT", label: "Draft" },
  { key: "SENT", label: "Sent" },
  { key: "APPROVED", label: "Approved" },
  { key: "REJECTED", label: "Rejected" },
  { key: "CONVERTED", label: "Converted" },
];

const statusVariant: Record<string, "default" | "secondary" | "success" | "warning" | "destructive" | "outline"> = {
  DRAFT: "secondary",
  SENT: "default",
  VIEWED: "outline",
  APPROVED: "success",
  REJECTED: "destructive",
  EXPIRED: "warning",
  REVISED: "outline",
  CONVERTED: "success",
};

export default function QuotesPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: "", description: "" });

  const { data, isLoading, refetch } = trpc.quotes.list.useQuery({
    status: activeTab === "all" ? undefined : (activeTab as any),
    page: 1,
    pageSize: 50,
  });

  const createMutation = trpc.quotes.create.useMutation({
    onSuccess: (quote) => {
      setShowCreate(false);
      setForm({ title: "", description: "" });
      refetch();
      router.push("/quotes/" + quote.id);
    },
  });

  const columns = [
    {
      key: "quoteNumber",
      header: "Quote #",
      render: (q: any) => (
        <span className="font-mono text-[12px] font-semibold text-muted-foreground">{q.quoteNumber}</span>
      ),
    },
    {
      key: "title",
      header: "Title",
      render: (q: any) => (
        <div>
          <div className="font-medium">{q.title}</div>
          {q.company && (
            <div className="text-[12px] text-muted-foreground">{q.company.name}</div>
          )}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (q: any) => (
        <Badge variant={statusVariant[q.status] ?? "secondary"}>{q.status}</Badge>
      ),
    },
    {
      key: "lineItems",
      header: "Items",
      render: (q: any) => <span className="text-muted-foreground">{q._count?.lineItems ?? 0}</span>,
    },
    {
      key: "total",
      header: "Total",
      className: "text-right",
      render: (q: any) => (
        <span className="font-semibold">{formatCurrency(Number(q.total))}</span>
      ),
    },
    {
      key: "createdAt",
      header: "Created",
      render: (q: any) => <span className="text-muted-foreground">{formatDate(q.createdAt)}</span>,
    },
    {
      key: "createdBy",
      header: "By",
      render: (q: any) => <span className="text-muted-foreground">{q.createdBy?.name ?? "\u2014"}</span>,
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Quotes"
        description="Create and manage customer quotes with detailed pricing."
        actions={
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="mr-1.5 h-4 w-4" /> New Quote
          </Button>
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
        data={data?.quotes ?? []}
        loading={isLoading}
        emptyMessage="No quotes yet. Create your first quote to start pricing jobs."
        onRowClick={(q) => router.push("/quotes/" + q.id)}
      />

      <Modal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="New Quote"
        description="Start a new quote for a customer."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate({
              title: form.title,
              description: form.description || undefined,
            });
          }}
          className="space-y-4"
        >
          <Input
            label="Quote Title"
            placeholder="e.g. Kitchen \u2014 Smith Residence"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />
          <Textarea
            label="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Brief description of the work..."
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create Quote"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

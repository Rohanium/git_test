"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/tabs";
import { StatCard } from "@/components/ui/stat-card";
import { formatCurrency, formatDate } from "@/lib/utils";

const STATUS_TABS = [
  { key: "all", label: "All" },
  { key: "DRAFT", label: "Draft" },
  { key: "SENT", label: "Sent" },
  { key: "PARTIALLY_PAID", label: "Partial" },
  { key: "PAID", label: "Paid" },
  { key: "OVERDUE", label: "Overdue" },
];

const statusVariant: Record<string, any> = {
  DRAFT: "secondary",
  SENT: "default",
  VIEWED: "outline",
  PARTIALLY_PAID: "warning",
  PAID: "success",
  OVERDUE: "destructive",
  CANCELLED: "secondary",
  VOID: "secondary",
};

export default function InvoicesPage() {
  const [activeTab, setActiveTab] = useState("all");

  const { data, isLoading } = trpc.finance.listInvoices.useQuery({
    status: activeTab === "all" ? undefined : (activeTab as any),
    page: 1,
    pageSize: 50,
  });

  const { data: dashboard } = trpc.finance.dashboardSummary.useQuery();

  const columns = [
    {
      key: "invoiceNumber",
      header: "Invoice #",
      render: (inv: any) => <span className="font-mono text-sm font-medium">{inv.invoiceNumber}</span>,
    },
    {
      key: "customer",
      header: "Customer",
      render: (inv: any) => inv.order?.company?.name ?? "—",
    },
    {
      key: "type",
      header: "Type",
      render: (inv: any) => <Badge variant="outline">{inv.type}</Badge>,
    },
    {
      key: "status",
      header: "Status",
      render: (inv: any) => <Badge variant={statusVariant[inv.status] ?? "secondary"}>{inv.status.replace(/_/g, " ")}</Badge>,
    },
    {
      key: "total",
      header: "Total",
      className: "text-right",
      render: (inv: any) => <span className="font-semibold">{formatCurrency(Number(inv.total))}</span>,
    },
    {
      key: "amountPaid",
      header: "Paid",
      className: "text-right",
      render: (inv: any) => formatCurrency(Number(inv.amountPaid)),
    },
    {
      key: "dueDate",
      header: "Due",
      render: (inv: any) => {
        const isOverdue = new Date(inv.dueDate) < new Date() && !["PAID", "CANCELLED", "VOID"].includes(inv.status);
        return (
          <span className={isOverdue ? "font-medium text-destructive" : ""}>
            {formatDate(inv.dueDate)}
          </span>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Invoices" description="Manage customer invoices and track payments." />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="Month Revenue"
          value={formatCurrency(dashboard?.monthRevenue ?? 0)}
          description="Payments received this month"
        />
        <StatCard
          title="Outstanding"
          value={formatCurrency(dashboard?.outstandingReceivables ?? 0)}
          description="Total receivables"
        />
        <StatCard
          title="Month Expenses"
          value={formatCurrency(dashboard?.monthExpenses ?? 0)}
          description="Supplier costs this month"
        />
      </div>

      <Tabs
        tabs={STATUS_TABS.map((t) => ({ ...t, count: t.key === "all" ? data?.total : undefined }))}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      <DataTable
        columns={columns}
        data={data?.invoices ?? []}
        loading={isLoading}
        emptyMessage="No invoices yet."
      />
    </div>
  );
}

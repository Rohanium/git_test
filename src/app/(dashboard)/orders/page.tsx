"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/tabs";
import { formatCurrency, formatDate } from "@/lib/utils";
import { JOB_STATUSES } from "@/lib/constants";

const STATUS_TABS = [
  { key: "all", label: "All" },
  { key: "CONFIRMED", label: "Confirmed" },
  { key: "IN_PRODUCTION", label: "In Production" },
  { key: "READY_FOR_DELIVERY", label: "Ready" },
  { key: "DELIVERED", label: "Delivered" },
  { key: "COMPLETED", label: "Completed" },
];

const orderStatusVariant: Record<string, any> = {
  CONFIRMED: "default",
  IN_PRODUCTION: "warning",
  ON_HOLD: "destructive",
  READY_FOR_DELIVERY: "success",
  DELIVERED: "success",
  INSTALLED: "success",
  COMPLETED: "success",
  CANCELLED: "destructive",
};

const priorityVariant: Record<string, any> = {
  LOW: "secondary",
  NORMAL: "outline",
  HIGH: "warning",
  URGENT: "destructive",
};

export default function OrdersPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("all");

  const { data, isLoading } = trpc.orders.list.useQuery({
    status: activeTab === "all" ? undefined : (activeTab as any),
    page: 1,
    pageSize: 50,
  });

  const columns = [
    {
      key: "orderNumber",
      header: "Order #",
      render: (o: any) => (
        <span className="font-mono text-sm font-medium">{o.orderNumber}</span>
      ),
    },
    {
      key: "company",
      header: "Customer",
      render: (o: any) => o.company?.name ?? "—",
    },
    {
      key: "status",
      header: "Status",
      render: (o: any) => (
        <Badge variant={orderStatusVariant[o.status] ?? "secondary"}>
          {o.status.replace(/_/g, " ")}
        </Badge>
      ),
    },
    {
      key: "priority",
      header: "Priority",
      render: (o: any) => (
        <Badge variant={priorityVariant[o.priority] ?? "outline"}>
          {o.priority}
        </Badge>
      ),
    },
    {
      key: "items",
      header: "Items",
      render: (o: any) => o._count?.orderItems ?? 0,
    },
    {
      key: "jobs",
      header: "Jobs",
      render: (o: any) => o._count?.jobs ?? 0,
    },
    {
      key: "total",
      header: "Total",
      className: "text-right",
      render: (o: any) => (
        <span className="font-semibold">{formatCurrency(Number(o.total))}</span>
      ),
    },
    {
      key: "requiredDate",
      header: "Required",
      render: (o: any) => o.requiredDate ? formatDate(o.requiredDate) : "—",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Orders"
        description="Track confirmed orders through production and delivery."
        helpText="Track all customer orders from confirmation through to completion — use the tabs to filter by status, and click any row to manage jobs, invoices, and deliveries."
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
        data={data?.orders ?? []}
        loading={isLoading}
        emptyMessage="No orders yet. Orders are created when quotes are approved and converted."
        onRowClick={(o) => router.push(`/orders/${o.id}`)}
      />
    </div>
  );
}

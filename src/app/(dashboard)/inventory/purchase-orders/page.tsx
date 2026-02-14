"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/tabs";
import { formatCurrency, formatDate } from "@/lib/utils";

const STATUS_TABS = [
  { key: "all", label: "All" },
  { key: "DRAFT", label: "Draft" },
  { key: "SENT", label: "Sent" },
  { key: "PARTIALLY_RECEIVED", label: "Partial" },
  { key: "RECEIVED", label: "Received" },
];

const statusVariant: Record<string, any> = {
  DRAFT: "secondary",
  SENT: "default",
  ACKNOWLEDGED: "outline",
  PARTIALLY_RECEIVED: "warning",
  RECEIVED: "success",
  CANCELLED: "destructive",
};

export default function PurchaseOrdersPage() {
  const [activeTab, setActiveTab] = useState("all");

  const { data, isLoading } = trpc.inventory.listPurchaseOrders.useQuery({
    status: activeTab === "all" ? undefined : (activeTab as any),
    page: 1,
    pageSize: 50,
  });

  const columns = [
    {
      key: "poNumber",
      header: "PO #",
      render: (po: any) => <span className="font-mono text-sm font-medium">{po.poNumber}</span>,
    },
    {
      key: "supplier",
      header: "Supplier",
      render: (po: any) => po.supplier?.company?.name ?? "—",
    },
    {
      key: "status",
      header: "Status",
      render: (po: any) => <Badge variant={statusVariant[po.status] ?? "secondary"}>{po.status.replace(/_/g, " ")}</Badge>,
    },
    {
      key: "items",
      header: "Items",
      render: (po: any) => po._count?.lineItems ?? 0,
    },
    {
      key: "total",
      header: "Total",
      className: "text-right",
      render: (po: any) => <span className="font-semibold">{formatCurrency(Number(po.total))}</span>,
    },
    {
      key: "expectedDate",
      header: "Expected",
      render: (po: any) => po.expectedDate ? formatDate(po.expectedDate) : "—",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchase Orders"
        description="Track material orders to suppliers."
        helpText="Create and track purchase orders to suppliers — monitor order status from draft through to received, and manage deliveries."
        actions={<Button>+ New PO</Button>}
      />

      <Tabs
        tabs={STATUS_TABS.map((t) => ({ ...t, count: t.key === "all" ? data?.total : undefined }))}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      <DataTable
        columns={columns}
        data={data?.purchaseOrders ?? []}
        loading={isLoading}
        emptyMessage="No purchase orders yet."
      />
    </div>
  );
}

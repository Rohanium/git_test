"use client";

import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { formatCurrency } from "@/lib/utils";

export default function StockPage() {
  const { data: stockSummary, isLoading } = trpc.inventory.stockSummary.useQuery();

  const totalValue = stockSummary?.reduce((s, i) => s + i.totalValue, 0) ?? 0;
  const lowStockCount = stockSummary?.filter((i) => i.isLowStock).length ?? 0;
  const totalItems = stockSummary?.length ?? 0;

  const columns = [
    {
      key: "sku",
      header: "SKU",
      render: (i: any) => <span className="font-mono text-sm">{i.sku}</span>,
    },
    {
      key: "name",
      header: "Material",
      render: (i: any) => <span className="font-medium">{i.name}</span>,
    },
    {
      key: "totalQuantity",
      header: "Quantity",
      className: "text-right",
      render: (i: any) => (
        <span>
          {i.totalQuantity.toFixed(1)} {i.unit}
        </span>
      ),
    },
    {
      key: "totalValue",
      header: "Value",
      className: "text-right",
      render: (i: any) => formatCurrency(i.totalValue),
    },
    {
      key: "reorderPoint",
      header: "Reorder Point",
      className: "text-right",
      render: (i: any) =>
        i.reorderPoint !== null ? `${i.reorderPoint} ${i.unit}` : "—",
    },
    {
      key: "status",
      header: "Status",
      render: (i: any) =>
        i.isLowStock ? (
          <Badge variant="destructive">Low Stock</Badge>
        ) : (
          <Badge variant="success">OK</Badge>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Stock Overview" description="Current inventory levels and stock value." />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="Total Items" value={totalItems} description="Active materials tracked" />
        <StatCard title="Total Value" value={formatCurrency(totalValue)} description="Current stock valuation" />
        <StatCard
          title="Low Stock Alerts"
          value={lowStockCount}
          description="Items below reorder point"
          className={lowStockCount > 0 ? "border-destructive/50" : ""}
        />
      </div>

      <DataTable
        columns={columns}
        data={stockSummary ?? []}
        loading={isLoading}
        emptyMessage="No stock items. Add materials and record stock to see inventory levels."
      />
    </div>
  );
}

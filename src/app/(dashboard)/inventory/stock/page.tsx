"use client";

import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { formatCurrency } from "@/lib/utils";
import { Package, DollarSign, AlertTriangle } from "lucide-react";

export default function StockPage() {
  const router = useRouter();
  const { data: stockSummary, isLoading } = trpc.inventory.stockSummary.useQuery();

  const totalValue = stockSummary?.reduce((s, i) => s + i.totalValue, 0) ?? 0;
  const lowStockCount = stockSummary?.filter((i) => i.isLowStock).length ?? 0;
  const totalItems = stockSummary?.length ?? 0;

  const columns = [
    {
      key: "sku",
      header: "SKU",
      render: (i: any) => <span className="font-mono text-[12px] font-semibold text-muted-foreground">{i.sku}</span>,
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
      render: (i: any) => <span className="text-muted-foreground">{i.totalQuantity.toFixed(1)} {i.unit}</span>,
    },
    {
      key: "totalValue",
      header: "Value",
      className: "text-right",
      render: (i: any) => <span className="font-medium">{formatCurrency(i.totalValue)}</span>,
    },
    {
      key: "reorderPoint",
      header: "Reorder Point",
      className: "text-right",
      render: (i: any) => <span className="text-muted-foreground">{i.reorderPoint !== null ? i.reorderPoint + " " + i.unit : "\u2014"}</span>,
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
    <div className="space-y-5">
      <PageHeader title="Stock Overview" description="Current inventory levels and stock value." />

      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <StatCard title="Total Items" value={totalItems} description="Active materials tracked" icon={<Package className="h-5 w-5" />} />
        <StatCard title="Total Value" value={formatCurrency(totalValue)} description="Current stock valuation" icon={<DollarSign className="h-5 w-5" />} />
        <StatCard
          title="Low Stock Alerts"
          value={lowStockCount}
          description="Items below reorder point"
          className={lowStockCount > 0 ? "ring-1 ring-red-200 dark:ring-red-900" : ""}
          icon={<AlertTriangle className="h-5 w-5" />}
        />
      </div>

      <DataTable columns={columns} data={stockSummary ?? []} loading={isLoading} emptyMessage="No stock items. Add materials and record stock to see inventory levels." onRowClick={(i) => router.push("/inventory/materials/" + i.id)} />
    </div>
  );
}

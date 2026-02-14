"use client";

import { useParams } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatCurrency } from "@/lib/utils";

export default function MaterialDetailPage() {
  const { id } = useParams();
  const { data: material, isLoading } = trpc.inventory.getMaterial.useQuery(id as string);

  if (isLoading) return <div className="flex h-48 items-center justify-center text-muted-foreground">Loading...</div>;
  if (!material) return <div>Material not found.</div>;

  const totalStockQty = material.stockItems?.reduce(
    (sum: number, item: any) => sum + Number(item.quantity ?? 0),
    0
  ) ?? 0;

  const totalStockValue = material.stockItems?.reduce(
    (sum: number, item: any) => sum + Number(item.quantity ?? 0) * Number(item.costPerUnit ?? 0),
    0
  ) ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={material.name}
        description={material.sku ? `SKU: ${material.sku}` : undefined}
        actions={
          material.category ? <Badge variant="secondary">{material.category.name}</Badge> : undefined
        }
      />

      {/* Material Info */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Material Details</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <InfoRow label="SKU" value={material.sku} />
            <InfoRow label="Name" value={material.name} />
            {material.description && <InfoRow label="Description" value={material.description} />}
            {material.unit && <InfoRow label="Unit" value={material.unit} />}
            {material.unitCost != null && <InfoRow label="Unit Cost" value={formatCurrency(Number(material.unitCost))} />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Stock Settings</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {material.minStock != null && <InfoRow label="Min Stock" value={String(material.minStock)} />}
            {material.reorderPoint != null && <InfoRow label="Reorder Point" value={String(material.reorderPoint)} />}
            {material.reorderQty != null && <InfoRow label="Reorder Qty" value={String(material.reorderQty)} />}
            {material.leadTimeDays != null && <InfoRow label="Lead Time (Days)" value={String(material.leadTimeDays)} />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Stock Summary</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <InfoRow label="Total Quantity" value={String(totalStockQty)} />
            <InfoRow label="Total Value" value={formatCurrency(totalStockValue)} />
            <InfoRow label="Stock Locations" value={String(material.stockItems?.length ?? 0)} />
          </CardContent>
        </Card>
      </div>

      {/* Stock Items */}
      {material.stockItems && material.stockItems.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Stock Items</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {material.stockItems.map((item: any) => (
                <div key={item.id} className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <p className="font-medium">{item.location ?? "Default Location"}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">Qty: {String(item.quantity)}</p>
                    {item.costPerUnit != null && (
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(Number(item.costPerUnit))} / unit
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Supplier Materials */}
      {material.supplierMaterials && material.supplierMaterials.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Suppliers</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {material.supplierMaterials.map((sm: any) => (
                <div key={sm.id} className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <p className="font-medium">{sm.supplier?.company?.name ?? "Unknown Supplier"}</p>
                    {sm.supplierSku && (
                      <p className="text-xs text-muted-foreground">Supplier SKU: {sm.supplierSku}</p>
                    )}
                  </div>
                  <div className="text-right">
                    {sm.unitCost != null && (
                      <p className="text-sm font-semibold text-primary">{formatCurrency(Number(sm.unitCost))}</p>
                    )}
                    {sm.leadTimeDays != null && (
                      <p className="text-xs text-muted-foreground">{sm.leadTimeDays} day lead time</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

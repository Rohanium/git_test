"use client";

import { useParams } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatCurrency } from "@/lib/utils";

function renderStars(rating: number) {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    stars.push(
      <span key={i} className={i <= rating ? "text-amber-500" : "text-muted-foreground/30"}>
        ★
      </span>
    );
  }
  return <span className="text-sm">{stars}</span>;
}

export default function SupplierDetailPage() {
  const { id } = useParams();
  const { data: supplier, isLoading } = trpc.inventory.getSupplier.useQuery(id as string);

  if (isLoading) return <div className="flex h-48 items-center justify-center text-muted-foreground">Loading...</div>;
  if (!supplier) return <div>Supplier not found.</div>;

  const company = supplier.company;

  return (
    <div className="space-y-6">
      <PageHeader
        title={company?.name ?? "Supplier"}
        description={
          company
            ? [company.city, company.state].filter(Boolean).join(", ") || undefined
            : undefined
        }
        actions={
          supplier.rating != null
            ? <div className="flex items-center gap-2">{renderStars(Number(supplier.rating))}</div>
            : undefined
        }
      />

      {/* Supplier Info */}
      <div className="grid gap-6 lg:grid-cols-3">
        {company && (
          <Card>
            <CardHeader><CardTitle>Company Details</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <InfoRow label="Name" value={company.name} />
              {company.phone && <InfoRow label="Phone" value={company.phone} />}
              {company.email && <InfoRow label="Email" value={company.email} />}
              {company.website && <InfoRow label="Website" value={company.website} />}
              {(company.city || company.state) && (
                <InfoRow
                  label="Location"
                  value={[company.city, company.state].filter(Boolean).join(", ")}
                />
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle>Supplier Details</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {supplier.paymentTerms && <InfoRow label="Payment Terms" value={supplier.paymentTerms} />}
            {supplier.rating != null && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Rating</span>
                {renderStars(Number(supplier.rating))}
              </div>
            )}
            {supplier.leadTimeDays != null && <InfoRow label="Lead Time (Days)" value={String(supplier.leadTimeDays)} />}
          </CardContent>
        </Card>

        {supplier.notes && (
          <Card>
            <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{supplier.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Supplied Materials */}
      {supplier.supplierMaterials && supplier.supplierMaterials.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Supplied Materials</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {supplier.supplierMaterials.map((sm: any) => (
                <div key={sm.id} className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <p className="font-medium">{sm.material?.name ?? "Unknown Material"}</p>
                    <div className="flex items-center gap-3 mt-1">
                      {sm.material?.sku && (
                        <span className="text-xs text-muted-foreground">SKU: {sm.material.sku}</span>
                      )}
                      {sm.supplierSku && (
                        <span className="text-xs text-muted-foreground">Supplier SKU: {sm.supplierSku}</span>
                      )}
                    </div>
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

      {/* Purchase Orders */}
      {supplier.purchaseOrders && supplier.purchaseOrders.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Purchase Orders</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {supplier.purchaseOrders.map((po: any) => (
                <div key={po.id} className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <p className="font-medium">{po.poNumber}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={
                        po.status === "RECEIVED" ? "success" :
                        po.status === "CANCELLED" ? "destructive" :
                        po.status === "ORDERED" ? "warning" :
                        "secondary"
                      }>
                        {po.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Created {formatDate(po.createdAt)}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    {po.total != null && (
                      <p className="text-sm font-semibold text-primary">{formatCurrency(Number(po.total))}</p>
                    )}
                    {po.expectedDate && (
                      <p className="text-xs text-muted-foreground">Expected {formatDate(po.expectedDate)}</p>
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

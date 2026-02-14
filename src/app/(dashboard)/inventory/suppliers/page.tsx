"use client";

import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function SuppliersPage() {
  const router = useRouter();
  const { data: suppliers, isLoading } = trpc.inventory.listSuppliers.useQuery();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Suppliers"
        description="Manage your material suppliers and their details."
        helpText="Manage your material suppliers — see their product range, purchase order history, and click any card to view full supplier details."
        actions={<Button>+ New Supplier</Button>}
      />

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : !suppliers || suppliers.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <h3 className="text-lg font-semibold">No Suppliers</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Add your timber merchants, hardware suppliers, and paint/finish suppliers.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {suppliers.map((s: any) => (
            <div key={s.id} className="cursor-pointer rounded-lg border bg-card p-5 transition-shadow hover:shadow-md" onClick={() => router.push("/inventory/suppliers/" + s.id)}>
              <h3 className="font-semibold">{s.company.name}</h3>
              {s.company.phone && <p className="mt-1 text-sm text-muted-foreground">{s.company.phone}</p>}
              {s.company.email && <p className="text-sm text-muted-foreground">{s.company.email}</p>}
              <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
                <span>{s._count?.supplierMaterials ?? 0} materials</span>
                <span>{s._count?.purchaseOrders ?? 0} POs</span>
              </div>
              {s.paymentTerms && (
                <Badge variant="outline" className="mt-2">{s.paymentTerms}</Badge>
              )}
              {s.rating && (
                <div className="mt-2 text-xs">
                  {"★".repeat(s.rating)}{"☆".repeat(5 - s.rating)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

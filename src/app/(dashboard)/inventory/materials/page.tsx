"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import { MATERIAL_UNITS } from "@/lib/constants";

export default function MaterialsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    sku: "",
    name: "",
    description: "",
    unit: "sheet",
    unitCost: "",
    minStock: "",
    reorderPoint: "",
    reorderQty: "",
    leadTimeDays: "",
  });

  const { data, isLoading, refetch } = trpc.inventory.listMaterials.useQuery({
    search: search || undefined,
    page: 1,
    pageSize: 50,
  });

  const createMutation = trpc.inventory.createMaterial.useMutation({
    onSuccess: () => {
      setShowCreate(false);
      setForm({ sku: "", name: "", description: "", unit: "sheet", unitCost: "", minStock: "", reorderPoint: "", reorderQty: "", leadTimeDays: "" });
      refetch();
    },
  });

  const columns = [
    {
      key: "sku",
      header: "SKU",
      render: (m: any) => <span className="font-mono text-sm">{m.sku}</span>,
    },
    {
      key: "name",
      header: "Material",
      render: (m: any) => (
        <div>
          <div className="font-medium">{m.name}</div>
          {m.description && <div className="text-xs text-muted-foreground">{m.description}</div>}
        </div>
      ),
    },
    {
      key: "category",
      header: "Category",
      render: (m: any) => m.category?.name ?? "—",
    },
    { key: "unit", header: "Unit" },
    {
      key: "unitCost",
      header: "Unit Cost",
      className: "text-right",
      render: (m: any) => formatCurrency(Number(m.unitCost)),
    },
    {
      key: "suppliers",
      header: "Suppliers",
      render: (m: any) => m._count?.supplierMaterials ?? 0,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Materials"
        description="Manage your material catalogue — timber, board goods, hardware, finishes."
        actions={<Button onClick={() => setShowCreate(true)}>+ New Material</Button>}
      />

      <input
        type="text"
        placeholder="Search materials..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="h-10 w-80 rounded-md border bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />

      <DataTable
        columns={columns}
        data={data?.materials ?? []}
        loading={isLoading}
        emptyMessage="No materials in catalogue. Add your first material to start tracking inventory."
        onRowClick={(m) => router.push("/inventory/materials/" + m.id)}
      />

      <Modal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="New Material"
        description="Add a material to your catalogue."
        className="max-w-xl"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate({
              sku: form.sku,
              name: form.name,
              description: form.description || undefined,
              unit: form.unit,
              unitCost: parseFloat(form.unitCost),
              minStock: form.minStock ? parseFloat(form.minStock) : undefined,
              reorderPoint: form.reorderPoint ? parseFloat(form.reorderPoint) : undefined,
              reorderQty: form.reorderQty ? parseFloat(form.reorderQty) : undefined,
              leadTimeDays: form.leadTimeDays ? parseInt(form.leadTimeDays) : undefined,
            });
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <Input label="SKU" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} required placeholder="e.g. BRD-MDF-18" />
            <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="e.g. MDF 18mm" />
          </div>
          <Input label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional description" />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Unit</label>
              <Select options={MATERIAL_UNITS.map((u) => ({ value: u.value, label: u.label }))} value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
            </div>
            <Input label="Unit Cost ($)" type="number" step="0.01" value={form.unitCost} onChange={(e) => setForm({ ...form, unitCost: e.target.value })} required />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Input label="Min Stock" type="number" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: e.target.value })} />
            <Input label="Reorder Point" type="number" value={form.reorderPoint} onChange={(e) => setForm({ ...form, reorderPoint: e.target.value })} />
            <Input label="Lead Time (days)" type="number" value={form.leadTimeDays} onChange={(e) => setForm({ ...form, leadTimeDays: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? "Creating..." : "Create Material"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

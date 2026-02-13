"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

const COMPANY_TYPES = [
  { value: "CUSTOMER", label: "Customer" },
  { value: "SUPPLIER", label: "Supplier" },
  { value: "ARCHITECT", label: "Architect" },
  { value: "BUILDER", label: "Builder" },
  { value: "INTERIOR_DESIGNER", label: "Interior Designer" },
  { value: "SUBCONTRACTOR", label: "Subcontractor" },
  { value: "OTHER", label: "Other" },
];

export default function CompaniesPage() {
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    name: "",
    type: "CUSTOMER" as const,
    phone: "",
    email: "",
    website: "",
    addressLine1: "",
    city: "",
    postcode: "",
  });

  const { data, isLoading, refetch } = trpc.crm.listCompanies.useQuery({
    search: search || undefined,
    page: 1,
    pageSize: 50,
  });

  const createMutation = trpc.crm.createCompany.useMutation({
    onSuccess: () => {
      setShowCreate(false);
      setForm({ name: "", type: "CUSTOMER", phone: "", email: "", website: "", addressLine1: "", city: "", postcode: "" });
      refetch();
    },
  });

  const typeColors: Record<string, "default" | "secondary" | "success" | "warning" | "outline"> = {
    CUSTOMER: "default",
    SUPPLIER: "secondary",
    ARCHITECT: "success",
    BUILDER: "warning",
    INTERIOR_DESIGNER: "outline",
    SUBCONTRACTOR: "outline",
    OTHER: "secondary",
  };

  const columns = [
    {
      key: "name",
      header: "Company",
      render: (c: any) => <span className="font-medium">{c.name}</span>,
    },
    {
      key: "type",
      header: "Type",
      render: (c: any) => (
        <Badge variant={typeColors[c.type] ?? "secondary"}>
          {COMPANY_TYPES.find((t) => t.value === c.type)?.label ?? c.type}
        </Badge>
      ),
    },
    { key: "phone", header: "Phone" },
    { key: "email", header: "Email" },
    {
      key: "city",
      header: "Location",
      render: (c: any) => [c.city, c.state].filter(Boolean).join(", ") || "—",
    },
    {
      key: "contacts",
      header: "Contacts",
      render: (c: any) => c._count?.contacts ?? 0,
    },
    {
      key: "orders",
      header: "Orders",
      render: (c: any) => c._count?.orders ?? 0,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Companies"
        description="Manage customer, supplier, and trade partner companies."
        actions={
          <Button onClick={() => setShowCreate(true)}>+ New Company</Button>
        }
      />

      <div className="flex items-center gap-4">
        <input
          type="text"
          placeholder="Search companies..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-10 w-80 rounded-md border bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {data && (
          <span className="text-sm text-muted-foreground">
            {data.total} compan{data.total !== 1 ? "ies" : "y"}
          </span>
        )}
      </div>

      <DataTable
        columns={columns}
        data={data?.companies ?? []}
        loading={isLoading}
        emptyMessage="No companies yet. Create your first company to get started."
      />

      <Modal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="New Company"
        description="Add a new company to your CRM."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate({
              ...form,
              email: form.email || undefined,
              website: form.website || undefined,
            });
          }}
          className="space-y-4"
        >
          <Input
            label="Company Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <Select
            options={COMPANY_TYPES}
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value as any })}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <Input
            label="Website"
            value={form.website}
            onChange={(e) => setForm({ ...form, website: e.target.value })}
            placeholder="https://"
          />
          <Input
            label="Address"
            value={form.addressLine1}
            onChange={(e) => setForm({ ...form, addressLine1: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="City"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
            />
            <Input
              label="Postcode"
              value={form.postcode}
              onChange={(e) => setForm({ ...form, postcode: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create Company"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";

export default function ContactsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "",
    phone: "", mobile: "", jobTitle: "",
  });

  const { data, isLoading, refetch } = trpc.crm.listContacts.useQuery({
    search: search || undefined,
    page: 1,
    pageSize: 50,
  });

  const createMutation = trpc.crm.createContact.useMutation({
    onSuccess: () => {
      setShowCreate(false);
      setForm({ firstName: "", lastName: "", email: "", phone: "", mobile: "", jobTitle: "" });
      refetch();
    },
  });

  const columns = [
    {
      key: "name",
      header: "Name",
      render: (c: any) => (
        <div>
          <div className="font-medium">{c.firstName} {c.lastName}</div>
          {c.jobTitle && <div className="text-[12px] text-muted-foreground">{c.jobTitle}</div>}
        </div>
      ),
    },
    {
      key: "company",
      header: "Company",
      render: (c: any) => <span className="text-muted-foreground">{c.company?.name || "\u2014"}</span>,
    },
    { key: "email", header: "Email" },
    { key: "phone", header: "Phone" },
    {
      key: "isPrimary",
      header: "Primary",
      render: (c: any) => c.isPrimary ? <Badge variant="success">Primary</Badge> : null,
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Contacts"
        description="Manage your customer contacts, architects, and trade relationships."
        actions={
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="mr-1.5 h-4 w-4" /> New Contact
          </Button>
        }
      />

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search contacts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-xl border-0 bg-muted/60 pl-9 pr-3 text-[13px] placeholder:text-muted-foreground/50 focus:bg-muted focus:outline-none focus:ring-2 focus:ring-ring/20 transition-smooth"
          />
        </div>
        {data && (
          <span className="text-[13px] text-muted-foreground">
            {data.total} contact{data.total !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      <DataTable
        columns={columns}
        data={data?.contacts ?? []}
        loading={isLoading}
        emptyMessage="No contacts yet. Create your first contact to get started."
        onRowClick={(c) => router.push("/crm/contacts/" + c.id)}
      />

      <Modal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="New Contact"
        description="Add a new contact to your CRM."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate(form);
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <Input label="First Name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
            <Input label="Last Name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
          </div>
          <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Input label="Mobile" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
          </div>
          <Input label="Job Title" value={form.jobTitle} onChange={(e) => setForm({ ...form, jobTitle: e.target.value })} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create Contact"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

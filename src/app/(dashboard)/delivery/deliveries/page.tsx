"use client";

import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

const statusVariant: Record<string, any> = {
  SCHEDULED: "default",
  LOADING: "warning",
  IN_TRANSIT: "warning",
  DELIVERED: "success",
  FAILED: "destructive",
  RESCHEDULED: "outline",
};

export default function DeliveriesPage() {
  const router = useRouter();
  const { data, isLoading } = trpc.delivery.listDeliveries.useQuery({
    page: 1,
    pageSize: 50,
  });

  const columns = [
    {
      key: "deliveryNumber",
      header: "Delivery #",
      render: (d: any) => <span className="font-mono text-sm font-medium">{d.deliveryNumber}</span>,
    },
    {
      key: "customer",
      header: "Customer",
      render: (d: any) => d.order?.company?.name ?? "—",
    },
    {
      key: "status",
      header: "Status",
      render: (d: any) => <Badge variant={statusVariant[d.status] ?? "secondary"}>{d.status.replace(/_/g, " ")}</Badge>,
    },
    {
      key: "scheduledDate",
      header: "Scheduled",
      render: (d: any) => formatDate(d.scheduledDate),
    },
    {
      key: "deliveryAddress",
      header: "Address",
      render: (d: any) => <span className="max-w-xs truncate text-sm">{d.deliveryAddress}</span>,
    },
    {
      key: "installation",
      header: "Installation",
      render: (d: any) => d.installation ? (
        <Badge variant={d.installation.status === "SIGNED_OFF" ? "success" : "outline"}>
          {d.installation.status.replace(/_/g, " ")}
        </Badge>
      ) : "—",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Deliveries"
        description="Schedule and track deliveries to customer sites."
        helpText="Schedule and track deliveries to customer sites — click any row to view delivery details, installation status, and any snag items."
        actions={<Button>+ Schedule Delivery</Button>}
      />

      <DataTable
        columns={columns}
        data={data?.deliveries ?? []}
        loading={isLoading}
        emptyMessage="No deliveries scheduled."
        onRowClick={(d) => router.push("/delivery/deliveries/" + d.id)}
      />
    </div>
  );
}

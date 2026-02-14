"use client";

import { useParams } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatCurrency } from "@/lib/utils";

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline" | "success" | "warning"> = {
  SCHEDULED: "default",
  LOADING: "warning",
  IN_TRANSIT: "warning",
  DELIVERED: "success",
  FAILED: "destructive",
  RESCHEDULED: "outline",
};

const snagSeverityVariant: Record<string, "default" | "secondary" | "destructive" | "outline" | "success" | "warning"> = {
  LOW: "secondary",
  MEDIUM: "warning",
  HIGH: "destructive",
};

export default function DeliveryDetailPage() {
  const { id } = useParams();
  const { data: delivery, isLoading } = trpc.delivery.getDelivery.useQuery(id as string);

  if (isLoading) return <div className="flex h-48 items-center justify-center text-muted-foreground">Loading...</div>;
  if (!delivery) return <div>Delivery not found.</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Delivery ${delivery.deliveryNumber}`}
        description={delivery.order?.company ? `Customer: ${delivery.order.company.name}` : undefined}
        actions={
          <Badge variant={statusVariant[delivery.status] ?? "default"}>{delivery.status.replace(/_/g, " ")}</Badge>
        }
      />

      {/* Delivery Info & Order */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Delivery Details</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <InfoRow label="Delivery Number" value={delivery.deliveryNumber} />
            <InfoRow label="Status" value={delivery.status.replace(/_/g, " ")} />
            {delivery.scheduledDate && <InfoRow label="Scheduled Date" value={formatDate(delivery.scheduledDate)} />}
            {delivery.deliveredDate && <InfoRow label="Delivered Date" value={formatDate(delivery.deliveredDate)} />}
            {delivery.deliveryAddress && <InfoRow label="Delivery Address" value={delivery.deliveryAddress} />}
            {delivery.driverNotes && <InfoRow label="Driver Notes" value={delivery.driverNotes} />}
          </CardContent>
        </Card>

        {delivery.order && (
          <Card>
            <CardHeader><CardTitle>Linked Order</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {delivery.order.orderNumber && <InfoRow label="Order Number" value={delivery.order.orderNumber} />}
              {delivery.order.company && <InfoRow label="Customer" value={delivery.order.company.name} />}
            </CardContent>
          </Card>
        )}

        {delivery.installation && (
          <Card>
            <CardHeader><CardTitle>Installation</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <InfoRow label="Status" value={delivery.installation.status.replace(/_/g, " ")} />
              {delivery.installation.scheduledDate && (
                <InfoRow label="Scheduled Date" value={formatDate(delivery.installation.scheduledDate)} />
              )}
              {delivery.installation.completedDate && (
                <InfoRow label="Completed Date" value={formatDate(delivery.installation.completedDate)} />
              )}
              <InfoRow
                label="Customer Sign-Off"
                value={delivery.installation.customerSignOff ? "Yes" : "No"}
              />
              {delivery.installation.installerNotes && (
                <InfoRow label="Installer Notes" value={delivery.installation.installerNotes} />
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Snag Items */}
      {delivery.installation?.snagItems && delivery.installation.snagItems.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Snag Items</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {delivery.installation.snagItems.map((snag: any) => (
                <div key={snag.id} className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <p className="font-medium">{snag.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={snagSeverityVariant[snag.severity] ?? "secondary"}>{snag.severity}</Badge>
                    </div>
                  </div>
                  <Badge variant={snag.status === "RESOLVED" ? "success" : snag.status === "OPEN" ? "destructive" : "outline"}>
                    {snag.status.replace(/_/g, " ")}
                  </Badge>
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

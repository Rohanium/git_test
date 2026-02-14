"use client";

import { useParams } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatCurrency } from "@/lib/utils";
import { PROJECT_TYPES } from "@/lib/constants";

const STATUS_BADGE_VARIANT: Record<string, "default" | "secondary" | "success" | "destructive"> = {
  NEW: "default",
  CONTACTED: "secondary",
  QUALIFIED: "success",
  CONVERTED: "success",
  LOST: "destructive",
};

function formatSource(source: string): string {
  return source
    .split("_")
    .map((word, idx) => {
      if (idx > 0 && idx === 1 && source.startsWith("REFERRAL_")) {
        return "- " + word.charAt(0) + word.slice(1).toLowerCase();
      }
      return word.charAt(0) + word.slice(1).toLowerCase();
    })
    .join(" ");
}

export default function LeadDetailPage() {
  const { id } = useParams();
  const { data: lead, isLoading } = trpc.crm.getLead.useQuery(id as string);

  if (isLoading) return <div className="flex h-48 items-center justify-center text-muted-foreground">Loading...</div>;
  if (!lead) return <div>Lead not found.</div>;

  const statusVariant = STATUS_BADGE_VARIANT[lead.status] ?? "outline";
  const projectTypeLabel = lead.projectType
    ? PROJECT_TYPES[lead.projectType as keyof typeof PROJECT_TYPES] ?? lead.projectType
    : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={lead.title}
        description={lead.description ?? undefined}
        actions={<Badge variant={statusVariant}>{lead.status}</Badge>}
      />

      {/* Lead Info */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Lead Details</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <InfoRow label="Status" value={lead.status} />
            {lead.source && <InfoRow label="Source" value={formatSource(lead.source)} />}
            {projectTypeLabel && <InfoRow label="Project Type" value={projectTypeLabel} />}
            {lead.estimatedValue != null && (
              <InfoRow label="Estimated Value" value={formatCurrency(Number(lead.estimatedValue))} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Location</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {lead.address && <InfoRow label="Address" value={lead.address} />}
            {lead.city && <InfoRow label="City" value={lead.city} />}
            {lead.postcode && <InfoRow label="Postcode" value={lead.postcode} />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Associations</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {lead.contact && (
              <InfoRow label="Contact" value={`${lead.contact.firstName} ${lead.contact.lastName}`} />
            )}
            {lead.company && <InfoRow label="Company" value={lead.company.name} />}
            {lead.assignedTo && <InfoRow label="Assigned To" value={lead.assignedTo.name} />}
          </CardContent>
        </Card>
      </div>

      {/* Contact Info */}
      {lead.contact && (
        <Card>
          <CardHeader><CardTitle>Contact Information</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <InfoRow label="Name" value={`${lead.contact.firstName} ${lead.contact.lastName}`} />
            {lead.contact.email && <InfoRow label="Email" value={lead.contact.email} />}
            {lead.contact.phone && <InfoRow label="Phone" value={lead.contact.phone} />}
          </CardContent>
        </Card>
      )}

      {/* Activity Timeline */}
      <Card>
        <CardHeader><CardTitle>Activity Timeline</CardTitle></CardHeader>
        <CardContent>
          {!lead.activities || lead.activities.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">No activities recorded.</p>
          ) : (
            <div className="relative space-y-0">
              {lead.activities.map((activity: any, idx: number) => (
                <div key={activity.id} className="relative flex gap-4 pb-6">
                  {/* Timeline line */}
                  {idx < lead.activities.length - 1 && (
                    <div className="absolute left-[15px] top-8 h-full w-px bg-border" />
                  )}
                  {/* Dot */}
                  <div className="relative z-10 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {activity.type[0]}
                  </div>
                  {/* Content */}
                  <div className="flex-1 rounded-lg border p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{activity.type.replace(/_/g, " ")}</Badge>
                        <span className="text-sm font-medium">{activity.subject}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(activity.createdAt)}
                      </span>
                    </div>
                    {activity.description && (
                      <p className="mt-1 text-sm text-muted-foreground">{activity.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
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

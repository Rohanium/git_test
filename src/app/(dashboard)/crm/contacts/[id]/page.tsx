"use client";

import { useParams } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatCurrency } from "@/lib/utils";

export default function ContactDetailPage() {
  const { id } = useParams();
  const { data: contact, isLoading } = trpc.crm.getContact.useQuery(id as string);

  if (isLoading) return <div className="flex h-48 items-center justify-center text-muted-foreground">Loading...</div>;
  if (!contact) return <div>Contact not found.</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${contact.firstName} ${contact.lastName}`}
        description={[contact.jobTitle, contact.company?.name].filter(Boolean).join(" at ")}
        helpText="View and manage this contact's details, see their linked company, opportunities, leads, and full activity timeline."
        actions={contact.isPrimary ? <Badge variant="success">Primary Contact</Badge> : undefined}
      />

      {/* Contact Info */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Contact Details</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {contact.email && <InfoRow label="Email" value={contact.email} />}
            {contact.phone && <InfoRow label="Phone" value={contact.phone} />}
            {contact.mobile && <InfoRow label="Mobile" value={contact.mobile} />}
            {contact.jobTitle && <InfoRow label="Title" value={contact.jobTitle} />}
            {contact.company && <InfoRow label="Company" value={contact.company.name} />}
          </CardContent>
        </Card>

        {contact.company && (
          <Card>
            <CardHeader><CardTitle>Company</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <InfoRow label="Name" value={contact.company.name} />
              <InfoRow label="Type" value={contact.company.type} />
              {contact.company.phone && <InfoRow label="Phone" value={contact.company.phone} />}
              {contact.company.city && <InfoRow label="Location" value={[contact.company.city, contact.company.state].filter(Boolean).join(", ")} />}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle>Summary</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <InfoRow label="Leads" value={String(contact.leads?.length ?? 0)} />
            <InfoRow label="Opportunities" value={String(contact.opportunities?.length ?? 0)} />
            <InfoRow label="Activities" value={String(contact.activities?.length ?? 0)} />
          </CardContent>
        </Card>
      </div>

      {/* Linked Opportunities */}
      {contact.opportunities && contact.opportunities.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Opportunities</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {contact.opportunities.map((opp: any) => (
                <div key={opp.id} className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <p className="font-medium">{opp.title}</p>
                    <Badge variant="outline">{opp.stage}</Badge>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-primary">{formatCurrency(Number(opp.estimatedValue))}</p>
                    <p className="text-xs text-muted-foreground">{opp.probability}% probability</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Leads */}
      {contact.leads && contact.leads.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Leads</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {contact.leads.map((lead: any) => (
                <div key={lead.id} className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <p className="font-medium">{lead.title}</p>
                    <Badge variant="outline">{lead.source}</Badge>
                  </div>
                  <Badge variant={lead.status === "CONVERTED" ? "success" : lead.status === "LOST" ? "destructive" : "secondary"}>{lead.status}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Activity Timeline */}
      <Card>
        <CardHeader><CardTitle>Activity Timeline</CardTitle></CardHeader>
        <CardContent>
          {!contact.activities || contact.activities.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">No activities recorded.</p>
          ) : (
            <div className="relative space-y-0">
              {contact.activities.map((activity: any, idx: number) => (
                <div key={activity.id} className="relative flex gap-4 pb-6">
                  {/* Timeline line */}
                  {idx < contact.activities.length - 1 && (
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

"use client";

import { useParams } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatCurrency } from "@/lib/utils";
import { PIPELINE_STAGES } from "@/lib/constants";

function getStageBadge(stage: string) {
  const found = PIPELINE_STAGES.find((s) => s.key === stage);
  const label = found?.label ?? stage;
  const color = found?.color ?? "#94a3b8";
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
      style={{ backgroundColor: color + "20", color }}
    >
      {label}
    </span>
  );
}

export default function OpportunityDetailPage() {
  const { id } = useParams();
  const { data: opportunity, isLoading } = trpc.crm.getOpportunity.useQuery(id as string);

  if (isLoading) return <div className="flex h-48 items-center justify-center text-muted-foreground">Loading...</div>;
  if (!opportunity) return <div>Opportunity not found.</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title={opportunity.title}
        description={opportunity.description ?? undefined}
        helpText="View this opportunity's stage, value, probability, linked quotes, and full activity timeline."
        actions={getStageBadge(opportunity.stage)}
      />

      {/* Opportunity Info */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Opportunity Details</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <InfoRow label="Title" value={opportunity.title} />
            <InfoRow label="Stage" value={PIPELINE_STAGES.find((s) => s.key === opportunity.stage)?.label ?? opportunity.stage} />
            {opportunity.estimatedValue != null && (
              <InfoRow label="Estimated Value" value={formatCurrency(Number(opportunity.estimatedValue))} />
            )}
            {opportunity.probability != null && (
              <InfoRow label="Probability" value={`${opportunity.probability}%`} />
            )}
            {opportunity.expectedCloseDate && (
              <InfoRow label="Expected Close" value={formatDate(opportunity.expectedCloseDate)} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Associations</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {opportunity.contact && (
              <InfoRow label="Contact" value={`${opportunity.contact.firstName} ${opportunity.contact.lastName}`} />
            )}
            {opportunity.company && <InfoRow label="Company" value={opportunity.company.name} />}
            {opportunity.owner && <InfoRow label="Owner" value={opportunity.owner.name} />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Summary</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <InfoRow label="Quotes" value={String(opportunity.quotes?.length ?? 0)} />
            <InfoRow label="Activities" value={String(opportunity.activities?.length ?? 0)} />
          </CardContent>
        </Card>
      </div>

      {/* Contact Info */}
      {opportunity.contact && (
        <Card>
          <CardHeader><CardTitle>Contact Information</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <InfoRow label="Name" value={`${opportunity.contact.firstName} ${opportunity.contact.lastName}`} />
            {opportunity.contact.email && <InfoRow label="Email" value={opportunity.contact.email} />}
            {opportunity.contact.phone && <InfoRow label="Phone" value={opportunity.contact.phone} />}
          </CardContent>
        </Card>
      )}

      {/* Company Info */}
      {opportunity.company && (
        <Card>
          <CardHeader><CardTitle>Company</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <InfoRow label="Name" value={opportunity.company.name} />
            {opportunity.company.type && <InfoRow label="Type" value={opportunity.company.type} />}
            {opportunity.company.phone && <InfoRow label="Phone" value={opportunity.company.phone} />}
          </CardContent>
        </Card>
      )}

      {/* Linked Quotes */}
      {opportunity.quotes && opportunity.quotes.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Quotes</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {opportunity.quotes.map((quote: any) => (
                <div key={quote.id} className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <p className="font-medium">{quote.quoteNumber}</p>
                    <Badge variant="outline">{quote.status}</Badge>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-primary">{formatCurrency(Number(quote.total))}</p>
                  </div>
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
          {!opportunity.activities || opportunity.activities.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">No activities recorded.</p>
          ) : (
            <div className="relative space-y-0">
              {opportunity.activities.map((activity: any, idx: number) => (
                <div key={activity.id} className="relative flex gap-4 pb-6">
                  {/* Timeline line */}
                  {idx < opportunity.activities.length - 1 && (
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

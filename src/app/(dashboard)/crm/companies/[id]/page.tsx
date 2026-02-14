"use client";

import { useParams } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatCurrency } from "@/lib/utils";

const TYPE_BADGE_VARIANT: Record<string, "default" | "secondary" | "success" | "warning" | "outline"> = {
  CUSTOMER: "default",
  SUPPLIER: "secondary",
  ARCHITECT: "success",
  BUILDER: "warning",
};

export default function CompanyDetailPage() {
  const { id } = useParams();
  const { data: company, isLoading } = trpc.crm.getCompany.useQuery(id as string);

  if (isLoading) return <div className="flex h-48 items-center justify-center text-muted-foreground">Loading...</div>;
  if (!company) return <div>Company not found.</div>;

  const badgeVariant = TYPE_BADGE_VARIANT[company.type] ?? "outline";

  return (
    <div className="space-y-6">
      <PageHeader
        title={company.name}
        actions={<Badge variant={badgeVariant}>{company.type}</Badge>}
      />

      {/* Company Info */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Company Details</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <InfoRow label="Name" value={company.name} />
            <InfoRow label="Type" value={company.type} />
            {company.phone && <InfoRow label="Phone" value={company.phone} />}
            {company.email && <InfoRow label="Email" value={company.email} />}
            {company.website && <InfoRow label="Website" value={company.website} />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Address</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {company.addressLine1 && <InfoRow label="Address" value={company.addressLine1} />}
            {company.city && <InfoRow label="City" value={company.city} />}
            {company.state && <InfoRow label="State" value={company.state} />}
            {company.postcode && <InfoRow label="Postcode" value={company.postcode} />}
            {company.country && <InfoRow label="Country" value={company.country} />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Summary</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <InfoRow label="Contacts" value={String(company.contacts?.length ?? 0)} />
            <InfoRow label="Orders" value={String(company.orders?.length ?? 0)} />
            <InfoRow label="Opportunities" value={String(company.opportunities?.length ?? 0)} />
            <InfoRow label="Leads" value={String(company.leads?.length ?? 0)} />
          </CardContent>
        </Card>
      </div>

      {/* Contacts */}
      {company.contacts && company.contacts.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Contacts</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {company.contacts.map((contact: any) => (
                <div key={contact.id} className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <p className="font-medium">{contact.firstName} {contact.lastName}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {contact.jobTitle && <span className="text-sm text-muted-foreground">{contact.jobTitle}</span>}
                      {contact.isPrimary && <Badge variant="success">Primary</Badge>}
                    </div>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    {contact.email && <p>{contact.email}</p>}
                    {contact.phone && <p>{contact.phone}</p>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Orders */}
      {company.orders && company.orders.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Recent Orders</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {company.orders.map((order: any) => (
                <div key={order.id} className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <p className="font-medium">{order.orderNumber}</p>
                    <Badge variant="outline">{order.status}</Badge>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-primary">{formatCurrency(Number(order.total))}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(order.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Opportunities */}
      {company.opportunities && company.opportunities.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Opportunities</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {company.opportunities.map((opp: any) => (
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
      {company.leads && company.leads.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Leads</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {company.leads.map((lead: any) => (
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

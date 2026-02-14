"use client";

import { useParams } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatCurrency } from "@/lib/utils";

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline" | "success" | "warning"> = {
  DRAFT: "secondary",
  SENT: "default",
  VIEWED: "outline",
  PARTIALLY_PAID: "warning",
  PAID: "success",
  OVERDUE: "destructive",
  CANCELLED: "secondary",
  VOID: "secondary",
};

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const { data: invoice, isLoading } = trpc.finance.getInvoice.useQuery(id as string);

  if (isLoading) return <div className="flex h-48 items-center justify-center text-muted-foreground">Loading...</div>;
  if (!invoice) return <div>Invoice not found.</div>;

  const balance = Number(invoice.total) - Number(invoice.amountPaid);
  const isOverdue =
    invoice.dueDate &&
    new Date(invoice.dueDate) < new Date() &&
    !["PAID", "CANCELLED", "VOID"].includes(invoice.status);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Invoice ${invoice.invoiceNumber}`}
        description={invoice.order?.company ? `Customer: ${invoice.order.company.name}` : undefined}
        helpText="View this invoice's line items, payment history, and outstanding balance — record payments and track status changes."
        actions={
          <div className="flex items-center gap-2">
            {isOverdue && <Badge variant="destructive">Overdue</Badge>}
            <Badge variant={statusVariant[invoice.status] ?? "default"}>{invoice.status.replace(/_/g, " ")}</Badge>
          </div>
        }
      />

      {/* Invoice Info & Customer */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Invoice Details</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <InfoRow label="Invoice Number" value={invoice.invoiceNumber} />
            {invoice.type && <InfoRow label="Type" value={invoice.type} />}
            <InfoRow label="Status" value={invoice.status.replace(/_/g, " ")} />
            {invoice.issueDate && <InfoRow label="Issue Date" value={formatDate(invoice.issueDate)} />}
            {invoice.dueDate && <InfoRow label="Due Date" value={formatDate(invoice.dueDate)} />}
            {invoice.notes && <InfoRow label="Notes" value={invoice.notes} />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Amounts</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <InfoRow label="Subtotal" value={formatCurrency(Number(invoice.subtotal))} />
            <InfoRow label="Tax" value={formatCurrency(Number(invoice.taxAmount))} />
            <InfoRow label="Total" value={formatCurrency(Number(invoice.total))} />
            <InfoRow label="Amount Paid" value={formatCurrency(Number(invoice.amountPaid))} />
            <div className="border-t pt-2">
              <InfoRow label="Balance Remaining" value={formatCurrency(balance)} />
            </div>
          </CardContent>
        </Card>

        {invoice.order?.company && (
          <Card>
            <CardHeader><CardTitle>Customer</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <InfoRow label="Company" value={invoice.order.company.name} />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Line Items */}
      {invoice.lineItems && invoice.lineItems.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Line Items</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 font-medium">Description</th>
                    <th className="pb-2 font-medium text-right">Quantity</th>
                    <th className="pb-2 font-medium text-right">Unit Price</th>
                    <th className="pb-2 font-medium text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.lineItems.map((item: any) => (
                    <tr key={item.id} className="border-b last:border-0">
                      <td className="py-3">{item.description}</td>
                      <td className="py-3 text-right">{item.quantity}</td>
                      <td className="py-3 text-right">{formatCurrency(Number(item.unitPrice))}</td>
                      <td className="py-3 text-right font-medium">{formatCurrency(Number(item.lineTotal))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payments */}
      {invoice.payments && invoice.payments.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Payments</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {invoice.payments.map((payment: any) => (
                <div key={payment.id} className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <p className="font-medium">{formatCurrency(Number(payment.amount))}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline">{payment.method}</Badge>
                      {payment.reference && <span className="text-xs text-muted-foreground">Ref: {payment.reference}</span>}
                    </div>
                    {payment.notes && <p className="mt-1 text-sm text-muted-foreground">{payment.notes}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">{formatDate(payment.paidDate)}</p>
                  </div>
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

"use client";

import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

export default function FinancialReportsPage() {
  const { data: aging } = trpc.finance.receivablesAging.useQuery();

  const agingBuckets = [
    { label: "Current", data: aging?.current ?? [], color: "success" },
    { label: "1-30 days", data: aging?.thirtyDays ?? [], color: "warning" },
    { label: "31-60 days", data: aging?.sixtyDays ?? [], color: "warning" },
    { label: "61-90 days", data: aging?.ninetyDays ?? [], color: "destructive" },
    { label: "90+ days", data: aging?.overNinety ?? [], color: "destructive" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Financial Reports"
        description="Accounts receivable aging, P&L summary, and cash flow."
        helpText="Financial reports and summaries — view revenue, expenses, profit margins, and accounts receivable aging."
      />

      {/* AR Aging */}
      <Card>
        <CardHeader>
          <CardTitle>Accounts Receivable Aging</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-4">
            {agingBuckets.map((bucket) => {
              const total = bucket.data.reduce((s: number, inv: any) => s + Number(inv.total) - Number(inv.amountPaid ?? 0), 0);
              return (
                <div key={bucket.label} className="rounded-lg border p-4 text-center">
                  <p className="text-xs text-muted-foreground">{bucket.label}</p>
                  <p className="text-lg font-bold">{formatCurrency(total)}</p>
                  <Badge variant={bucket.color as any}>{bucket.data.length} invoices</Badge>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

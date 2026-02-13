"use client";

import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

export default function ReportsPage() {
  const { data: kpis } = trpc.reports.executiveKpis.useQuery();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports & Analytics"
        description="Executive overview and business intelligence."
      />

      {/* Executive KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Pipeline Value"
          value={formatCurrency(kpis?.pipelineValue ?? 0)}
          description={`${kpis?.pipelineCount ?? 0} active opportunities`}
        />
        <StatCard
          title="YTD Revenue"
          value={formatCurrency(kpis?.yearToDateRevenue ?? 0)}
          description="Year to date payments received"
        />
        <StatCard
          title="Active Jobs"
          value={kpis?.activeJobs ?? 0}
          description="Currently in production"
        />
        <StatCard
          title="Win Rate"
          value={`${kpis?.winRate ?? 0}%`}
          description="Last 90 days"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Monthly Orders"
          value={kpis?.monthlyOrders ?? 0}
          description="New orders this month"
        />
        <StatCard
          title="Overdue Invoices"
          value={kpis?.overdueInvoices ?? 0}
          description="Require follow-up"
          className={kpis?.overdueInvoices ? "border-destructive/50" : ""}
        />
      </div>

      {/* Report Links */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="cursor-pointer transition-colors hover:bg-muted/50">
          <CardHeader>
            <CardTitle className="text-base">Sales Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Revenue by project type, sales rep, conversion rates, and pipeline analysis.
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer transition-colors hover:bg-muted/50">
          <CardHeader>
            <CardTitle className="text-base">Production Efficiency</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Throughput rates, estimated vs actual hours, bottleneck analysis, rework rates.
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer transition-colors hover:bg-muted/50">
          <CardHeader>
            <CardTitle className="text-base">Job Profitability</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Actual vs estimated costs, margin analysis by job, customer, and product type.
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer transition-colors hover:bg-muted/50">
          <CardHeader>
            <CardTitle className="text-base">Inventory Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Stock valuation, turnover rates, dead stock, wastage analysis.
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer transition-colors hover:bg-muted/50">
          <CardHeader>
            <CardTitle className="text-base">Accounts Receivable</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Aging report, outstanding balances, payment trends, overdue follow-up.
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer transition-colors hover:bg-muted/50">
          <CardHeader>
            <CardTitle className="text-base">Customer Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Customer lifetime value, repeat business rates, top customers by revenue.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { PIPELINE_STAGES, JOB_STATUSES } from "@/lib/constants";

export default function DashboardPage() {
  const { data: kpis } = trpc.reports.executiveKpis.useQuery();
  const { data: pipeline } = trpc.crm.pipelineSummary.useQuery();
  const { data: workshop } = trpc.production.workshopDashboard.useQuery();
  const { data: finance } = trpc.finance.dashboardSummary.useQuery();
  const { data: recentQuotes } = trpc.quotes.list.useQuery({ page: 1, pageSize: 5 });
  const { data: deliveries } = trpc.delivery.listDeliveries.useQuery({ page: 1, pageSize: 5 });
  const { data: stock } = trpc.inventory.stockSummary.useQuery();

  const lowStockItems = stock?.filter((i) => i.isLowStock) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Overview of your joinery business operations.
        </p>
      </div>

      {/* Executive KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Pipeline Value"
          value={formatCurrency(kpis?.pipelineValue ?? 0)}
          description={`${kpis?.pipelineCount ?? 0} active opportunities`}
        />
        <StatCard
          title="Active Jobs"
          value={kpis?.activeJobs ?? 0}
          description="In production"
        />
        <StatCard
          title="YTD Revenue"
          value={formatCurrency(kpis?.yearToDateRevenue ?? 0)}
          description="Year to date"
        />
        <StatCard
          title="Win Rate"
          value={`${kpis?.winRate ?? 0}%`}
          description="Last 90 days"
        />
      </div>

      {/* Financial Row */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="Month Revenue"
          value={formatCurrency(finance?.monthRevenue ?? 0)}
          description="Payments received"
        />
        <StatCard
          title="Outstanding Receivables"
          value={formatCurrency(finance?.outstandingReceivables ?? 0)}
          description="Unpaid invoices"
        />
        <StatCard
          title="Overdue Invoices"
          value={kpis?.overdueInvoices ?? 0}
          description="Require follow-up"
          className={(kpis?.overdueInvoices ?? 0) > 0 ? "border-destructive/50" : ""}
        />
      </div>

      {/* Sales Pipeline Mini */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>Sales Pipeline</CardTitle>
            <Link href="/crm/opportunities" className="text-sm text-primary hover:underline">
              View All
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {PIPELINE_STAGES.filter((s) => s.key !== "WON" && s.key !== "LOST").map((stage) => {
              const info = pipeline?.find((p) => p.stage === stage.key);
              return (
                <div
                  key={stage.key}
                  className="flex-1 rounded-lg border p-3 text-center"
                  style={{ borderTopColor: stage.color, borderTopWidth: 3 }}
                >
                  <p className="text-xs text-muted-foreground">{stage.label}</p>
                  <p className="text-lg font-bold">{info?.count ?? 0}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(Number(info?.totalValue ?? 0))}
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Quotes */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle>Recent Quotes</CardTitle>
              <Link href="/quotes" className="text-sm text-primary hover:underline">View All</Link>
            </div>
          </CardHeader>
          <CardContent>
            {!recentQuotes?.quotes?.length ? (
              <p className="py-4 text-center text-sm text-muted-foreground">No quotes yet.</p>
            ) : (
              <div className="space-y-3">
                {recentQuotes.quotes.map((q: any) => (
                  <Link
                    key={q.id}
                    href={`/quotes/${q.id}`}
                    className="flex items-center justify-between rounded-md border p-3 transition-colors hover:bg-muted/50"
                  >
                    <div>
                      <span className="font-mono text-xs text-muted-foreground">{q.quoteNumber}</span>
                      <p className="text-sm font-medium">{q.title}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(Number(q.total))}</p>
                      <Badge variant="outline" className="text-xs">{q.status}</Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Workshop Status */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle>Workshop Status</CardTitle>
              <Link href="/production/dashboard" className="text-sm text-primary hover:underline">View All</Link>
            </div>
          </CardHeader>
          <CardContent>
            {!workshop?.activeJobs?.length ? (
              <p className="py-4 text-center text-sm text-muted-foreground">No active jobs.</p>
            ) : (
              <div className="space-y-3">
                {workshop.activeJobs.slice(0, 5).map((job: any) => (
                  <div key={job.id} className="flex items-center justify-between rounded-md border p-3">
                    <div>
                      <span className="font-mono text-xs">{job.jobNumber}</span>
                      <p className="text-sm">{job.order?.company?.name}</p>
                    </div>
                    <Badge
                      variant={
                        job.priority === "URGENT" ? "destructive" :
                        job.priority === "HIGH" ? "warning" : "outline"
                      }
                    >
                      {(JOB_STATUSES as any)[job.status]?.label ?? job.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Deliveries */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle>Upcoming Deliveries</CardTitle>
              <Link href="/delivery/deliveries" className="text-sm text-primary hover:underline">View All</Link>
            </div>
          </CardHeader>
          <CardContent>
            {!deliveries?.deliveries?.length ? (
              <p className="py-4 text-center text-sm text-muted-foreground">No deliveries scheduled.</p>
            ) : (
              <div className="space-y-3">
                {deliveries.deliveries.slice(0, 5).map((d: any) => (
                  <div key={d.id} className="flex items-center justify-between rounded-md border p-3">
                    <div>
                      <span className="font-mono text-xs">{d.deliveryNumber}</span>
                      <p className="text-sm">{d.order?.company?.name}</p>
                    </div>
                    <Badge variant="outline">{d.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Low Stock Alerts */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle>Low Stock Alerts</CardTitle>
              <Link href="/inventory/stock" className="text-sm text-primary hover:underline">View All</Link>
            </div>
          </CardHeader>
          <CardContent>
            {lowStockItems.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">All stock levels OK.</p>
            ) : (
              <div className="space-y-3">
                {lowStockItems.slice(0, 5).map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-md border border-destructive/30 p-3">
                    <div>
                      <span className="font-mono text-xs">{item.sku}</span>
                      <p className="text-sm font-medium">{item.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-destructive">
                        {item.totalQuantity.toFixed(1)} {item.unit}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Reorder at {item.reorderPoint}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

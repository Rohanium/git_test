"use client";

import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { PIPELINE_STAGES, JOB_STATUSES } from "@/lib/constants";
import {
  TrendingUp,
  Briefcase,
  DollarSign,
  Target,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";

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
      {/* Greeting */}
      <div>
        <h2 className="text-xl font-bold tracking-tight">Good morning</h2>
        <p className="text-[13px] text-muted-foreground">
          Here's what's happening with your business today.
        </p>
      </div>

      {/* Executive KPIs */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Pipeline Value"
          value={formatCurrency(kpis?.pipelineValue ?? 0)}
          description={`${kpis?.pipelineCount ?? 0} active opportunities`}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <StatCard
          title="Active Jobs"
          value={kpis?.activeJobs ?? 0}
          description="In production"
          icon={<Briefcase className="h-5 w-5" />}
        />
        <StatCard
          title="YTD Revenue"
          value={formatCurrency(kpis?.yearToDateRevenue ?? 0)}
          description="Year to date"
          icon={<DollarSign className="h-5 w-5" />}
        />
        <StatCard
          title="Win Rate"
          value={`${kpis?.winRate ?? 0}%`}
          description="Last 90 days"
          icon={<Target className="h-5 w-5" />}
        />
      </div>

      {/* Financial Row */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
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
          className={(kpis?.overdueInvoices ?? 0) > 0 ? "ring-1 ring-red-200 dark:ring-red-900" : ""}
        />
      </div>

      {/* Sales Pipeline */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>Sales Pipeline</CardTitle>
            <Link href="/crm/opportunities" className="flex items-center gap-1 text-[13px] font-medium text-primary hover:text-primary/80 transition-smooth">
              View All <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {PIPELINE_STAGES.filter((s) => s.key !== "WON" && s.key !== "LOST").map((stage) => {
              const info = pipeline?.find((p) => p.stage === stage.key);
              return (
                <div
                  key={stage.key}
                  className="flex-1 min-w-[100px] rounded-xl bg-muted/40 p-3 text-center"
                >
                  <div
                    className="mx-auto mb-2 h-1 w-8 rounded-full"
                    style={{ backgroundColor: stage.color }}
                  />
                  <p className="text-[11px] font-medium text-muted-foreground">{stage.label}</p>
                  <p className="mt-0.5 text-lg font-bold">{info?.count ?? 0}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {formatCurrency(Number(info?.totalValue ?? 0))}
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Recent Quotes */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle>Recent Quotes</CardTitle>
              <Link href="/quotes" className="flex items-center gap-1 text-[13px] font-medium text-primary hover:text-primary/80 transition-smooth">
                View All <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {!recentQuotes?.quotes?.length ? (
              <p className="py-6 text-center text-[13px] text-muted-foreground">No quotes yet.</p>
            ) : (
              <div className="divide-y divide-border/30">
                {recentQuotes.quotes.map((q: any) => (
                  <Link
                    key={q.id}
                    href={`/quotes/${q.id}`}
                    className="flex items-center justify-between py-3 transition-colors hover:bg-muted/20 -mx-2 px-2 rounded-xl"
                  >
                    <div>
                      <span className="font-mono text-[11px] text-muted-foreground">{q.quoteNumber}</span>
                      <p className="text-[13px] font-medium">{q.title}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-[13px] font-semibold">{formatCurrency(Number(q.total))}</p>
                        <Badge variant="outline" className="text-[10px]">{q.status}</Badge>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Workshop Status */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle>Workshop Status</CardTitle>
              <Link href="/production/dashboard" className="flex items-center gap-1 text-[13px] font-medium text-primary hover:text-primary/80 transition-smooth">
                View All <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {!workshop?.activeJobs?.length ? (
              <p className="py-6 text-center text-[13px] text-muted-foreground">No active jobs.</p>
            ) : (
              <div className="divide-y divide-border/30">
                {workshop.activeJobs.slice(0, 5).map((job: any) => (
                  <div key={job.id} className="flex items-center justify-between py-3">
                    <div>
                      <span className="font-mono text-[11px] font-medium">{job.jobNumber}</span>
                      <p className="text-[13px] text-muted-foreground">{job.order?.company?.name}</p>
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
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle>Upcoming Deliveries</CardTitle>
              <Link href="/delivery/deliveries" className="flex items-center gap-1 text-[13px] font-medium text-primary hover:text-primary/80 transition-smooth">
                View All <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {!deliveries?.deliveries?.length ? (
              <p className="py-6 text-center text-[13px] text-muted-foreground">No deliveries scheduled.</p>
            ) : (
              <div className="divide-y divide-border/30">
                {deliveries.deliveries.slice(0, 5).map((d: any) => (
                  <div key={d.id} className="flex items-center justify-between py-3">
                    <div>
                      <span className="font-mono text-[11px] font-medium">{d.deliveryNumber}</span>
                      <p className="text-[13px] text-muted-foreground">{d.order?.company?.name}</p>
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
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                Low Stock Alerts
                {lowStockItems.length > 0 && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-100 text-[10px] font-bold text-red-600 dark:bg-red-950 dark:text-red-400">
                    {lowStockItems.length}
                  </span>
                )}
              </CardTitle>
              <Link href="/inventory/stock" className="flex items-center gap-1 text-[13px] font-medium text-primary hover:text-primary/80 transition-smooth">
                View All <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {lowStockItems.length === 0 ? (
              <p className="py-6 text-center text-[13px] text-muted-foreground">All stock levels OK.</p>
            ) : (
              <div className="divide-y divide-border/30">
                {lowStockItems.slice(0, 5).map((item) => (
                  <div key={item.id} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 dark:bg-red-950/30">
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                      </div>
                      <div>
                        <p className="text-[13px] font-medium">{item.name}</p>
                        <span className="font-mono text-[11px] text-muted-foreground">{item.sku}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[13px] font-semibold text-red-500">
                        {item.totalQuantity.toFixed(1)} {item.unit}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
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

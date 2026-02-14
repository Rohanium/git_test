"use client";

import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { JOB_STATUSES, OPERATIONS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Hammer, Clock, CheckCircle2, Users } from "lucide-react";

export default function ProductionDashboardPage() {
  const { data, isLoading } = trpc.production.workshopDashboard.useQuery();

  const statusCounts = data?.jobsByStatus ?? [];
  const activeJobs = data?.activeJobs ?? [];
  const todaysTime = data?.todaysTimeEntries ?? [];

  const inProgress = statusCounts.find((s) => s.status === "IN_PROGRESS")?.count ?? 0;
  const readyToStart = statusCounts.find((s) => s.status === "READY_TO_START")?.count ?? 0;
  const qcPending = statusCounts.find((s) => s.status === "QC_PENDING")?.count ?? 0;

  return (
    <div className="space-y-5">
      <PageHeader title="Workshop Dashboard" description="Real-time production overview." helpText="A real-time overview of your workshop — see active jobs, staff clock-ins, and job status breakdown at a glance." />

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard title="In Progress" value={inProgress} description="Jobs actively being worked" icon={<Hammer className="h-5 w-5" />} />
        <StatCard title="Ready to Start" value={readyToStart} description="Waiting for workshop" icon={<Clock className="h-5 w-5" />} />
        <StatCard title="QC Pending" value={qcPending} description="Awaiting quality check" icon={<CheckCircle2 className="h-5 w-5" />} />
        <StatCard title="Clocked In" value={todaysTime.filter((t: any) => !t.clockOut).length} description="Workers on the floor" icon={<Users className="h-5 w-5" />} />
      </div>

      {/* Job Status */}
      <Card>
        <CardHeader>
          <CardTitle>Job Status Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {statusCounts.map((s) => {
              const info = (JOB_STATUSES as any)[s.status];
              return (
                <div key={s.status} className="flex items-center gap-2 rounded-xl bg-muted/40 px-3.5 py-2">
                  <span className="text-[13px] font-medium">{info?.label ?? s.status.replace(/_/g, " ")}</span>
                  <Badge variant="secondary">{s.count}</Badge>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Active Jobs */}
      <Card>
        <CardHeader>
          <CardTitle>Active Jobs</CardTitle>
        </CardHeader>
        <CardContent>
          {activeJobs.length === 0 ? (
            <p className="py-10 text-center text-[13px] text-muted-foreground">
              No active jobs. Jobs appear here when they enter production.
            </p>
          ) : (
            <div className="divide-y divide-border/30">
              {activeJobs.map((job: any) => (
                <div key={job.id} className="flex items-center justify-between py-3.5">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[12px] font-semibold">{job.jobNumber}</span>
                      <Badge
                        variant={
                          job.priority === "URGENT" ? "destructive" :
                          job.priority === "HIGH" ? "warning" : "outline"
                        }
                      >
                        {job.priority}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-[13px] text-muted-foreground">{job.order?.company?.name}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1">
                      {job.operations.map((op: any) => (
                        <div
                          key={op.id}
                          title={(OPERATIONS as any)[op.operationType] ?? op.operationType + ": " + op.status}
                          className={cn(
                            "h-6 w-6 rounded-md text-center text-[10px] leading-6 font-semibold",
                            op.status === "COMPLETED"
                              ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
                              : op.status === "IN_PROGRESS"
                                ? "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400"
                                : "bg-muted text-muted-foreground"
                          )}
                        >
                          {(OPERATIONS as any)[op.operationType]?.[0] ?? "?"}
                        </div>
                      ))}
                    </div>
                    <Badge variant={
                      job.status === "IN_PROGRESS" ? "warning" :
                      job.status === "QC_PENDING" ? "default" : "secondary"
                    }>
                      {(JOB_STATUSES as any)[job.status]?.label ?? job.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Today's Time */}
      <Card>
        <CardHeader>
          <CardTitle>Today's Time Log</CardTitle>
        </CardHeader>
        <CardContent>
          {todaysTime.length === 0 ? (
            <p className="py-10 text-center text-[13px] text-muted-foreground">No time entries today.</p>
          ) : (
            <div className="divide-y divide-border/30">
              {todaysTime.map((entry: any) => (
                <div key={entry.id} className="flex items-center justify-between py-3">
                  <div>
                    <span className="font-medium">{entry.user?.name}</span>
                    {entry.job && (
                      <span className="ml-2 text-[13px] text-muted-foreground">on {entry.job.jobNumber}</span>
                    )}
                  </div>
                  {entry.clockOut ? (
                    <Badge variant="secondary">Clocked Out</Badge>
                  ) : (
                    <Badge variant="success">Active</Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

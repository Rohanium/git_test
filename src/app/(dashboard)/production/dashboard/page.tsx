"use client";

import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { JOB_STATUSES, OPERATIONS } from "@/lib/constants";
import { cn } from "@/lib/utils";

export default function ProductionDashboardPage() {
  const { data, isLoading } = trpc.production.workshopDashboard.useQuery();

  const statusCounts = data?.jobsByStatus ?? [];
  const activeJobs = data?.activeJobs ?? [];
  const todaysTime = data?.todaysTimeEntries ?? [];

  const inProgress = statusCounts.find((s) => s.status === "IN_PROGRESS")?.count ?? 0;
  const readyToStart = statusCounts.find((s) => s.status === "READY_TO_START")?.count ?? 0;
  const qcPending = statusCounts.find((s) => s.status === "QC_PENDING")?.count ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Workshop Dashboard"
        description="Real-time production overview."
      />

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard title="In Progress" value={inProgress} description="Jobs actively being worked" />
        <StatCard title="Ready to Start" value={readyToStart} description="Waiting for workshop" />
        <StatCard title="QC Pending" value={qcPending} description="Awaiting quality check" />
        <StatCard
          title="Clocked In Today"
          value={todaysTime.filter((t: any) => !t.clockOut).length}
          description="Workers on the floor"
        />
      </div>

      {/* Job Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Job Status Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {statusCounts.map((s) => {
              const info = (JOB_STATUSES as any)[s.status];
              return (
                <div
                  key={s.status}
                  className="flex items-center gap-2 rounded-lg border px-4 py-2"
                >
                  <span className="text-sm font-medium">
                    {info?.label ?? s.status.replace(/_/g, " ")}
                  </span>
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
            <p className="py-8 text-center text-muted-foreground">
              No active jobs. Jobs appear here when they enter production.
            </p>
          ) : (
            <div className="space-y-3">
              {activeJobs.map((job: any) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-medium">{job.jobNumber}</span>
                      <Badge
                        variant={
                          job.priority === "URGENT" ? "destructive" :
                          job.priority === "HIGH" ? "warning" : "outline"
                        }
                      >
                        {job.priority}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {job.order?.company?.name}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    {/* Operations progress */}
                    <div className="flex gap-1">
                      {job.operations.map((op: any) => (
                        <div
                          key={op.id}
                          title={`${(OPERATIONS as any)[op.operationType] ?? op.operationType}: ${op.status}`}
                          className={cn(
                            "h-6 w-6 rounded text-center text-[10px] leading-6",
                            op.status === "COMPLETED"
                              ? "bg-emerald-100 text-emerald-800"
                              : op.status === "IN_PROGRESS"
                                ? "bg-amber-100 text-amber-800"
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

      {/* Today's Time Entries */}
      <Card>
        <CardHeader>
          <CardTitle>Today's Time Log</CardTitle>
        </CardHeader>
        <CardContent>
          {todaysTime.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              No time entries today.
            </p>
          ) : (
            <div className="space-y-2">
              {todaysTime.map((entry: any) => (
                <div key={entry.id} className="flex items-center justify-between border-b py-2 last:border-0">
                  <div>
                    <span className="font-medium">{entry.user?.name}</span>
                    {entry.job && (
                      <span className="ml-2 text-sm text-muted-foreground">
                        on {entry.job.jobNumber}
                      </span>
                    )}
                  </div>
                  <div className="text-sm">
                    {entry.clockOut ? (
                      <Badge variant="secondary">Clocked Out</Badge>
                    ) : (
                      <Badge variant="success">Active</Badge>
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

"use client";

import { useParams } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatCurrency } from "@/lib/utils";
import { JOB_STATUSES, OPERATIONS } from "@/lib/constants";

const priorityVariant = {
  URGENT: "destructive",
  HIGH: "warning",
  NORMAL: "secondary",
  LOW: "outline",
} as const;

export default function JobDetailPage() {
  const { id } = useParams();
  const { data: job, isLoading } = trpc.production.getJob.useQuery(id as string);

  if (isLoading) return <div className="flex h-48 items-center justify-center text-muted-foreground">Loading...</div>;
  if (!job) return <div>Job not found.</div>;

  const statusInfo = JOB_STATUSES[job.status as keyof typeof JOB_STATUSES];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Job ${job.jobNumber}`}
        description={job.order?.company?.name ? `Order ${job.order.orderNumber} - ${job.order.company.name}` : undefined}
        helpText="Manage this production job's operations sequence, material allocations, time tracking, and quality control checks."
        actions={
          <div className="flex items-center gap-2">
            <Badge variant={priorityVariant[job.priority as keyof typeof priorityVariant] ?? "secondary"}>
              {job.priority}
            </Badge>
            <Badge variant="default">{statusInfo?.label ?? job.status}</Badge>
          </div>
        }
      />

      {/* Job Info */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Job Details</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <InfoRow label="Job Number" value={job.jobNumber} />
            <InfoRow label="Status" value={statusInfo?.label ?? job.status} />
            <InfoRow label="Priority" value={job.priority} />
            {job.dueDate && <InfoRow label="Due Date" value={formatDate(job.dueDate)} />}
            {job.estimatedHours != null && <InfoRow label="Estimated Hours" value={String(job.estimatedHours)} />}
            {job.actualHours != null && <InfoRow label="Actual Hours" value={String(job.actualHours)} />}
          </CardContent>
        </Card>

        {job.order && (
          <Card>
            <CardHeader><CardTitle>Linked Order</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <InfoRow label="Order Number" value={job.order.orderNumber} />
              {job.order.company?.name && <InfoRow label="Company" value={job.order.company.name} />}
            </CardContent>
          </Card>
        )}

        {job.orderItem && (
          <Card>
            <CardHeader><CardTitle>Order Item</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {job.orderItem.description && <InfoRow label="Description" value={job.orderItem.description} />}
              {job.orderItem.quantity != null && <InfoRow label="Quantity" value={String(job.orderItem.quantity)} />}
              {job.orderItem.unitPrice != null && <InfoRow label="Unit Price" value={formatCurrency(Number(job.orderItem.unitPrice))} />}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Notes */}
      {job.notes && (
        <Card>
          <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{job.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Operations */}
      {job.operations && job.operations.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Operations</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {job.operations.map((op: any) => (
                <div key={op.id} className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <p className="font-medium">
                      {OPERATIONS[op.operationType as keyof typeof OPERATIONS] ?? op.operationType}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline">{op.status}</Badge>
                      {op.workStation?.name && (
                        <span className="text-xs text-muted-foreground">{op.workStation.name}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    {op.estimatedMins != null && (
                      <p className="text-sm font-medium">{op.estimatedMins} min</p>
                    )}
                    <p className="text-xs text-muted-foreground">Order: {op.sortOrder}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Material Allocations */}
      {job.materialAllocations && job.materialAllocations.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Material Allocations</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {job.materialAllocations.map((alloc: any) => (
                <div key={alloc.id} className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <p className="font-medium">{alloc.material?.name}</p>
                    {alloc.material?.sku && (
                      <p className="text-xs text-muted-foreground">SKU: {alloc.material.sku}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">Qty: {String(alloc.quantity)}</p>
                    <Badge variant="outline">{alloc.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Time Entries */}
      {job.timeEntries && job.timeEntries.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Time Entries</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {job.timeEntries.map((entry: any) => (
                <div key={entry.id} className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <p className="font-medium">{entry.user?.name ?? "Unknown"}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(entry.clockIn)}
                      {entry.clockOut && ` - ${formatDate(entry.clockOut)}`}
                    </p>
                    {entry.notes && (
                      <p className="text-xs text-muted-foreground mt-1">{entry.notes}</p>
                    )}
                  </div>
                  <div className="text-right">
                    {entry.totalMins != null && (
                      <p className="text-sm font-semibold">{entry.totalMins} min</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quality Checks */}
      {job.qualityChecks && job.qualityChecks.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Quality Checks</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {job.qualityChecks.map((check: any) => (
                <div key={check.id} className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <p className="font-medium">{check.checkType ?? "QC Check"}</p>
                    {check.notes && (
                      <p className="text-xs text-muted-foreground mt-1">{check.notes}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <Badge variant={check.passed ? "success" : "destructive"}>
                      {check.passed ? "Passed" : "Failed"}
                    </Badge>
                    {check.checkedAt && (
                      <p className="text-xs text-muted-foreground mt-1">{formatDate(check.checkedAt)}</p>
                    )}
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

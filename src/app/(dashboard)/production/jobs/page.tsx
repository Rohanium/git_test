"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/tabs";
import { JOB_STATUSES } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

const STATUS_TABS = [
  { key: "all", label: "All" },
  { key: "PENDING", label: "Pending" },
  { key: "READY_TO_START", label: "Ready" },
  { key: "IN_PROGRESS", label: "In Progress" },
  { key: "QC_PENDING", label: "QC Pending" },
  { key: "COMPLETED", label: "Completed" },
];

export default function JobsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("all");

  const { data, isLoading } = trpc.production.listJobs.useQuery({
    status: activeTab === "all" ? undefined : (activeTab as any),
    page: 1,
    pageSize: 50,
  });

  const columns = [
    {
      key: "jobNumber",
      header: "Job #",
      render: (j: any) => (
        <span className="font-mono text-sm font-medium">{j.jobNumber}</span>
      ),
    },
    {
      key: "customer",
      header: "Customer",
      render: (j: any) => j.order?.company?.name ?? "—",
    },
    {
      key: "status",
      header: "Status",
      render: (j: any) => {
        const info = (JOB_STATUSES as any)[j.status];
        return <Badge variant="outline">{info?.label ?? j.status}</Badge>;
      },
    },
    {
      key: "priority",
      header: "Priority",
      render: (j: any) => (
        <Badge variant={j.priority === "URGENT" ? "destructive" : j.priority === "HIGH" ? "warning" : "secondary"}>
          {j.priority}
        </Badge>
      ),
    },
    {
      key: "operations",
      header: "Operations",
      render: (j: any) => {
        const total = j.operations?.length ?? 0;
        const completed = j.operations?.filter((o: any) => o.status === "COMPLETED").length ?? 0;
        return (
          <span className="text-sm">
            {completed}/{total} done
          </span>
        );
      },
    },
    {
      key: "dueDate",
      header: "Due",
      render: (j: any) => j.dueDate ? formatDate(j.dueDate) : "—",
    },
    {
      key: "hours",
      header: "Hours (Est/Act)",
      render: (j: any) => (
        <span className="text-sm">
          {j.estimatedHours ? Number(j.estimatedHours).toFixed(1) : "—"}
          {" / "}
          {j.actualHours ? Number(j.actualHours).toFixed(1) : "—"}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Production Jobs"
        description="All workshop production jobs."
      />

      <Tabs
        tabs={STATUS_TABS.map((t) => ({
          ...t,
          count: t.key === "all" ? data?.total : undefined,
        }))}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      <DataTable
        columns={columns}
        data={data?.jobs ?? []}
        loading={isLoading}
        emptyMessage="No jobs found. Jobs are created from confirmed orders."
        onRowClick={(j) => router.push("/production/jobs/" + j.id)}
      />
    </div>
  );
}

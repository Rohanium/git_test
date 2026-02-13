export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Overview of your joinery business operations.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Pipeline Value" value="$0" description="Active opportunities" />
        <KpiCard title="Active Jobs" value="0" description="In production" />
        <KpiCard title="Monthly Revenue" value="$0" description="This month" />
        <KpiCard title="Overdue Invoices" value="0" description="Require attention" />
      </div>

      {/* Activity sections */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border bg-card p-6">
          <h3 className="mb-4 text-lg font-semibold">Recent Quotes</h3>
          <p className="text-sm text-muted-foreground">No quotes yet.</p>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <h3 className="mb-4 text-lg font-semibold">Workshop Status</h3>
          <p className="text-sm text-muted-foreground">No active jobs.</p>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <h3 className="mb-4 text-lg font-semibold">Upcoming Deliveries</h3>
          <p className="text-sm text-muted-foreground">No deliveries scheduled.</p>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <h3 className="mb-4 text-lg font-semibold">Recent Activities</h3>
          <p className="text-sm text-muted-foreground">No recent activities.</p>
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  title,
  value,
  description,
}: {
  title: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-6">
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      <p className="mt-1 text-3xl font-bold">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

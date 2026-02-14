"use client";

import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";

export default function WorkstationsPage() {
  const { data: workstations, isLoading } = trpc.production.listWorkStations.useQuery();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Workstations"
        description="Manage workshop machines and assembly stations."
        helpText="Manage your workshop's workstations — see current capacity, assigned operations, and equipment availability."
      />

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : !workstations || workstations.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <h3 className="text-lg font-semibold">No Workstations</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Set up your workshop by adding workstations — CNC machines, panel saws, spray booths, assembly benches, etc.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {workstations.map((ws: any) => (
            <div key={ws.id} className="rounded-lg border bg-card p-5">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{ws.name}</h3>
                <Badge variant={ws.isActive ? "success" : "destructive"}>
                  {ws.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{ws.type}</p>
              {ws.location && (
                <p className="text-xs text-muted-foreground">Location: {ws.location}</p>
              )}
              <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
                <span>{ws._count?.operations ?? 0} operations</span>
                <span>{ws._count?.workOrders ?? 0} work orders</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

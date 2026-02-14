"use client";

import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";

export default function WorkOrdersPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Work Orders"
        description="Detailed work instructions for workshop operations."
        helpText="Create and assign work orders to staff and workstations — track individual tasks within larger production jobs."
        actions={<Button>+ New Work Order</Button>}
      />

      <div className="rounded-lg border border-dashed p-12 text-center">
        <h3 className="text-lg font-semibold">No Work Orders</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Work orders are generated from production jobs and contain detailed operation instructions for workshop staff.
        </p>
      </div>
    </div>
  );
}

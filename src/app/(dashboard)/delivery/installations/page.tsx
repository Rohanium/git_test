"use client";

import { PageHeader } from "@/components/ui/page-header";

export default function InstallationsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Installations"
        description="Schedule and track on-site installation work."
      />

      <div className="rounded-lg border border-dashed p-12 text-center">
        <h3 className="text-lg font-semibold">No Installations</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Installations are scheduled after deliveries. Track installation progress, customer sign-off, and snag lists.
        </p>
      </div>
    </div>
  );
}

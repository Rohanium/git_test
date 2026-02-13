"use client";

import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SchedulePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Production Schedule"
        description="Gantt-style schedule across workstations and jobs."
      />

      <Card>
        <CardHeader>
          <CardTitle>Schedule View</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-96 items-center justify-center rounded-lg border border-dashed bg-muted/30">
            <div className="text-center">
              <p className="text-lg font-semibold">Gantt Schedule</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Interactive production schedule with drag-and-drop job allocation across workstations.
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Integrates with FullCalendar for timeline/Gantt view.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

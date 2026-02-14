"use client";

import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function QualityPage() {
  const { data: defects } = trpc.quality.defectSummary.useQuery();

  const totalDefects = defects?.reduce((s, d) => s + d.count, 0) ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quality Control"
        description="Inspect jobs, log defects, and manage quality standards."
        helpText="Monitor quality control across your workshop — inspect jobs, log defects, track resolution, and maintain quality standards."
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Open Defects by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {totalDefects === 0 ? (
              <p className="py-4 text-center text-muted-foreground">No open defects.</p>
            ) : (
              <div className="space-y-3">
                {defects?.map((d) => (
                  <div key={d.category} className="flex items-center justify-between">
                    <span className="text-sm">{d.category.replace(/_/g, " ")}</span>
                    <Badge variant={d.count > 3 ? "destructive" : "warning"}>{d.count}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>QC Workflow</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-dashed p-4 text-center">
              <p className="font-medium">Pre-Finish Inspection</p>
              <p className="text-xs text-muted-foreground">Check assembly before spray/finish</p>
            </div>
            <div className="rounded-lg border border-dashed p-4 text-center">
              <p className="font-medium">Post-Finish Inspection</p>
              <p className="text-xs text-muted-foreground">Verify finish quality</p>
            </div>
            <div className="rounded-lg border border-dashed p-4 text-center">
              <p className="font-medium">Pre-Dispatch Inspection</p>
              <p className="text-xs text-muted-foreground">Final check before delivery</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

"use client";

import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function JobCostingPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Job Costing"
        description="Track actual costs vs estimates for every job."
        helpText="Analyse job profitability — compare material costs, labour hours, and overheads against quoted prices to track margins."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Avg Margin</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">—%</p>
            <p className="text-xs text-muted-foreground">Across completed jobs</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Over Budget Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">0</p>
            <p className="text-xs text-muted-foreground">Actual exceeded estimate</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Labour Efficiency</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">—%</p>
            <p className="text-xs text-muted-foreground">Est. hours vs actual hours</p>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-lg border border-dashed p-12 text-center">
        <p className="text-sm text-muted-foreground">
          Job costing data will populate as jobs are completed with time entries and material costs recorded.
        </p>
      </div>
    </div>
  );
}

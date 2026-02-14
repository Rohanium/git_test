"use client";

import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function DesignPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Design & Engineering"
        description="Manage design briefs, CAD files, and bills of materials."
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="transition-colors">
          <CardHeader>
            <CardTitle className="text-base">Design Briefs</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Capture room dimensions, style preferences, material choices, and customer requirements.
            </p>
          </CardContent>
        </Card>

        <Card className="transition-colors">
          <CardHeader>
            <CardTitle className="text-base">File Manager</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Upload and manage CAD files, 3D renders, shop drawings, and cut lists.
            </p>
          </CardContent>
        </Card>

        <Card className="transition-colors">
          <CardHeader>
            <CardTitle className="text-base">Bill of Materials</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Generate and manage BOMs from designs, auto-calculate material requirements.
            </p>
          </CardContent>
        </Card>

        <Card className="transition-colors">
          <CardHeader>
            <CardTitle className="text-base">Cut List Generator</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Optimise sheet cutting layouts for minimal wastage.
            </p>
          </CardContent>
        </Card>

        <Card className="transition-colors">
          <CardHeader>
            <CardTitle className="text-base">Customer Portal</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Share designs with customers for review and approval.
            </p>
          </CardContent>
        </Card>

        <Card className="transition-colors">
          <CardHeader>
            <CardTitle className="text-base">CAD Integration</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Import/export with Cabinet Vision, Mozaik, SketchUp, and AutoCAD.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

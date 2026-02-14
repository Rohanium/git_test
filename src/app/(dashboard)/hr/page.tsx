"use client";

import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function HRPage() {
  const { data: skillsMatrix } = trpc.hr.skillsMatrix.useQuery();

  return (
    <div className="space-y-6">
      <PageHeader
        title="HR & Workforce"
        description="Manage employees, skills, and leave."
        helpText="Manage your team — view employee profiles, track leave requests, certifications, and subcontractor details."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Skills Matrix */}
        <Card>
          <CardHeader>
            <CardTitle>Skills Matrix</CardTitle>
          </CardHeader>
          <CardContent>
            {!skillsMatrix || skillsMatrix.length === 0 ? (
              <p className="py-4 text-center text-muted-foreground">
                No employees found. Add employees and their skills to see the matrix.
              </p>
            ) : (
              <div className="space-y-4">
                {skillsMatrix.map((emp: any) => (
                  <div key={emp.employeeId} className="rounded-lg border p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{emp.name}</p>
                        <p className="text-xs text-muted-foreground">{emp.position}</p>
                      </div>
                    </div>
                    {emp.skills.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {emp.skills.map((s: any, i: number) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {s.name} ({s.proficiency}/5)
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start">
              View All Employees
            </Button>
            <Button variant="outline" className="w-full justify-start">
              Manage Leave Requests
            </Button>
            <Button variant="outline" className="w-full justify-start">
              Training & Certifications
            </Button>
            <Button variant="outline" className="w-full justify-start">
              Subcontractors
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

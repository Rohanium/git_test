"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { formatDateTime } from "@/lib/utils";

export default function TimeClockPage() {
  const [selectedJobId, setSelectedJobId] = useState("");
  const [clockOutId, setClockOutId] = useState("");
  const [breakMins, setBreakMins] = useState("0");
  const [notes, setNotes] = useState("");

  const { data: workshop } = trpc.production.workshopDashboard.useQuery();
  const { data: jobs } = trpc.production.listJobs.useQuery({
    status: "IN_PROGRESS",
    page: 1,
    pageSize: 100,
  });

  const clockInMutation = trpc.production.clockIn.useMutation({
    onSuccess: () => {
      setSelectedJobId("");
      setNotes("");
    },
  });

  const clockOutMutation = trpc.production.clockOut.useMutation({
    onSuccess: () => {
      setClockOutId("");
      setBreakMins("0");
      setNotes("");
    },
  });

  const activeEntries = workshop?.todaysTimeEntries?.filter((e: any) => !e.clockOut) ?? [];
  const completedEntries = workshop?.todaysTimeEntries?.filter((e: any) => e.clockOut) ?? [];

  const jobOptions = (jobs?.jobs ?? []).map((j: any) => ({
    value: j.id,
    label: `${j.jobNumber} — ${j.order?.company?.name ?? ""}`,
  }));

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-8">
      <PageHeader
        title="Workshop Time Clock"
        description={new Date().toLocaleDateString("en-NZ", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        helpText="Staff time tracking — clock in and out of jobs, record breaks, and review today's time entries across the workshop."
      />
      {/* Header — Large for tablet use */}
      <div className="text-center">
        <p className="mt-1 text-4xl font-bold tabular-nums">
          {new Date().toLocaleTimeString("en-NZ", { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>

      {/* Clock In */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Clock In</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Job (optional)</label>
            <Select
              options={jobOptions}
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(e.target.value)}
              placeholder="Select a job or leave blank for general time..."
            />
          </div>
          <Input
            label="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="What are you working on?"
          />
          <Button
            className="h-14 w-full text-lg"
            onClick={() =>
              clockInMutation.mutate({
                jobId: selectedJobId || undefined,
                notes: notes || undefined,
              })
            }
            disabled={clockInMutation.isPending}
          >
            {clockInMutation.isPending ? "Clocking In..." : "CLOCK IN"}
          </Button>
        </CardContent>
      </Card>

      {/* Currently Clocked In */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">
            Currently Clocked In
            <Badge variant="success" className="ml-2">{activeEntries.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeEntries.length === 0 ? (
            <p className="py-4 text-center text-muted-foreground">Nobody clocked in.</p>
          ) : (
            <div className="space-y-3">
              {activeEntries.map((entry: any) => (
                <div key={entry.id} className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <p className="text-lg font-semibold">{entry.user?.name}</p>
                    {entry.job && (
                      <p className="text-sm text-muted-foreground">
                        Job: {entry.job.jobNumber}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Since: {formatDateTime(entry.clockIn)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      placeholder="Break"
                      className="w-20"
                      value={clockOutId === entry.id ? breakMins : ""}
                      onChange={(e) => {
                        setClockOutId(entry.id);
                        setBreakMins(e.target.value);
                      }}
                    />
                    <span className="text-xs text-muted-foreground">min</span>
                    <Button
                      variant="destructive"
                      className="h-12"
                      onClick={() =>
                        clockOutMutation.mutate({
                          timeEntryId: entry.id,
                          breakMins: parseInt(breakMins) || 0,
                        })
                      }
                      disabled={clockOutMutation.isPending}
                    >
                      Clock Out
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Today's Completed */}
      <Card>
        <CardHeader>
          <CardTitle>
            Completed Today
            <Badge variant="secondary" className="ml-2">{completedEntries.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {completedEntries.length === 0 ? (
            <p className="py-4 text-center text-muted-foreground">No completed entries today.</p>
          ) : (
            <div className="space-y-2">
              {completedEntries.map((entry: any) => (
                <div key={entry.id} className="flex items-center justify-between border-b py-3 last:border-0">
                  <div>
                    <p className="font-medium">{entry.user?.name}</p>
                    {entry.job && <p className="text-xs text-muted-foreground">{entry.job.jobNumber}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">
                      {entry.totalMins ? `${Math.floor(entry.totalMins / 60)}h ${entry.totalMins % 60}m` : "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(entry.clockIn)} — {formatDateTime(entry.clockOut)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

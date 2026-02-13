"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const ACTIVITY_TYPES = [
  { value: "CALL", label: "Call" },
  { value: "EMAIL", label: "Email" },
  { value: "MEETING", label: "Meeting" },
  { value: "SITE_VISIT", label: "Site Visit" },
  { value: "SITE_MEASURE", label: "Site Measure" },
  { value: "DESIGN_REVIEW", label: "Design Review" },
  { value: "NOTE", label: "Note" },
  { value: "TASK", label: "Task" },
  { value: "FOLLOW_UP", label: "Follow Up" },
];

const typeIcons: Record<string, string> = {
  CALL: "phone",
  EMAIL: "mail",
  MEETING: "users",
  SITE_VISIT: "map-pin",
  SITE_MEASURE: "ruler",
  DESIGN_REVIEW: "pencil",
  NOTE: "file-text",
  TASK: "check-square",
  FOLLOW_UP: "clock",
};

export default function ActivitiesPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    type: "CALL" as string,
    subject: "",
    description: "",
  });

  const createMutation = trpc.crm.createActivity.useMutation({
    onSuccess: () => {
      setShowCreate(false);
      setForm({ type: "CALL", subject: "", description: "" });
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Activities"
        description="Log calls, meetings, site visits, and other interactions."
        actions={
          <Button onClick={() => setShowCreate(true)}>+ Log Activity</Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        {ACTIVITY_TYPES.map((type) => (
          <div
            key={type.value}
            className="cursor-pointer rounded-lg border bg-card p-4 transition-colors hover:bg-muted/50"
            onClick={() => {
              setForm({ ...form, type: type.value });
              setShowCreate(true);
            }}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <span className="text-sm font-bold">{type.label[0]}</span>
              </div>
              <div>
                <p className="font-medium">{type.label}</p>
                <p className="text-xs text-muted-foreground">Log a new {type.label.toLowerCase()}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-lg border bg-card p-6">
        <h3 className="mb-4 text-lg font-semibold">Recent Activity</h3>
        <p className="text-sm text-muted-foreground">
          No activities logged yet. Start logging interactions with your contacts and leads.
        </p>
      </div>

      <Modal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="Log Activity"
        description="Record an interaction or task."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate({
              type: form.type as any,
              subject: form.subject,
              description: form.description || undefined,
            });
          }}
          className="space-y-4"
        >
          <div>
            <label className="mb-1.5 block text-sm font-medium">Type</label>
            <Select
              options={ACTIVITY_TYPES}
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            />
          </div>
          <Input
            label="Subject"
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
            placeholder="Brief description of the activity"
            required
          />
          <Textarea
            label="Notes"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Additional details..."
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Saving..." : "Log Activity"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

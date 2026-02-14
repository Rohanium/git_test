"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { PIPELINE_STAGES } from "@/lib/constants";
import { cn } from "@/lib/utils";

export default function OpportunitiesPage() {
  const router = useRouter();
  const [view, setView] = useState<"board" | "list">("board");

  const { data: pipeline } = trpc.crm.pipelineSummary.useQuery();

  const stages = PIPELINE_STAGES.filter((s) => s.key !== "WON" && s.key !== "LOST");

  // Fetch opportunities for each active stage
  const enquiries = trpc.crm.listOpportunities.useQuery({ stage: "ENQUIRY", page: 1, pageSize: 50 });
  const siteMeasure = trpc.crm.listOpportunities.useQuery({ stage: "SITE_MEASURE", page: 1, pageSize: 50 });
  const design = trpc.crm.listOpportunities.useQuery({ stage: "DESIGN", page: 1, pageSize: 50 });
  const quoting = trpc.crm.listOpportunities.useQuery({ stage: "QUOTING", page: 1, pageSize: 50 });
  const negotiation = trpc.crm.listOpportunities.useQuery({ stage: "NEGOTIATION", page: 1, pageSize: 50 });

  const stageData: Record<string, any> = {
    ENQUIRY: enquiries.data,
    SITE_MEASURE: siteMeasure.data,
    DESIGN: design.data,
    QUOTING: quoting.data,
    NEGOTIATION: negotiation.data,
  };

  const pipelineTotal = pipeline?.reduce((sum, s) => sum + Number(s.totalValue ?? 0), 0) ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Opportunities"
        description={`Sales pipeline — ${formatCurrency(pipelineTotal)} total value`}
        helpText="Your sales pipeline as a Kanban board — drag opportunities through stages from Enquiry to Won, and click any card to view full details."
        actions={
          <div className="flex items-center gap-2">
            <div className="flex rounded-md border">
              <button
                onClick={() => setView("board")}
                className={cn(
                  "px-3 py-1.5 text-sm",
                  view === "board" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                )}
              >
                Board
              </button>
              <button
                onClick={() => setView("list")}
                className={cn(
                  "px-3 py-1.5 text-sm",
                  view === "list" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                )}
              >
                List
              </button>
            </div>
          </div>
        }
      />

      {/* Pipeline summary */}
      <div className="grid grid-cols-5 gap-3">
        {stages.map((stage) => {
          const stageInfo = pipeline?.find((p) => p.stage === stage.key);
          return (
            <div
              key={stage.key}
              className="rounded-lg border p-3 text-center"
              style={{ borderTopColor: stage.color, borderTopWidth: 3 }}
            >
              <p className="text-xs font-medium text-muted-foreground">{stage.label}</p>
              <p className="text-lg font-bold">{stageInfo?.count ?? 0}</p>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(Number(stageInfo?.totalValue ?? 0))}
              </p>
            </div>
          );
        })}
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-5 gap-4">
        {stages.map((stage) => {
          const opportunities = stageData[stage.key]?.opportunities ?? [];
          return (
            <div key={stage.key} className="space-y-2">
              <div
                className="rounded-t-md px-3 py-2 text-sm font-medium text-white"
                style={{ backgroundColor: stage.color }}
              >
                {stage.label} ({opportunities.length})
              </div>
              <div className="space-y-2">
                {opportunities.length === 0 ? (
                  <div className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
                    No opportunities
                  </div>
                ) : (
                  opportunities.map((opp: any) => (
                    <div
                      key={opp.id}
                      className="cursor-pointer rounded-md border bg-card p-3 shadow-sm transition-shadow hover:shadow-md"
                      onClick={() => router.push("/crm/opportunities/" + opp.id)}
                    >
                      <p className="text-sm font-medium">{opp.title}</p>
                      {opp.company && (
                        <p className="text-xs text-muted-foreground">{opp.company.name}</p>
                      )}
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-sm font-semibold text-primary">
                          {formatCurrency(Number(opp.estimatedValue))}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {opp.probability}%
                        </span>
                      </div>
                      {opp.owner && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {opp.owner.name}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

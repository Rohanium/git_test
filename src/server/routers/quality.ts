import { z } from "zod";
import { createTRPCRouter, protectedProcedure, roleRestrictedProcedure } from "../trpc";

export const qualityRouter = createTRPCRouter({
  createCheck: roleRestrictedProcedure("ADMIN", "WORKSHOP_MANAGER")
    .input(
      z.object({
        jobId: z.string(),
        checkType: z.string(),
        checklistItems: z.array(z.object({ checkItem: z.string() })),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.qualityCheck.create({
        data: {
          jobId: input.jobId,
          checkType: input.checkType,
          checklistItems: { create: input.checklistItems },
        },
        include: { checklistItems: true },
      });
    }),

  completeCheck: roleRestrictedProcedure("ADMIN", "WORKSHOP_MANAGER")
    .input(
      z.object({
        qualityCheckId: z.string(),
        overallResult: z.enum(["PASS", "FAIL", "CONDITIONAL_PASS"]),
        notes: z.string().optional(),
        checklistResults: z.array(
          z.object({
            id: z.string(),
            passed: z.boolean(),
            notes: z.string().optional(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Update each checklist item
      await Promise.all(
        input.checklistResults.map((item) =>
          ctx.db.qCChecklistItem.update({
            where: { id: item.id },
            data: { passed: item.passed, notes: item.notes },
          })
        )
      );

      return ctx.db.qualityCheck.update({
        where: { id: input.qualityCheckId },
        data: {
          overallResult: input.overallResult,
          status: input.overallResult === "FAIL" ? "REJECTED" : "ACCEPTED",
          inspectedAt: new Date(),
          notes: input.notes,
        },
      });
    }),

  logDefect: roleRestrictedProcedure("ADMIN", "WORKSHOP_MANAGER", "WORKSHOP_STAFF")
    .input(
      z.object({
        qualityCheckId: z.string(),
        category: z.enum([
          "MATERIAL", "CUTTING", "MACHINING", "ASSEMBLY", "FINISH", "HARDWARE", "DESIGN", "OTHER",
        ]),
        severity: z.enum(["MINOR", "MAJOR", "CRITICAL"]),
        description: z.string().min(1),
        photoUrls: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.defect.create({
        data: {
          ...input,
          photoUrls: input.photoUrls ?? [],
        },
      });
    }),

  defectSummary: protectedProcedure.query(async ({ ctx }) => {
    const defects = await ctx.db.defect.groupBy({
      by: ["category"],
      _count: { id: true },
      where: { resolvedAt: null },
    });

    return defects.map((d) => ({
      category: d.category,
      count: d._count.id,
    }));
  }),
});

import { z } from "zod";
import { createTRPCRouter, protectedProcedure, roleRestrictedProcedure } from "../trpc";

export const hrRouter = createTRPCRouter({
  listEmployees: roleRestrictedProcedure("ADMIN")
    .query(async ({ ctx }) => {
      return ctx.db.employee.findMany({
        include: {
          user: { select: { id: true, name: true, email: true, role: true, isActive: true } },
          skills: true,
        },
        orderBy: { user: { name: "asc" } },
      });
    }),

  getEmployee: roleRestrictedProcedure("ADMIN")
    .input(z.string())
    .query(async ({ ctx, input }) => {
      return ctx.db.employee.findUniqueOrThrow({
        where: { id: input },
        include: {
          user: true,
          skills: true,
          leaveRecords: { orderBy: { startDate: "desc" } },
        },
      });
    }),

  addSkill: roleRestrictedProcedure("ADMIN")
    .input(
      z.object({
        employeeId: z.string(),
        skillName: z.string().min(1),
        proficiency: z.number().int().min(1).max(5),
        certifiedDate: z.date().optional(),
        expiryDate: z.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.employeeSkill.create({ data: input });
    }),

  requestLeave: protectedProcedure
    .input(
      z.object({
        type: z.enum(["ANNUAL", "SICK", "BEREAVEMENT", "PARENTAL", "UNPAID", "PUBLIC_HOLIDAY", "OTHER"]),
        startDate: z.date(),
        endDate: z.date(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = (ctx.session.user as { id: string }).id;
      const employee = await ctx.db.employee.findUniqueOrThrow({
        where: { userId },
      });

      return ctx.db.leaveRecord.create({
        data: { ...input, employeeId: employee.id },
      });
    }),

  approveLeave: roleRestrictedProcedure("ADMIN")
    .input(
      z.object({
        leaveId: z.string(),
        approved: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.leaveRecord.update({
        where: { id: input.leaveId },
        data: { status: input.approved ? "APPROVED" : "REJECTED" },
      });
    }),

  skillsMatrix: roleRestrictedProcedure("ADMIN", "WORKSHOP_MANAGER")
    .query(async ({ ctx }) => {
      const employees = await ctx.db.employee.findMany({
        include: {
          user: { select: { name: true, isActive: true } },
          skills: true,
        },
        where: { user: { isActive: true } },
      });

      return employees.map((emp) => ({
        employeeId: emp.id,
        name: emp.user.name,
        position: emp.position,
        skills: emp.skills.map((s) => ({
          name: s.skillName,
          proficiency: s.proficiency,
          certified: s.certifiedDate,
          expires: s.expiryDate,
        })),
      }));
    }),
});

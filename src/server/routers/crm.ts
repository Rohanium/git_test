import { z } from "zod";
import { CompanyType } from "@prisma/client";
import {
  createTRPCRouter,
  protectedProcedure,
  roleRestrictedProcedure,
} from "../trpc";

export const crmRouter = createTRPCRouter({
  // ── Contacts ──────────────────────────────────────────────
  listContacts: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        companyId: z.string().optional(),
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(25),
      })
    )
    .query(async ({ ctx, input }) => {
      const where = {
        isActive: true,
        ...(input.companyId && { companyId: input.companyId }),
        ...(input.search && {
          OR: [
            { firstName: { contains: input.search, mode: "insensitive" as const } },
            { lastName: { contains: input.search, mode: "insensitive" as const } },
            { email: { contains: input.search, mode: "insensitive" as const } },
          ],
        }),
      };

      const [contacts, total] = await Promise.all([
        ctx.db.contact.findMany({
          where,
          include: { company: true },
          skip: (input.page - 1) * input.pageSize,
          take: input.pageSize,
          orderBy: { lastName: "asc" },
        }),
        ctx.db.contact.count({ where }),
      ]);

      return { contacts, total, pages: Math.ceil(total / input.pageSize) };
    }),

  getContact: protectedProcedure
    .input(z.string())
    .query(async ({ ctx, input }) => {
      return ctx.db.contact.findUniqueOrThrow({
        where: { id: input },
        include: {
          company: true,
          leads: true,
          opportunities: true,
          activities: { orderBy: { createdAt: "desc" }, take: 20 },
        },
      });
    }),

  createContact: protectedProcedure
    .input(
      z.object({
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        mobile: z.string().optional(),
        jobTitle: z.string().optional(),
        companyId: z.string().optional(),
        isPrimary: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.contact.create({ data: input });
    }),

  updateContact: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        firstName: z.string().min(1).optional(),
        lastName: z.string().min(1).optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        mobile: z.string().optional(),
        jobTitle: z.string().optional(),
        companyId: z.string().nullable().optional(),
        isPrimary: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.contact.update({ where: { id }, data });
    }),

  // ── Companies ─────────────────────────────────────────────
  listCompanies: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        type: z.nativeEnum(CompanyType).optional(),
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(25),
      }).partial()
    )
    .query(async ({ ctx, input }) => {
      const where = {
        isActive: true,
        ...(input?.type && { type: input.type }),
        ...(input?.search && {
          name: { contains: input.search, mode: "insensitive" as const },
        }),
      };

      const page = input?.page ?? 1;
      const pageSize = input?.pageSize ?? 25;

      const [companies, total] = await Promise.all([
        ctx.db.company.findMany({
          where,
          include: { _count: { select: { contacts: true, orders: true } } },
          skip: (page - 1) * pageSize,
          take: pageSize,
          orderBy: { name: "asc" },
        }),
        ctx.db.company.count({ where }),
      ]);

      return { companies, total, pages: Math.ceil(total / pageSize) };
    }),

  getCompany: protectedProcedure
    .input(z.string())
    .query(async ({ ctx, input }) => {
      return ctx.db.company.findUniqueOrThrow({
        where: { id: input },
        include: {
          contacts: { where: { isActive: true }, orderBy: { lastName: "asc" } },
          orders: { include: { _count: { select: { jobs: true, invoices: true } } }, orderBy: { createdAt: "desc" }, take: 10 },
          opportunities: { include: { owner: true }, orderBy: { updatedAt: "desc" }, take: 10 },
          leads: { orderBy: { createdAt: "desc" }, take: 10 },
        },
      });
    }),

  createCompany: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        type: z.enum([
          "CUSTOMER",
          "SUPPLIER",
          "ARCHITECT",
          "BUILDER",
          "INTERIOR_DESIGNER",
          "SUBCONTRACTOR",
          "OTHER",
        ]).default("CUSTOMER"),
        phone: z.string().optional(),
        email: z.string().email().optional(),
        website: z.string().url().optional(),
        addressLine1: z.string().optional(),
        addressLine2: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        postcode: z.string().optional(),
        country: z.string().default("NZ"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.company.create({ data: input });
    }),

  // ── Leads ─────────────────────────────────────────────────
  listLeads: protectedProcedure
    .input(
      z.object({
        status: z.enum(["NEW", "CONTACTED", "QUALIFIED", "UNQUALIFIED", "CONVERTED", "LOST"]).optional(),
        assignedToId: z.string().optional(),
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(25),
      })
    )
    .query(async ({ ctx, input }) => {
      const where = {
        ...(input.status && { status: input.status }),
        ...(input.assignedToId && { assignedToId: input.assignedToId }),
      };

      const [leads, total] = await Promise.all([
        ctx.db.lead.findMany({
          where,
          include: { contact: true, company: true, assignedTo: true },
          skip: (input.page - 1) * input.pageSize,
          take: input.pageSize,
          orderBy: { createdAt: "desc" },
        }),
        ctx.db.lead.count({ where }),
      ]);

      return { leads, total, pages: Math.ceil(total / input.pageSize) };
    }),

  getLead: protectedProcedure
    .input(z.string())
    .query(async ({ ctx, input }) => {
      return ctx.db.lead.findUniqueOrThrow({
        where: { id: input },
        include: {
          contact: true,
          company: true,
          assignedTo: true,
          activities: { orderBy: { createdAt: "desc" }, take: 20 },
        },
      });
    }),

  createLead: roleRestrictedProcedure("ADMIN", "SALES")
    .input(
      z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        source: z.enum([
          "WEBSITE", "REFERRAL_ARCHITECT", "REFERRAL_BUILDER", "REFERRAL_CLIENT",
          "TRADE_SHOW", "SOCIAL_MEDIA", "WALK_IN", "PHONE", "EMAIL", "ADVERTISING", "OTHER",
        ]),
        estimatedValue: z.number().positive().optional(),
        projectType: z.enum([
          "KITCHEN", "BATHROOM_VANITY", "WARDROBE", "LAUNDRY", "STUDY_OFFICE",
          "ENTERTAINMENT_UNIT", "BOOKCASE_SHELVING", "DOORS", "WINDOWS", "STAIRCASE",
          "CUSTOM_FURNITURE", "COMMERCIAL_FITOUT", "EXTERIOR_JOINERY", "OTHER",
        ]).optional(),
        contactId: z.string().optional(),
        companyId: z.string().optional(),
        assignedToId: z.string().optional(),
        address: z.string().optional(),
        city: z.string().optional(),
        postcode: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.lead.create({ data: input });
    }),

  // ── Opportunities ─────────────────────────────────────────
  listOpportunities: protectedProcedure
    .input(
      z.object({
        stage: z.enum([
          "ENQUIRY", "SITE_MEASURE", "DESIGN", "QUOTING", "NEGOTIATION", "WON", "LOST",
        ]).optional(),
        ownerId: z.string().optional(),
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(25),
      })
    )
    .query(async ({ ctx, input }) => {
      const where = {
        ...(input.stage && { stage: input.stage }),
        ...(input.ownerId && { ownerId: input.ownerId }),
      };

      const [opportunities, total] = await Promise.all([
        ctx.db.opportunity.findMany({
          where,
          include: { contact: true, company: true, owner: true },
          skip: (input.page - 1) * input.pageSize,
          take: input.pageSize,
          orderBy: { updatedAt: "desc" },
        }),
        ctx.db.opportunity.count({ where }),
      ]);

      return { opportunities, total, pages: Math.ceil(total / input.pageSize) };
    }),

  getOpportunity: protectedProcedure
    .input(z.string())
    .query(async ({ ctx, input }) => {
      return ctx.db.opportunity.findUniqueOrThrow({
        where: { id: input },
        include: {
          contact: true,
          company: true,
          owner: true,
          activities: { orderBy: { createdAt: "desc" }, take: 20 },
          quotes: { orderBy: { createdAt: "desc" } },
        },
      });
    }),

  // ── Pipeline Summary ──────────────────────────────────────
  pipelineSummary: protectedProcedure.query(async ({ ctx }) => {
    const stages = await ctx.db.opportunity.groupBy({
      by: ["stage"],
      _count: { id: true },
      _sum: { estimatedValue: true },
    });

    return stages.map((s) => ({
      stage: s.stage,
      count: s._count.id,
      totalValue: s._sum.estimatedValue,
    }));
  }),

  // ── Activities ────────────────────────────────────────────
  createActivity: protectedProcedure
    .input(
      z.object({
        type: z.enum([
          "CALL", "EMAIL", "MEETING", "SITE_VISIT", "SITE_MEASURE",
          "DESIGN_REVIEW", "NOTE", "TASK", "FOLLOW_UP",
        ]),
        subject: z.string().min(1),
        description: z.string().optional(),
        scheduledAt: z.date().optional(),
        contactId: z.string().optional(),
        leadId: z.string().optional(),
        opportunityId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.activity.create({
        data: {
          ...input,
          userId: (ctx.session.user as { id: string }).id,
        },
      });
    }),
});

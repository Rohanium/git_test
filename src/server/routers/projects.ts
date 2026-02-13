import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, roleRestrictedProcedure } from "../trpc";

export const projectsRouter = createTRPCRouter({
  // ── Queries ──────────────────────────────────────────────────

  list: protectedProcedure
    .input(
      z.object({
        status: z.enum([
          "PLANNING", "DESIGN", "QUOTING", "APPROVED", "IN_PRODUCTION",
          "ON_HOLD", "READY_FOR_DELIVERY", "INSTALLING", "COMPLETED", "CANCELLED",
        ]).optional(),
        companyId: z.string().optional(),
        managedById: z.string().optional(),
        projectType: z.enum([
          "KITCHEN", "BATHROOM_VANITY", "WARDROBE", "LAUNDRY", "STUDY_OFFICE",
          "ENTERTAINMENT_UNIT", "BOOKCASE_SHELVING", "DOORS", "WINDOWS",
          "STAIRCASE", "CUSTOM_FURNITURE", "COMMERCIAL_FITOUT", "EXTERIOR_JOINERY", "OTHER",
        ]).optional(),
        search: z.string().optional(),
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(25),
      })
    )
    .query(async ({ ctx, input }) => {
      const where = {
        ...(input.status && { status: input.status }),
        ...(input.companyId && { companyId: input.companyId }),
        ...(input.managedById && { managedById: input.managedById }),
        ...(input.projectType && { projectType: input.projectType }),
        ...(input.search && {
          OR: [
            { name: { contains: input.search, mode: "insensitive" as const } },
            { projectNumber: { contains: input.search, mode: "insensitive" as const } },
            { description: { contains: input.search, mode: "insensitive" as const } },
          ],
        }),
      };

      const [projects, total] = await Promise.all([
        ctx.db.project.findMany({
          where,
          include: {
            company: true,
            contact: true,
            managedBy: { select: { id: true, name: true } },
            _count: { select: { jobs: true, quotes: true, invoices: true } },
          },
          skip: (input.page - 1) * input.pageSize,
          take: input.pageSize,
          orderBy: { createdAt: "desc" },
        }),
        ctx.db.project.count({ where }),
      ]);

      return { projects, total, pages: Math.ceil(total / input.pageSize) };
    }),

  getById: protectedProcedure.input(z.string()).query(async ({ ctx, input }) => {
    return ctx.db.project.findUniqueOrThrow({
      where: { id: input },
      include: {
        company: true,
        contact: true,
        managedBy: { select: { id: true, name: true, email: true } },
        opportunity: true,
        jobs: {
          include: {
            _count: { select: { operations: true } },
          },
          orderBy: { createdAt: "asc" },
        },
        quotes: {
          include: {
            _count: { select: { lineItems: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        invoices: {
          include: {
            payments: true,
          },
          orderBy: { issueDate: "desc" },
        },
        deliveries: { orderBy: { scheduledDate: "asc" } },
        plannedInvoices: { orderBy: { plannedDate: "asc" } },
        changeOrders: { orderBy: { createdAt: "desc" } },
        designBrief: true,
        cvImports: { orderBy: { createdAt: "desc" } },
      },
    });
  }),

  getTimeline: protectedProcedure.input(z.string()).query(async ({ ctx, input }) => {
    const project = await ctx.db.project.findUniqueOrThrow({
      where: { id: input },
      select: {
        id: true,
        projectNumber: true,
        name: true,
        startDate: true,
        targetDate: true,
        jobs: {
          select: {
            id: true,
            jobNumber: true,
            status: true,
            startDate: true,
            dueDate: true,
            installDate: true,
            materialOrderByDate: true,
            productionStartDate: true,
            materialLeadDays: true,
            operations: {
              select: {
                id: true,
                operationType: true,
                sortOrder: true,
                status: true,
                estimatedMins: true,
                scheduledStartDate: true,
                scheduledEndDate: true,
                latestStartDate: true,
                startedAt: true,
                completedAt: true,
              },
              orderBy: { sortOrder: "asc" },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    return project;
  }),

  getCashflow: protectedProcedure.input(z.string()).query(async ({ ctx, input }) => {
    const project = await ctx.db.project.findUniqueOrThrow({
      where: { id: input },
      include: {
        plannedInvoices: { orderBy: { plannedDate: "asc" } },
        invoices: {
          include: { payments: true },
          orderBy: { issueDate: "asc" },
        },
      },
    });

    const totalQuoted = Number(project.totalQuoted);
    const totalInvoiced = Number(project.totalInvoiced);
    const totalPaid = Number(project.totalPaid);
    const outstanding = totalInvoiced - totalPaid;

    return {
      plannedInvoices: project.plannedInvoices,
      invoices: project.invoices,
      totalQuoted,
      totalInvoiced,
      totalPaid,
      outstanding,
    };
  }),

  getDashboard: protectedProcedure.query(async ({ ctx }) => {
    const now = new Date();

    // Projects grouped by status
    const projectsByStatus = await ctx.db.project.groupBy({
      by: ["status"],
      _count: { id: true },
    });

    // Total pipeline value (sum of totalQuoted for active projects)
    const pipelineValue = await ctx.db.project.aggregate({
      where: {
        status: {
          notIn: ["COMPLETED", "CANCELLED"],
        },
      },
      _sum: { totalQuoted: true, totalBudget: true },
    });

    // Projects at risk: overdue (targetDate passed, not completed/cancelled)
    const overdueProjects = await ctx.db.project.findMany({
      where: {
        targetDate: { lt: now },
        status: {
          notIn: ["COMPLETED", "CANCELLED"],
        },
      },
      include: {
        company: true,
        managedBy: { select: { id: true, name: true } },
      },
      orderBy: { targetDate: "asc" },
    });

    // Upcoming milestones: planned invoices in next 30 days
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const upcomingMilestones = await ctx.db.plannedInvoice.findMany({
      where: {
        plannedDate: { gte: now, lte: thirtyDaysFromNow },
        status: "PLANNED",
      },
      include: {
        project: { select: { id: true, projectNumber: true, name: true } },
      },
      orderBy: { plannedDate: "asc" },
    });

    return {
      projectsByStatus: projectsByStatus.map((g) => ({
        status: g.status,
        count: g._count.id,
      })),
      pipelineValue: {
        totalQuoted: Number(pipelineValue._sum.totalQuoted ?? 0),
        totalBudget: Number(pipelineValue._sum.totalBudget ?? 0),
      },
      overdueProjects,
      upcomingMilestones,
    };
  }),

  // ── Mutations ────────────────────────────────────────────────

  create: roleRestrictedProcedure("ADMIN", "SALES")
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        companyId: z.string(),
        contactId: z.string().optional(),
        opportunityId: z.string().optional(),
        projectType: z.enum([
          "KITCHEN", "BATHROOM_VANITY", "WARDROBE", "LAUNDRY", "STUDY_OFFICE",
          "ENTERTAINMENT_UNIT", "BOOKCASE_SHELVING", "DOORS", "WINDOWS",
          "STAIRCASE", "CUSTOM_FURNITURE", "COMMERCIAL_FITOUT", "EXTERIOR_JOINERY", "OTHER",
        ]).optional(),
        priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).default("NORMAL"),
        startDate: z.date().optional(),
        targetDate: z.date().optional(),
        siteAddress: z.string().optional(),
        siteCity: z.string().optional(),
        sitePostcode: z.string().optional(),
        siteNotes: z.string().optional(),
        totalBudget: z.number().optional(),
        managedById: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Auto-generate projectNumber: PRJ-YYYY-XXXX
      const now = new Date();
      const prefix = `PRJ-${now.getFullYear()}`;
      const count = await ctx.db.project.count({
        where: { projectNumber: { startsWith: prefix } },
      });
      const projectNumber = `${prefix}-${String(count + 1).padStart(4, "0")}`;

      return ctx.db.project.create({
        data: {
          ...input,
          projectNumber,
        },
        include: {
          company: true,
          contact: true,
          managedBy: { select: { id: true, name: true } },
        },
      });
    }),

  update: roleRestrictedProcedure("ADMIN", "SALES")
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        companyId: z.string().optional(),
        contactId: z.string().optional(),
        projectType: z.enum([
          "KITCHEN", "BATHROOM_VANITY", "WARDROBE", "LAUNDRY", "STUDY_OFFICE",
          "ENTERTAINMENT_UNIT", "BOOKCASE_SHELVING", "DOORS", "WINDOWS",
          "STAIRCASE", "CUSTOM_FURNITURE", "COMMERCIAL_FITOUT", "EXTERIOR_JOINERY", "OTHER",
        ]).optional(),
        priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).optional(),
        startDate: z.date().optional(),
        targetDate: z.date().optional(),
        siteAddress: z.string().optional(),
        siteCity: z.string().optional(),
        sitePostcode: z.string().optional(),
        siteNotes: z.string().optional(),
        totalBudget: z.number().optional(),
        managedById: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.project.update({
        where: { id },
        data,
        include: {
          company: true,
          contact: true,
          managedBy: { select: { id: true, name: true } },
        },
      });
    }),

  updateStatus: roleRestrictedProcedure("ADMIN", "SALES", "WORKSHOP_MANAGER")
    .input(
      z.object({
        id: z.string(),
        status: z.enum([
          "PLANNING", "DESIGN", "QUOTING", "APPROVED", "IN_PRODUCTION",
          "ON_HOLD", "READY_FOR_DELIVERY", "INSTALLING", "COMPLETED", "CANCELLED",
        ]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Validate status transitions
      if (input.status === "IN_PRODUCTION") {
        // Can't go to IN_PRODUCTION without at least one approved quote
        const approvedQuotes = await ctx.db.quote.count({
          where: {
            projectId: input.id,
            status: "APPROVED",
          },
        });

        if (approvedQuotes === 0) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Cannot move to IN_PRODUCTION without at least one approved quote.",
          });
        }
      }

      return ctx.db.project.update({
        where: { id: input.id },
        data: {
          status: input.status,
          ...(input.status === "COMPLETED" && { completedDate: new Date() }),
        },
      });
    }),

  createFromOpportunity: roleRestrictedProcedure("ADMIN", "SALES")
    .input(z.string()) // opportunityId
    .mutation(async ({ ctx, input: opportunityId }) => {
      const opportunity = await ctx.db.opportunity.findUniqueOrThrow({
        where: { id: opportunityId },
        include: {
          company: true,
          contact: true,
          designBrief: true,
        },
      });

      // Ensure opportunity is won
      if (opportunity.stage !== "WON") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Only WON opportunities can be converted to projects.",
        });
      }

      // Ensure a project doesn't already exist for this opportunity
      const existingProject = await ctx.db.project.findUnique({
        where: { opportunityId },
      });
      if (existingProject) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `A project already exists for this opportunity: ${existingProject.projectNumber}`,
        });
      }

      // Generate project number
      const now = new Date();
      const prefix = `PRJ-${now.getFullYear()}`;
      const count = await ctx.db.project.count({
        where: { projectNumber: { startsWith: prefix } },
      });
      const projectNumber = `${prefix}-${String(count + 1).padStart(4, "0")}`;

      // Create the project with data copied from the opportunity
      const project = await ctx.db.project.create({
        data: {
          projectNumber,
          name: opportunity.title,
          description: opportunity.description,
          projectType: opportunity.projectType,
          companyId: opportunity.companyId!,
          contactId: opportunity.contactId ?? undefined,
          opportunityId,
          totalBudget: opportunity.estimatedValue,
          managedById: opportunity.ownerId,
        },
        include: {
          company: true,
          contact: true,
          managedBy: { select: { id: true, name: true } },
        },
      });

      // If there's a design brief on the opportunity, link it to the project too
      if (opportunity.designBrief) {
        await ctx.db.designBrief.update({
          where: { id: opportunity.designBrief.id },
          data: { projectId: project.id },
        });
      }

      return project;
    }),

  addJob: roleRestrictedProcedure("ADMIN", "SALES", "WORKSHOP_MANAGER")
    .input(
      z.object({
        projectId: z.string(),
        name: z.string().min(1),
        description: z.string().optional(),
        priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).default("NORMAL"),
        operations: z.array(
          z.enum([
            "CUTTING", "CNC_MACHINING", "EDGE_BANDING", "DRILLING", "ROUTING",
            "SANDING", "ASSEMBLY", "FITTING_HARDWARE", "SPRAY_PREP", "SPRAY_PAINTING",
            "STAINING", "LACQUERING", "HAND_FINISHING", "GLAZING", "PACKING", "OTHER",
          ])
        ).min(1),
        estimatedHours: z.number().optional(),
        materialCost: z.number().default(0),
        labourCost: z.number().default(0),
        hardwareCost: z.number().default(0),
        marginPercent: z.number().optional(),
        sellPrice: z.number().default(0),
        installDate: z.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { projectId, name, description, operations, ...jobData } = input;

      // Verify project exists
      await ctx.db.project.findUniqueOrThrow({ where: { id: projectId } });

      // Generate job number: JOB-YYYYMM-XXXX
      const now = new Date();
      const prefix = `JOB-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
      const count = await ctx.db.job.count({
        where: { jobNumber: { startsWith: prefix } },
      });
      const jobNumber = `${prefix}-${String(count + 1).padStart(4, "0")}`;

      // Calculate totalCost
      const totalCost = jobData.materialCost + jobData.labourCost + jobData.hardwareCost;

      // Calculate backward-scheduled dates from installDate
      let materialOrderByDate: Date | undefined;
      let productionStartDate: Date | undefined;
      if (jobData.installDate) {
        // Default: production starts 10 working days before install
        const prodLeadDays = 10;
        productionStartDate = new Date(jobData.installDate);
        productionStartDate.setDate(productionStartDate.getDate() - prodLeadDays);

        // Default: materials ordered 5 days before production start (unless materialLeadDays is set)
        const materialLeadDays = 5;
        materialOrderByDate = new Date(productionStartDate);
        materialOrderByDate.setDate(materialOrderByDate.getDate() - materialLeadDays);
      }

      const job = await ctx.db.job.create({
        data: {
          jobNumber,
          projectId,
          notes: description ? `${name}\n${description}` : name,
          priority: jobData.priority,
          estimatedHours: jobData.estimatedHours,
          materialCost: jobData.materialCost,
          labourCost: jobData.labourCost,
          hardwareCost: jobData.hardwareCost,
          totalCost,
          marginPercent: jobData.marginPercent,
          sellPrice: jobData.sellPrice,
          installDate: jobData.installDate,
          materialOrderByDate,
          productionStartDate,
          materialLeadDays: 5,
          operations: {
            create: operations.map((opType, index) => ({
              operationType: opType,
              sortOrder: index,
            })),
          },
        },
        include: {
          operations: { orderBy: { sortOrder: "asc" } },
        },
      });

      return job;
    }),

  addPlannedInvoice: roleRestrictedProcedure("ADMIN", "SALES", "ACCOUNTS")
    .input(
      z.object({
        projectId: z.string(),
        description: z.string().min(1),
        amount: z.number().positive(),
        plannedDate: z.date(),
        milestone: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify project exists
      await ctx.db.project.findUniqueOrThrow({ where: { id: input.projectId } });

      return ctx.db.plannedInvoice.create({
        data: input,
      });
    }),

  updatePlannedInvoice: roleRestrictedProcedure("ADMIN", "SALES", "ACCOUNTS")
    .input(
      z.object({
        id: z.string(),
        description: z.string().min(1).optional(),
        amount: z.number().positive().optional(),
        plannedDate: z.date().optional(),
        milestone: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      // Verify planned invoice exists and is still PLANNED
      const planned = await ctx.db.plannedInvoice.findUniqueOrThrow({
        where: { id },
      });

      if (planned.status !== "PLANNED") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Can only update planned invoices that are still in PLANNED status.",
        });
      }

      return ctx.db.plannedInvoice.update({
        where: { id },
        data,
      });
    }),

  deletePlannedInvoice: roleRestrictedProcedure("ADMIN", "SALES", "ACCOUNTS")
    .input(z.string())
    .mutation(async ({ ctx, input: id }) => {
      const planned = await ctx.db.plannedInvoice.findUniqueOrThrow({
        where: { id },
      });

      if (planned.status === "INVOICED") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Cannot delete a planned invoice that has already been invoiced.",
        });
      }

      return ctx.db.plannedInvoice.delete({ where: { id } });
    }),

  generateInvoiceFromPlan: roleRestrictedProcedure("ADMIN", "ACCOUNTS")
    .input(
      z.object({
        plannedInvoiceId: z.string(),
        dueDate: z.date(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const planned = await ctx.db.plannedInvoice.findUniqueOrThrow({
        where: { id: input.plannedInvoiceId },
        include: { project: true },
      });

      if (planned.status !== "PLANNED") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "This planned invoice has already been processed.",
        });
      }

      // Generate invoice number
      const now = new Date();
      const prefix = `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
      const count = await ctx.db.invoice.count({
        where: { invoiceNumber: { startsWith: prefix } },
      });
      const invoiceNumber = `${prefix}-${String(count + 1).padStart(4, "0")}`;

      const amount = Number(planned.amount);
      const taxAmount = amount * 0.15; // 15% GST
      const total = amount + taxAmount;

      // Create the actual invoice
      const invoice = await ctx.db.invoice.create({
        data: {
          invoiceNumber,
          type: "PROGRESS",
          projectId: planned.projectId,
          dueDate: input.dueDate,
          notes: input.notes ?? `${planned.description}${planned.milestone ? ` - ${planned.milestone}` : ""}`,
          subtotal: amount,
          taxAmount,
          total,
          lineItems: {
            create: [
              {
                description: planned.description,
                quantity: 1,
                unitPrice: amount,
                lineTotal: amount,
              },
            ],
          },
        },
        include: { lineItems: true },
      });

      // Mark planned invoice as invoiced
      await ctx.db.plannedInvoice.update({
        where: { id: input.plannedInvoiceId },
        data: {
          status: "INVOICED",
          actualInvoiceId: invoice.id,
        },
      });

      // Update project totalInvoiced
      const projectInvoices = await ctx.db.invoice.findMany({
        where: { projectId: planned.projectId },
      });
      const totalInvoiced = projectInvoices.reduce(
        (sum: number, inv: { total: any }) => sum + Number(inv.total),
        0
      );

      await ctx.db.project.update({
        where: { id: planned.projectId },
        data: { totalInvoiced },
      });

      return invoice;
    }),
});

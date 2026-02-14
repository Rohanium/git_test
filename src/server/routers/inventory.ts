import { z } from "zod";
import { createTRPCRouter, protectedProcedure, roleRestrictedProcedure } from "../trpc";
import { allocateMaterialsForJob, generatePurchaseOrderFromShortfalls } from "../services/material-allocation";

export const inventoryRouter = createTRPCRouter({
  // ── Materials ─────────────────────────────────────────────
  listMaterials: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        categoryId: z.string().optional(),
        lowStock: z.boolean().optional(), // Filter to only low-stock items
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(25),
      })
    )
    .query(async ({ ctx, input }) => {
      const where = {
        isActive: true,
        ...(input.categoryId && { categoryId: input.categoryId }),
        ...(input.search && {
          OR: [
            { name: { contains: input.search, mode: "insensitive" as const } },
            { sku: { contains: input.search, mode: "insensitive" as const } },
          ],
        }),
      };

      const [materials, total] = await Promise.all([
        ctx.db.material.findMany({
          where,
          include: {
            category: true,
            stockItems: true,
            _count: { select: { supplierMaterials: true } },
          },
          skip: (input.page - 1) * input.pageSize,
          take: input.pageSize,
          orderBy: { name: "asc" },
        }),
        ctx.db.material.count({ where }),
      ]);

      return { materials, total, pages: Math.ceil(total / input.pageSize) };
    }),

  getMaterial: protectedProcedure
    .input(z.string())
    .query(async ({ ctx, input }) => {
      return ctx.db.material.findUniqueOrThrow({
        where: { id: input },
        include: {
          category: true,
          stockItems: true,
          supplierMaterials: { include: { supplier: { include: { company: true } } } },
        },
      });
    }),

  createMaterial: roleRestrictedProcedure("ADMIN", "WORKSHOP_MANAGER")
    .input(
      z.object({
        sku: z.string().min(1),
        name: z.string().min(1),
        description: z.string().optional(),
        unit: z.string().min(1),
        unitCost: z.number().positive(),
        sellPrice: z.number().positive().optional(),
        minStock: z.number().optional(),
        maxStock: z.number().optional(),
        reorderPoint: z.number().optional(),
        reorderQty: z.number().optional(),
        leadTimeDays: z.number().int().optional(),
        categoryId: z.string().optional(),
        specifications: z.record(z.unknown()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.material.create({ data: input as any });
    }),

  // ── Stock Movements ───────────────────────────────────────
  recordStockMovement: roleRestrictedProcedure("ADMIN", "WORKSHOP_MANAGER", "WORKSHOP_STAFF")
    .input(
      z.object({
        materialId: z.string(),
        type: z.enum([
          "RECEIPT", "ISSUE", "RETURN", "ADJUSTMENT", "TRANSFER", "WASTAGE", "WRITE_OFF",
        ]),
        quantity: z.number(),
        reference: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.stockMovement.create({ data: input });
    }),

  // ── Purchase Orders ───────────────────────────────────────
  listPurchaseOrders: protectedProcedure
    .input(
      z.object({
        status: z.enum(["DRAFT", "SENT", "ACKNOWLEDGED", "PARTIALLY_RECEIVED", "RECEIVED", "CANCELLED"]).optional(),
        supplierId: z.string().optional(),
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(25),
      })
    )
    .query(async ({ ctx, input }) => {
      const where = {
        ...(input.status && { status: input.status }),
        ...(input.supplierId && { supplierId: input.supplierId }),
      };

      const [purchaseOrders, total] = await Promise.all([
        ctx.db.purchaseOrder.findMany({
          where,
          include: {
            supplier: { include: { company: true } },
            _count: { select: { lineItems: true } },
          },
          skip: (input.page - 1) * input.pageSize,
          take: input.pageSize,
          orderBy: { createdAt: "desc" },
        }),
        ctx.db.purchaseOrder.count({ where }),
      ]);

      return { purchaseOrders, total, pages: Math.ceil(total / input.pageSize) };
    }),

  createPurchaseOrder: roleRestrictedProcedure("ADMIN", "WORKSHOP_MANAGER")
    .input(
      z.object({
        supplierId: z.string(),
        expectedDate: z.date().optional(),
        notes: z.string().optional(),
        lineItems: z.array(
          z.object({
            materialId: z.string(),
            quantity: z.number().positive(),
            unitCost: z.number().positive(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const now = new Date();
      const prefix = `PO-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
      const count = await ctx.db.purchaseOrder.count({
        where: { poNumber: { startsWith: prefix } },
      });
      const poNumber = `${prefix}-${String(count + 1).padStart(4, "0")}`;

      const lineItemsWithTotals = input.lineItems.map((li) => ({
        ...li,
        lineTotal: li.quantity * li.unitCost,
      }));

      const subtotal = lineItemsWithTotals.reduce((sum, li) => sum + li.lineTotal, 0);
      const taxAmount = subtotal * 0.15;
      const total = subtotal + taxAmount;

      return ctx.db.purchaseOrder.create({
        data: {
          poNumber,
          supplierId: input.supplierId,
          expectedDate: input.expectedDate,
          notes: input.notes,
          subtotal,
          taxAmount,
          total,
          lineItems: { create: lineItemsWithTotals },
        },
        include: { lineItems: true },
      });
    }),

  // ── Suppliers ─────────────────────────────────────────────
  listSuppliers: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.supplier.findMany({
      include: {
        company: true,
        _count: { select: { purchaseOrders: true, supplierMaterials: true } },
      },
      orderBy: { company: { name: "asc" } },
    });
  }),

  getSupplier: protectedProcedure
    .input(z.string())
    .query(async ({ ctx, input }) => {
      return ctx.db.supplier.findUniqueOrThrow({
        where: { id: input },
        include: {
          company: true,
          supplierMaterials: { include: { material: true } },
          purchaseOrders: { orderBy: { createdAt: "desc" }, take: 10, include: { _count: { select: { lineItems: true } } } },
        },
      });
    }),

  // ── Material Allocation ────────────────────────────────────
  allocateMaterials: roleRestrictedProcedure("ADMIN", "WORKSHOP_MANAGER")
    .input(
      z.object({
        jobId: z.string(),
        requirements: z.array(
          z.object({
            materialId: z.string(),
            quantity: z.number().positive(),
          })
        ),
        autoGeneratePOs: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await allocateMaterialsForJob(
        ctx.db as any,
        input.jobId,
        input.requirements
      );

      let generatedPOs: string[] = [];
      if (input.autoGeneratePOs && result.shortfalls.length > 0) {
        generatedPOs = await generatePurchaseOrderFromShortfalls(
          ctx.db as any,
          result.shortfalls
        );
      }

      return {
        ...result,
        generatedPOs,
      };
    }),

  getJobAllocations: protectedProcedure
    .input(z.string())
    .query(async ({ ctx, input: jobId }) => {
      return ctx.db.materialAllocation.findMany({
        where: { jobId },
        include: { material: true },
        orderBy: { createdAt: "desc" },
      });
    }),

  // ── Stock Summary ─────────────────────────────────────────
  stockSummary: protectedProcedure.query(async ({ ctx }) => {
    const materials = await ctx.db.material.findMany({
      where: { isActive: true },
      include: { stockItems: true },
    });

    return materials.map((m) => {
      const totalQty = m.stockItems.reduce((sum, si) => sum + Number(si.quantity), 0);
      const totalValue = m.stockItems.reduce(
        (sum, si) => sum + Number(si.quantity) * Number(si.costPerUnit),
        0
      );
      const isLowStock = m.reorderPoint ? totalQty <= Number(m.reorderPoint) : false;

      return {
        id: m.id,
        sku: m.sku,
        name: m.name,
        unit: m.unit,
        totalQuantity: totalQty,
        totalValue,
        reorderPoint: m.reorderPoint ? Number(m.reorderPoint) : null,
        isLowStock,
      };
    });
  }),
});

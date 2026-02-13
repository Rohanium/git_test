import { PrismaClient } from "@prisma/client";

/**
 * Material Allocation Service
 *
 * Handles reserving stock against jobs and generating purchase orders
 * for any shortfalls.
 */

interface AllocationResult {
  allocated: { materialId: string; materialName: string; quantity: number; status: "RESERVED" | "SHORTFALL" }[];
  shortfalls: { materialId: string; materialName: string; shortfallQty: number; suggestedSupplierId?: string }[];
}

export async function allocateMaterialsForJob(
  db: PrismaClient,
  jobId: string,
  requirements: { materialId: string; quantity: number }[]
): Promise<AllocationResult> {
  const allocated: AllocationResult["allocated"] = [];
  const shortfalls: AllocationResult["shortfalls"] = [];

  for (const req of requirements) {
    const material = await db.material.findUniqueOrThrow({
      where: { id: req.materialId },
      include: {
        stockItems: true,
        supplierMaterials: {
          where: { isPreferred: true },
          include: { supplier: true },
        },
      },
    });

    // Calculate available stock (total - already allocated)
    const totalStock = material.stockItems.reduce(
      (sum, si) => sum + Number(si.quantity),
      0
    );

    const existingAllocations = await db.materialAllocation.aggregate({
      where: {
        materialId: req.materialId,
        status: { in: ["RESERVED", "PICKED"] },
      },
      _sum: { quantity: true },
    });

    const alreadyAllocated = Number(existingAllocations._sum.quantity ?? 0);
    const available = totalStock - alreadyAllocated;

    if (available >= req.quantity) {
      // Full allocation possible
      await db.materialAllocation.create({
        data: {
          materialId: req.materialId,
          jobId,
          quantity: req.quantity,
          status: "RESERVED",
        },
      });

      allocated.push({
        materialId: req.materialId,
        materialName: material.name,
        quantity: req.quantity,
        status: "RESERVED",
      });
    } else {
      // Partial or no allocation
      if (available > 0) {
        await db.materialAllocation.create({
          data: {
            materialId: req.materialId,
            jobId,
            quantity: available,
            status: "RESERVED",
          },
        });

        allocated.push({
          materialId: req.materialId,
          materialName: material.name,
          quantity: available,
          status: "RESERVED",
        });
      }

      const shortfallQty = req.quantity - Math.max(available, 0);
      shortfalls.push({
        materialId: req.materialId,
        materialName: material.name,
        shortfallQty,
        suggestedSupplierId: material.supplierMaterials[0]?.supplierId,
      });
    }
  }

  return { allocated, shortfalls };
}

export async function generatePurchaseOrderFromShortfalls(
  db: PrismaClient,
  shortfalls: AllocationResult["shortfalls"]
): Promise<string[]> {
  // Group shortfalls by supplier
  const bySupplier: Record<string, { materialId: string; quantity: number }[]> = {};

  for (const sf of shortfalls) {
    if (!sf.suggestedSupplierId) continue;
    if (!bySupplier[sf.suggestedSupplierId]) {
      bySupplier[sf.suggestedSupplierId] = [];
    }
    bySupplier[sf.suggestedSupplierId].push({
      materialId: sf.materialId,
      quantity: sf.shortfallQty,
    });
  }

  const poIds: string[] = [];

  for (const [supplierId, items] of Object.entries(bySupplier)) {
    // Look up supplier material costs
    const lineItems = await Promise.all(
      items.map(async (item) => {
        const supplierMat = await db.supplierMaterial.findFirst({
          where: { supplierId, materialId: item.materialId },
        });
        const material = await db.material.findUnique({
          where: { id: item.materialId },
        });

        const unitCost = supplierMat
          ? Number(supplierMat.unitCost)
          : material
            ? Number(material.unitCost)
            : 0;

        // Apply minimum order quantity if set
        const moq = supplierMat?.moq ? Number(supplierMat.moq) : 0;
        const orderQty = Math.max(item.quantity, moq);

        return {
          materialId: item.materialId,
          quantity: orderQty,
          unitCost,
          lineTotal: orderQty * unitCost,
        };
      })
    );

    const now = new Date();
    const prefix = `PO-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
    const count = await db.purchaseOrder.count({
      where: { poNumber: { startsWith: prefix } },
    });
    const poNumber = `${prefix}-${String(count + 1).padStart(4, "0")}`;

    const subtotal = lineItems.reduce((s, li) => s + li.lineTotal, 0);
    const taxAmount = subtotal * 0.15;

    const po = await db.purchaseOrder.create({
      data: {
        poNumber,
        supplierId,
        subtotal,
        taxAmount,
        total: subtotal + taxAmount,
        notes: "Auto-generated from material shortfall",
        lineItems: { create: lineItems },
      },
    });

    poIds.push(po.id);
  }

  return poIds;
}

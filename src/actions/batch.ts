"use server";

import { prisma } from "@/lib/prisma";
import { AnimalCategory, AnimalCondition, BatchStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";

export async function createBatch(data: {
  date: Date;
  providerId: string;
  slaughterhouseId?: string;
  description?: string;
}) {
  try {
    const batch = await prisma.batch.create({
      data: {
        date: data.date,
        providerId: data.providerId,
        slaughterhouseId: data.slaughterhouseId?.trim() || null,
        description: data.description,
        status: "OPEN",
      },
    });
    
    revalidatePath("/operaciones/lotes");
    return { success: true, data: batch };
  } catch (error: any) {
    console.error("Error creating batch:", error);
    return { success: false, error: error.message };
  }
}

export async function addBatchDetail(data: {
  batchId: string;
  category: AnimalCategory;
  condition: AnimalCondition;
  quantity: number;
  netWeight: number;
}) {
  try {
    const batch = await prisma.batch.findUnique({
      where: { id: data.batchId },
    });

    if (!batch || batch.status !== "OPEN") {
      throw new Error("Lote no encontrado o ya no está abierto");
    }

    const detail = await prisma.batchDetail.create({
      data: {
        batchId: data.batchId,
        category: data.category,
        condition: data.condition,
        quantity: data.quantity,
        netWeight: data.netWeight,
      },
    });
    
    revalidatePath(`/operaciones/lotes/${data.batchId}`);
    return { success: true, data: detail };
  } catch (error: any) {
    console.error("Error adding batch detail:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteBatchDetail(id: string, batchId: string) {
  try {
    await prisma.batchDetail.delete({
      where: { id },
    });
    
    revalidatePath(`/operaciones/lotes/${batchId}`);
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting batch detail:", error);
    return { success: false, error: error.message };
  }
}

export async function closeBatch(data: {
  batchId: string;
  discountPercentage: number;
  prices: {
    category: AnimalCategory;
    liquidWeight: number;
    pricePerKg: number;
  }[];
}) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const batch = await tx.batch.findUnique({
        where: { id: data.batchId },
        include: { details: true, provider: true },
      });

      if (!batch || batch.status !== "OPEN") {
        throw new Error("Lote inválido o ya cerrado");
      }

      if (batch.details.length === 0) {
        throw new Error("El lote no tiene romaneo (pesajes)");
      }

      const mermaPercent = data.discountPercentage;
      
      let totalNetWeight = 0;
      const categoryNetWeights: Record<string, number> = {};

      batch.details.forEach((detail) => {
        totalNetWeight += detail.netWeight;
        categoryNetWeights[detail.category] = (categoryNetWeights[detail.category] || 0) + detail.netWeight;
      });

      const totalDiscountWeight = totalNetWeight * (mermaPercent / 100);
      const totalLiquidWeight = totalNetWeight - totalDiscountWeight;

      // Validate that the assigned liquid weights per category match exactly the calculated liquid weight for that category
      let totalValue = 0;
      
      for (const [category, netWeight] of Object.entries(categoryNetWeights)) {
        const expectedLiquidWeight = netWeight * (1 - (mermaPercent / 100));
        
        // Sum weights assigned to this category
        const assignedWeight = data.prices
          .filter(p => p.category === category)
          .reduce((acc, curr) => acc + curr.liquidWeight, 0);

        // Allow a tiny margin of floating point error
        if (Math.abs(expectedLiquidWeight - assignedWeight) > 0.1) {
          throw new Error(`Los kilos asignados para ${category} (${assignedWeight.toFixed(2)}) no coinciden con los kilos líquidos disponibles (${expectedLiquidWeight.toFixed(2)}).`);
        }
      }

      // Calculate total value based on the exact segments
      data.prices.forEach(segment => {
        totalValue += segment.liquidWeight * segment.pricePerKg;
      });

      // 1. Cerrar Lote
      await tx.batch.update({
        where: { id: data.batchId },
        data: { status: "CLOSED" },
      });

      // 2. Crear Closure y los Segmentos
      const closure = await tx.batchClosure.create({
        data: {
          batchId: data.batchId,
          discountApplied: true,
          discountPercentage: mermaPercent,
          totalNetWeight,
          totalDiscountWeight,
          totalLiquidWeight,
          totalValue,
          prices: {
            create: data.prices.map(p => ({
              category: p.category,
              liquidWeight: p.liquidWeight,
              pricePerKg: p.pricePerKg,
              totalValue: p.liquidWeight * p.pricePerKg
            }))
          }
        },
      });

      // 3. Crear Cuenta por Pagar (AccountPayable)
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7);

      await tx.accountPayable.create({
        data: {
          sourceId: data.batchId,
          type: "BATCH_PURCHASE",
          providerId: batch.providerId,
          amount: totalValue,
          status: "PENDING",
          dueDate,
        }
      });

      return closure;
    });

    revalidatePath("/operaciones/lotes");
    revalidatePath(`/operaciones/lotes/${data.batchId}`);
    return { success: true, data: result };
  } catch (error: any) {
    console.error("Error closing batch:", error);
    return { success: false, error: error.message };
  }
}

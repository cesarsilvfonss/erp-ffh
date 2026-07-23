"use server";

import { prisma } from "@/lib/prisma";
import { AnimalCondition, BatchStatus } from "@prisma/client";
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
  itemId: string;
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
        itemId: data.itemId,
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

export async function updateBatchDetail(data: {
  id: string;
  batchId: string;
  itemId: string;
  condition: AnimalCondition;
  quantity: number;
  netWeight: number;
}) {
  try {
    const detail = await prisma.batchDetail.update({
      where: { id: data.id },
      data: {
        itemId: data.itemId,
        condition: data.condition,
        quantity: data.quantity,
        netWeight: data.netWeight,
      },
    });
    
    revalidatePath(`/operaciones/lotes/${data.batchId}`);
    return { success: true, data: detail };
  } catch (error: any) {
    console.error("Error updating batch detail:", error);
    return { success: false, error: error.message };
  }
}

export async function closeBatch(batchId: string, payload: {
  discountPercentage: number;
  prices: { itemId: string; pricePerKg: number; liquidWeight: number }[];
}) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const batch = await tx.batch.findUnique({
        where: { id: batchId },
        include: { details: true, provider: true },
      });

      if (!batch || batch.status !== "OPEN") {
        throw new Error("Lote inválido o ya cerrado");
      }

      if (batch.details.length === 0) {
        throw new Error("El lote no tiene romaneo (pesajes)");
      }

      const totalNetWeight = batch.details.reduce((acc, d) => acc + d.netWeight, 0);
      const totalDiscountWeight = totalNetWeight * (payload.discountPercentage / 100);
      const totalLiquidWeight = totalNetWeight - totalDiscountWeight;

      let totalValue = 0;

      // Calculate total value based on the exact segments
      payload.prices.forEach(segment => {
        totalValue += segment.liquidWeight * segment.pricePerKg;
      });

      // 1. Cerrar Lote
      await tx.batch.update({
        where: { id: batchId },
        data: { status: "CLOSED" },
      });

      // 2. Crear Closure y los Segmentos
      const totalHeads = batch.details.reduce((acc, d) => acc + d.quantity, 0);

      const closure = await tx.batchClosure.create({
        data: {
          batchId: batchId,
          totalHeads,
          totalGrossWeight: totalNetWeight,
          discountWeight: totalDiscountWeight,
          totalLiquidWeight,
          totalValue,
          discountAmount: 0,
          netValue: totalValue,
          prices: {
            create: payload.prices.map(p => ({
              itemId: p.itemId,
              liquidWeight: p.liquidWeight,
              pricePerKg: p.pricePerKg
            }))
          }
        },
      });

      // 3. Crear Cuenta por Pagar (AccountPayable)
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7);

      await tx.accountPayable.create({
        data: {
          sourceId: batchId,
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
    revalidatePath(`/operaciones/lotes/${batchId}`);
    return { success: true, data: result };
  } catch (error: any) {
    console.error("Error closing batch:", error);
    return { success: false, error: error.message };
  }
}

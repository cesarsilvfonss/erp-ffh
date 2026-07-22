"use server";

import { prisma } from "@/lib/prisma";
import { AnimalCategory, AnimalCondition, BatchStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";

export async function createBatch(data: {
  date: Date;
  providerId: string;
  description?: string;
}) {
  try {
    const batch = await prisma.batch.create({
      data: {
        date: data.date,
        providerId: data.providerId,
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
  prices: {
    VACA?: number;
    TORO?: number;
    VAQUILLA?: number;
    NOVILLO?: number;
  };
}) {
  try {
    // Usar una transacción para asegurar consistencia
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

      // Obtener el % de merma configurado (por defecto 4 si no está configurado)
      const mermaParam = await tx.parameter.findUnique({ where: { key: "MERMA_DEFAULT" } });
      const mermaPercent = mermaParam ? parseFloat(mermaParam.value) : 4.0;

      // Calcular pesos y valor
      let totalNetWeight = 0;
      let totalValue = 0;

      batch.details.forEach((detail) => {
        totalNetWeight += detail.netWeight;
        
        // Calcular valor por categoría: (Peso Neto - Merma) * Precio
        const liquidWeight = detail.netWeight * (1 - (mermaPercent / 100));
        const price = data.prices[detail.category] || 0;
        
        totalValue += liquidWeight * price;
      });

      const totalDiscountWeight = totalNetWeight * (mermaPercent / 100);
      const totalLiquidWeight = totalNetWeight - totalDiscountWeight;

      // 1. Cerrar Lote
      await tx.batch.update({
        where: { id: data.batchId },
        data: { status: "CLOSED" },
      });

      // 2. Crear Closure
      const closure = await tx.batchClosure.create({
        data: {
          batchId: data.batchId,
          priceVaca: data.prices.VACA,
          priceToro: data.prices.TORO,
          priceVaquilla: data.prices.VAQUILLA,
          priceNovillo: data.prices.NOVILLO,
          discountApplied: true,
          discountPercentage: mermaPercent,
          totalNetWeight,
          totalDiscountWeight,
          totalLiquidWeight,
          totalValue,
        },
      });

      // 3. Crear Cuenta por Pagar (AccountPayable)
      // Vencimiento a 7 días por defecto si no hay regla explícita
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

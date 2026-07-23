"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

import { SlaughterCondition } from "@prisma/client";

export async function initiateFaena(batchId: string) {
  try {
    const slaughter = await prisma.slaughter.create({
      data: {
        batchId,
        date: new Date(),
        status: "OPEN"
      }
    });
    
    // Update batch status to IN_SLAUGHTER
    await prisma.batch.update({
      where: { id: batchId },
      data: { status: "IN_SLAUGHTER" }
    });
    
    revalidatePath("/operaciones/faena");
    revalidatePath("/operaciones/lotes");
    
    return { success: true, data: slaughter };
  } catch (error: any) {
    console.error("Error initiating faena:", error);
    return { success: false, error: error.message };
  }
}

export async function addFaenaDetail(data: {
  slaughterId: string;
  itemId: string;
  condition: SlaughterCondition;
  weight: number;
}) {
  try {
    // Buscar la última para calcular el sequenceNumber
    const lastDetail = await prisma.slaughterDetail.findFirst({
      where: { slaughterId: data.slaughterId },
      orderBy: { sequenceNumber: "desc" }
    });
    const nextSeq = lastDetail ? lastDetail.sequenceNumber + 1 : 1;

    const detail = await prisma.slaughterDetail.create({
      data: {
        slaughterId: data.slaughterId,
        itemId: data.itemId,
        condition: data.condition,
        weight: data.weight,
        sequenceNumber: nextSeq
      }
    });
    
    revalidatePath(`/operaciones/faena/${data.slaughterId}`);
    return { success: true, data: detail };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteFaenaDetail(id: string, slaughterId: string) {
  try {
    await prisma.slaughterDetail.delete({ where: { id } });
    revalidatePath(`/operaciones/faena/${slaughterId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function closeFaena(slaughterId: string, payload: { totalWeight: number, yieldPercent: number }) {
  try {
    await prisma.$transaction(async (tx) => {
      const slaughter = await tx.slaughter.update({
        where: { id: slaughterId },
        data: { 
          status: "CLOSED",
          totalWeight: payload.totalWeight,
          yield: payload.yieldPercent
        },
        include: { details: true, batch: true }
      });

      // Agrupar peso al gancho por itemId
      const weightPerItem = slaughter.details.reduce((acc, d) => {
        if (!acc[d.itemId]) acc[d.itemId] = 0;
        acc[d.itemId] += d.weight;
        return acc;
      }, {} as Record<string, number>);

      // Para cada artículo, actualizar inventario y registrar movimiento
      for (const [itemId, totalItemWeight] of Object.entries(weightPerItem)) {
        // Buscar inventario actual o crearlo
        const inventory = await tx.inventory.upsert({
          where: { itemId },
          update: { currentStock: { increment: totalItemWeight } },
          create: { itemId, currentStock: totalItemWeight, averageCost: 0 } // Costo se calcula luego si es necesario
        });

        // Registrar movimiento de Entrada
        await tx.inventoryMovement.create({
          data: {
            itemId,
            type: "IN",
            quantity: totalItemWeight,
            stockAfter: inventory.currentStock, // currentStock ya está actualizado por upsert
            reference: `Faena Lote #${slaughter.batch.batchNumber}`,
            description: `Rendimiento de faena al gancho`
          }
        });
      }

      // Cambiar estado del lote a CLOSED (ya estaba cerrado en compras, pero por las dudas)
      await tx.batch.update({
        where: { id: slaughter.batchId },
        data: { status: "CLOSED" } 
      });
    });

    revalidatePath("/operaciones/faena");
    revalidatePath(`/operaciones/faena/${slaughterId}`);

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

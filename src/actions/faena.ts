"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function initiateFaena(batchId: string) {
  try {
    const slaughter = await prisma.slaughter.create({
      data: {
        batchId,
        date: new Date(),
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
  weight: number;
}) {
  try {
    const detail = await prisma.slaughterDetail.create({
      data: {
        slaughterId: data.slaughterId,
        itemId: data.itemId,
        weight: data.weight,
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
          totalCarcassWeight: payload.totalWeight,
          performance: payload.yieldPercent
        },
        include: { details: true, batch: { include: { closure: { include: { prices: true } } } } }
      });

      // Agrupar peso al gancho por itemId
      const weightPerItem = slaughter.details.reduce((acc, d) => {
        if (!acc[d.itemId]) acc[d.itemId] = 0;
        acc[d.itemId] += d.weight;
        return acc;
      }, {} as Record<string, number>);

      // Para cada artículo, actualizar inventario y registrar movimiento
      for (const [itemId, totalItemWeight] of Object.entries(weightPerItem)) {
        // Encontrar cuánto se pagó por este artículo en el romaneo (closure)
        let totalPaidForItem = 0;
        if (slaughter.batch.closure && slaughter.batch.closure.prices) {
          const pricesForItem = slaughter.batch.closure.prices.filter((p: any) => p.itemId === itemId);
          totalPaidForItem = pricesForItem.reduce((sum: number, p: any) => sum + (p.liquidWeight * p.pricePerKg), 0);
        }

        // Costo Unitario = Total pagado por el artículo en el Romaneo / Kilos Totales al Gancho de ese artículo
        const unitCost = totalItemWeight > 0 ? totalPaidForItem / totalItemWeight : 0;

        // Crear InventoryLot para este batch
        const inventoryLot = await tx.inventoryLot.create({
          data: {
            batchId: slaughter.batchId,
            itemId: itemId,
            initialStock: totalItemWeight,
            currentStock: totalItemWeight,
            unitCost: unitCost
          }
        });

        // Registrar movimiento de Entrada apuntando al lote
        await tx.inventoryMovement.create({
          data: {
            inventoryLotId: inventoryLot.id,
            itemId: itemId,
            type: "IN",
            quantity: totalItemWeight,
            referenceId: slaughterId,
            concept: `Faena Lote #${slaughter.batch.batchNumber}`
          }
        });
      }

      // Cambiar estado del lote a CLOSED
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

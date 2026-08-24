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

export async function addBulkFaenaDetail(data: {
  slaughterId: string;
  itemId: string;
  totalWeight: number;
  heads: number;
}) {
  try {
    // 1 res = 2 medias reses (2 details).
    const numberOfDetails = data.heads * 2;
    const weightPerDetail = data.totalWeight / numberOfDetails;
    
    const detailsToCreate = Array.from({ length: numberOfDetails }).map(() => ({
      slaughterId: data.slaughterId,
      itemId: data.itemId,
      weight: weightPerDetail,
    }));

    await prisma.slaughterDetail.createMany({
      data: detailsToCreate,
    });
    
    revalidatePath(`/operaciones/faena/${data.slaughterId}`);
    return { success: true, count: numberOfDetails };
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

export async function sendBatchToLiveSale(batchId: string) {
  try {
    await prisma.$transaction(async (tx) => {
      const batch = await tx.batch.findUnique({
        where: { id: batchId },
        include: { details: true, closure: { include: { prices: true } } }
      });

      if (!batch || batch.status !== "CLOSED") {
        throw new Error("El lote debe estar cerrado (Romaneo) para enviarlo a Venta en Pie.");
      }

      // Para cada artículo en el lote, creamos su InventoryLot
      const weightPerItem = batch.details.reduce((acc, d) => {
        if (!acc[d.itemId]) acc[d.itemId] = 0;
        acc[d.itemId] += d.netWeight; // usamos el peso neto de la compra
        return acc;
      }, {} as Record<string, number>);

      for (const [itemId, totalWeight] of Object.entries(weightPerItem)) {
        // Encontrar cuánto se pagó por este artículo en el romaneo (closure)
        let unitCost = 0;
        let liquidWeightToStock = totalWeight;

        if (batch.closure && batch.closure.prices) {
          const priceForItem = batch.closure.prices.find((p: any) => p.itemId === itemId);
          if (priceForItem) {
            unitCost = priceForItem.pricePerKg;
            liquidWeightToStock = priceForItem.liquidWeight; // usamos el peso líquido final tras mermas si existe
          }
        }

        // Crear InventoryLot para este batch
        const inventoryLot = await tx.inventoryLot.create({
          data: {
            batchId: batch.id,
            itemId: itemId,
            initialStock: liquidWeightToStock,
            currentStock: liquidWeightToStock,
            unitCost: unitCost
          }
        });

        // Registrar movimiento de Entrada apuntando al lote
        await tx.inventoryMovement.create({
          data: {
            inventoryLotId: inventoryLot.id,
            itemId: itemId,
            type: "IN",
            quantity: liquidWeightToStock,
            referenceId: batchId,
            concept: `Ingreso por Venta en Pie - Lote #${batch.batchNumber}`
          }
        });
      }

      // Marcamos el lote como isLiveSale para que no aparezca en Faena
      await tx.batch.update({
        where: { id: batchId },
        data: { isLiveSale: true }
      });
    });

    revalidatePath("/operaciones/faena");
    revalidatePath("/inventario");

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

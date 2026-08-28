"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { checkPeriodClosure } from "@/lib/closure";

export async function initiateFaena(batchId: string) {
  try {
    await checkPeriodClosure(new Date());
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
    await checkPeriodClosure(new Date());

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

export async function registerMenudencias(data: {
  batchId: string;
  quantity: number;
}) {
  try {
    const { batchId, quantity } = data;
    await checkPeriodClosure(new Date());

    if (!quantity || isNaN(quantity) || quantity <= 0) {
      throw new Error("La cantidad debe ser mayor a 0.");
    }

    await prisma.$transaction(async (tx) => {
      const batch = await tx.batch.findUnique({
        where: { id: batchId },
        include: { details: true, slaughter: { include: { details: true } } }
      });

      if (!batch) {
        throw new Error("Lote no encontrado.");
      }

      let totalHeads = batch.details.reduce((acc, d) => acc + d.quantity, 0);
      if (batch.isHookPurchase && batch.slaughter) {
        totalHeads = Math.ceil(batch.slaughter.details.length / 2);
      }

      if (quantity > totalHeads && totalHeads > 0) { // If totalHeads is 0 (just started hook purchase), we might bypass or let it be. Actually, totalHeads is 0 at the start.
        throw new Error(`La cantidad de menudencias (${quantity}) no puede superar la cantidad de animales del lote (${totalHeads}).`);
      }

      let item = await tx.item.findUnique({
        where: { code: "MENUDENCIA-LOTE" }
      });

      if (!item) {
        item = await tx.item.create({
          data: {
            code: "MENUDENCIA-LOTE",
            name: "Lote de Menudencias",
            category: "Menudencia",
            unit: "UN",
            isSlaughterable: false,
            description: "Menudencias generadas por faena de un lote"
          }
        });
      }

      const existingLot = await tx.inventoryLot.findFirst({
        where: {
          batchId: batchId,
          itemId: item.id
        }
      });

      if (existingLot) {
        await tx.inventoryLot.update({
          where: { id: existingLot.id },
          data: {
            initialStock: existingLot.initialStock + quantity,
            currentStock: existingLot.currentStock + quantity
          }
        });

        await tx.inventoryMovement.create({
          data: {
            inventoryLotId: existingLot.id,
            itemId: item.id,
            type: "IN",
            quantity: quantity,
            referenceId: batchId,
            concept: `Carga adicional de Menudencias Lote #${batch.batchNumber}`
          }
        });
      } else {
        const newLot = await tx.inventoryLot.create({
          data: {
            batchId: batchId,
            itemId: item.id,
            initialStock: quantity,
            currentStock: quantity,
            unitCost: 0 // Menudencias gratis como premio
          }
        });

        await tx.inventoryMovement.create({
          data: {
            inventoryLotId: newLot.id,
            itemId: item.id,
            type: "IN",
            quantity: quantity,
            referenceId: batchId,
            concept: `Carga inicial de Menudencias Lote #${batch.batchNumber}`
          }
        });
      }
    });

    revalidatePath(`/operaciones/faena/${batchId}`);
    revalidatePath("/inventario");

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createHookPurchase(data: {
  date: Date;
  providerId: string;
  slaughterhouseId?: string;
  description?: string;
}) {
  try {
    await checkPeriodClosure(new Date(data.date));

    const result = await prisma.$transaction(async (tx) => {
      const batch = await tx.batch.create({
        data: {
          date: data.date,
          providerId: data.providerId,
          slaughterhouseId: data.slaughterhouseId?.trim() || null,
          description: data.description?.toUpperCase(),
          status: "IN_SLAUGHTER",
          isHookPurchase: true,
        },
      });

      const slaughter = await tx.slaughter.create({
        data: {
          batchId: batch.id,
          date: new Date(),
        }
      });
      return slaughter;
    });
    
    revalidatePath("/operaciones/faena");
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function closeHookPurchase(slaughterId: string, payload: { 
  prices: { itemId: string; pricePerKg: number; liquidWeight: number }[]
}) {
  try {
    await checkPeriodClosure(new Date());

    await prisma.$transaction(async (tx) => {
      const slaughter = await tx.slaughter.findUnique({
        where: { id: slaughterId },
        include: { details: true, batch: true }
      });
      if (!slaughter) throw new Error("Faena no encontrada");

      const totalWeight = slaughter.details.reduce((acc, d) => acc + d.weight, 0);
      let totalValue = 0;

      payload.prices.forEach(segment => {
        totalValue += segment.liquidWeight * segment.pricePerKg;
      });

      // 1. Update Slaughter
      await tx.slaughter.update({
        where: { id: slaughterId },
        data: { 
          totalCarcassWeight: totalWeight,
          performance: 100 
        }
      });

      // 2. Create BatchClosure
      const closure = await tx.batchClosure.create({
        data: {
          batchId: slaughter.batchId,
          totalHeads: Math.ceil(slaughter.details.length / 2),
          totalGrossWeight: totalWeight,
          discountWeight: 0,
          totalLiquidWeight: totalWeight,
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

      // 3. Create InventoryLots
      const weightPerItem = slaughter.details.reduce((acc, d) => {
        if (!acc[d.itemId]) acc[d.itemId] = 0;
        acc[d.itemId] += d.weight;
        return acc;
      }, {} as Record<string, number>);

      for (const [itemId, totalItemWeight] of Object.entries(weightPerItem)) {
        let totalPaidForItem = 0;
        const pricesForItem = payload.prices.filter((p: any) => p.itemId === itemId);
        totalPaidForItem = pricesForItem.reduce((sum: number, p: any) => sum + (p.liquidWeight * p.pricePerKg), 0);
        
        const unitCost = totalItemWeight > 0 ? totalPaidForItem / totalItemWeight : 0;

        const inventoryLot = await tx.inventoryLot.create({
          data: {
            batchId: slaughter.batchId,
            itemId: itemId,
            initialStock: totalItemWeight, // Gancho
            currentStock: totalItemWeight,
            unitCost: unitCost
          }
        });

        await tx.inventoryMovement.create({
          data: {
            inventoryLotId: inventoryLot.id,
            itemId: itemId,
            type: "IN",
            quantity: totalItemWeight,
            referenceId: slaughterId,
            concept: `Compra al Gancho Lote #${slaughter.batch.batchNumber}`
          }
        });
      }

      // 4. Create AccountPayable
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7);

      await tx.accountPayable.create({
        data: {
          sourceId: slaughter.batchId,
          type: "BATCH_PURCHASE",
          providerId: slaughter.batch.providerId,
          amount: totalValue,
          status: "PENDING",
          dueDate,
        }
      });

      // 5. Update Batch Status
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

"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

import { checkPeriodClosure } from "@/lib/closure";

export async function registerMerma(data: {
  inventoryLotId: string;
  quantityKg: number;
  description?: string;
}) {
  try {
    const { inventoryLotId, quantityKg, description } = data;

    if (!quantityKg || isNaN(quantityKg) || quantityKg <= 0) {
      throw new Error("La cantidad debe ser mayor a 0.");
    }

    await checkPeriodClosure(new Date());

    await prisma.$transaction(async (tx) => {
      const lot = await tx.inventoryLot.findUnique({
        where: { id: inventoryLotId }
      });

      if (!lot) {
        throw new Error("Lote no encontrado.");
      }

      if (lot.currentStock < quantityKg) {
        throw new Error(`Stock insuficiente. Stock actual: ${lot.currentStock} kg.`);
      }

      // Descontar stock
      await tx.inventoryLot.update({
        where: { id: inventoryLotId },
        data: { currentStock: lot.currentStock - quantityKg }
      });

      // Crear movimiento de salida
      await tx.inventoryMovement.create({
        data: {
          inventoryLotId: lot.id,
          itemId: lot.itemId,
          type: "OUT",
          quantity: quantityKg,
          concept: `MERMA DE CAMARA${description ? ': ' + description : ''}`
        }
      });
    });

    revalidatePath("/inventario");
    revalidatePath("/operaciones/inventario");
    revalidatePath("/");

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

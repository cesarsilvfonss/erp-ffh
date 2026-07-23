"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createSale(data: {
  clientId: string;
  date: string;
  invoiceNumber: string;
  ivaRetention?: number;
  rentRetention?: number;
  netValue?: number;
  details: { itemId: string; inventoryLotId: string; quantityKg: number; salePrice: number }[];
}) {
  try {
    return await prisma.$transaction(async (tx) => {
      // 1. Validar Stock para todos los items
      let totalValue = 0;
      const detailsWithCost = [];

      for (const item of data.details) {
        const inventoryLot = await tx.inventoryLot.findUnique({
          where: { id: item.inventoryLotId }
        });

        if (!inventoryLot || inventoryLot.currentStock < item.quantityKg) {
          throw new Error(`Stock insuficiente en el lote seleccionado para el artículo con ID ${item.itemId}`);
        }

        const itemTotal = item.quantityKg * item.salePrice;
        totalValue += itemTotal;

        detailsWithCost.push({
          ...item,
          totalValue: itemTotal,
          costAtSale: inventoryLot.unitCost // Guardamos el costo actual del lote
        });
      }

      const ivaRetention = data.ivaRetention || 0;
      const rentRetention = data.rentRetention || 0;
      const netValue = data.netValue || totalValue;

      // 2. Crear la Venta
      const sale = await tx.sale.create({
        data: {
          clientId: data.clientId,
          date: new Date(data.date),
          invoiceNumber: data.invoiceNumber || null,
          status: "CONFIRMED",
          totalValue,
          ivaRetention,
          rentRetention,
          netValue,
          details: {
            create: detailsWithCost.map(d => ({
              itemId: d.itemId,
              inventoryLotId: d.inventoryLotId,
              quantityKg: d.quantityKg,
              salePrice: d.salePrice,
              totalValue: d.totalValue,
              costAtSale: d.costAtSale,
            }))
          }
        }
      });

      // 3. Crear Cuenta a Cobrar
      await tx.accountReceivable.create({
        data: {
          saleId: sale.id,
          clientId: data.clientId,
          amount: netValue,
          dueDate: new Date(data.date), // O sumar días según término del cliente
          status: "PENDING"
        }
      });

      // 4. Actualizar Inventario y crear Movimiento
      for (const detail of data.details) {
        const updatedLot = await tx.inventoryLot.update({
          where: { id: detail.inventoryLotId },
          data: { currentStock: { decrement: detail.quantityKg } }
        });

        await tx.inventoryMovement.create({
          data: {
            inventoryLotId: detail.inventoryLotId,
            itemId: detail.itemId,
            type: "OUT",
            quantity: detail.quantityKg,
            stockAfter: updatedLot.currentStock,
            reference: `Venta ${data.invoiceNumber || sale.id}`,
            description: "Venta a cliente"
          }
        });
      }

      revalidatePath("/operaciones/ventas");
      revalidatePath("/inventario");

      return { success: true, data: sale };
    });
  } catch (error: any) {
    console.error("Error creating sale:", error);
    return { success: false, error: error.message };
  }
}

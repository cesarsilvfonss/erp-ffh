"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

import { checkPeriodClosure } from "@/lib/closure";

export async function createSale(data: {
  clientId: string;
  date: string;
  invoiceNumber: string;
  ivaRetention?: number;
  rentRetention?: number;
  netValue?: number;
  isInitialSale?: boolean;
  details: { itemId: string; inventoryLotId: string; quantityKg: number; salePrice: number }[];
}) {
  try {
    await checkPeriodClosure(new Date(data.date));

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
          costAtSale: data.isInitialSale ? item.salePrice : inventoryLot.unitCost
        });
      }

      const ivaRetention = data.ivaRetention || 0;
      const rentRetention = data.rentRetention || 0;
      const netValue = data.netValue || totalValue;

      // 1.5. Obtener el cliente para saber su plazo de pago
      const client = await tx.client.findUnique({
        where: { id: data.clientId }
      });
      const paymentTermDays = client?.paymentTermDays || 0;
      const saleDate = new Date(data.date + "T12:00:00Z");
      const dueDate = new Date(saleDate);
      dueDate.setDate(dueDate.getDate() + paymentTermDays);

      // 2. Crear la Venta
      const sale = await tx.sale.create({
        data: {
          clientId: data.clientId,
          date: saleDate,
          invoiceNumber: data.invoiceNumber || null,
          status: "CONFIRMED",
          totalValue,
          ivaRetention,
          rentRetention,
          netValue,
          isInitialSale: data.isInitialSale || false,
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
          amount: totalValue,
          dueDate: dueDate,
          status: "PENDING"
        }
      });

      // 4. Actualizar Inventario y crear Movimiento
      for (const detail of data.details) {
        await tx.inventoryLot.update({
          where: { id: detail.inventoryLotId },
          data: { currentStock: { decrement: detail.quantityKg } }
        });

        await tx.inventoryMovement.create({
          data: {
            inventoryLotId: detail.inventoryLotId,
            itemId: detail.itemId,
            type: "OUT",
            quantity: detail.quantityKg, // Positivo para cantidad sacada
            referenceId: sale.id,
            concept: `Venta Factura ${data.invoiceNumber || 'S/N'}`
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

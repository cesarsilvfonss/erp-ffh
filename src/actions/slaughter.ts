"use server";

import { prisma } from "@/lib/prisma";
import { AnimalCategory } from "@prisma/client";
import { revalidatePath } from "next/cache";

export async function registerSlaughter(data: {
  batchId: string;
  date: Date;
  details: {
    category: AnimalCategory;
    slaughteredWeight: number;
  }[];
}) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Obtener lote, detalles de compra y cierre
      const batch = await tx.batch.findUnique({
        where: { id: data.batchId },
        include: { 
          details: true, 
          closure: true,
          slaughter: true 
        },
      });

      if (!batch || !batch.closure) {
        throw new Error("El lote no existe o no ha sido cerrado (liquidado) aún.");
      }

      if (batch.slaughter) {
        throw new Error("Este lote ya tiene una faena registrada.");
      }

      // 2. Crear Faena (Slaughter)
      const slaughter = await tx.slaughter.create({
        data: {
          batchId: data.batchId,
          date: data.date,
        }
      });

      const mermaPercent = batch.closure.discountPercentage;
      
      // Agrupar los pesos netos originales por categoría
      const originalWeights: Record<AnimalCategory, number> = {
        VACA: 0, TORO: 0, VAQUILLA: 0, NOVILLO: 0
      };
      batch.details.forEach(d => {
        originalWeights[d.category] += d.netWeight;
      });

      // 3. Procesar detalles de faena e inventario
      for (const d of data.details) {
        if (d.slaughteredWeight <= 0) continue;

        const liveWeight = originalWeights[d.category];
        if (liveWeight === 0) continue; // No había esta categoría en el lote

        // Cálculo de Rendimiento %
        const yieldPercent = (d.slaughteredWeight / liveWeight) * 100;
        const weightDifference = liveWeight - d.slaughteredWeight;

        // Registrar Detalle de Faena
        await tx.slaughterDetail.create({
          data: {
            slaughterId: slaughter.id,
            category: d.category,
            slaughteredWeight: d.slaughteredWeight,
            yield: yieldPercent,
            weightDifference,
          }
        });

        // 4. Calcular Costo para Inventario
        // Valor total pagado por esta categoría = (Peso Neto * (1 - Merma)) * Precio
        const liquidWeight = liveWeight * (1 - (mermaPercent / 100));
        let price = 0;
        switch(d.category) {
          case "VACA": price = batch.closure.priceVaca || 0; break;
          case "TORO": price = batch.closure.priceToro || 0; break;
          case "VAQUILLA": price = batch.closure.priceVaquilla || 0; break;
          case "NOVILLO": price = batch.closure.priceNovillo || 0; break;
        }

        const totalCategoryCost = liquidWeight * price;
        // Costo exacto por Kilo Faenado
        const costPerKg = totalCategoryCost / d.slaughteredWeight;

        // Crear registro de Inventario
        await tx.inventory.create({
          data: {
            batchId: data.batchId,
            category: d.category,
            availableStock: d.slaughteredWeight,
            costPerKg,
            totalValue: totalCategoryCost,
          }
        });
      }

      // 5. Actualizar estado del lote
      await tx.batch.update({
        where: { id: data.batchId },
        data: { status: "IN_SALE" }
      });

      return slaughter;
    });

    revalidatePath("/operaciones/faena");
    revalidatePath("/operaciones/lotes");
    revalidatePath("/inventario");
    
    return { success: true, data: result };
  } catch (error: any) {
    console.error("Error en registerSlaughter:", error);
    return { success: false, error: error.message };
  }
}

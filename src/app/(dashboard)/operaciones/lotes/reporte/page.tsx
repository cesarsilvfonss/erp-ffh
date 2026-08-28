import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LotReportClient } from "./LotReportClient";

export const dynamic = "force-dynamic";

export default async function LotReportPage({ searchParams }: { searchParams: { batchId?: string } }) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect("/login");
  }

  if (session.user.role !== "ADMIN" && session.user.role !== "ADMINISTRATION") {
    redirect("/");
  }

  const { batchId } = searchParams;

  // Obtener todos los lotes para el selector
  const allBatches = await prisma.batch.findMany({
    orderBy: { createdAt: "desc" },
    include: { provider: true }
  });

  let reportData = null;

  if (batchId) {
    // 1. Lote y Compra (Inversión)
    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      include: {
        provider: true,
        closure: true,
        details: { include: { item: true } },
        expenses: { include: { category: true } },
        slaughter: { include: { details: { include: { item: true } } } },
        inventoryLots: {
          include: {
            item: true,
            saleDetails: {
              include: { sale: { include: { client: true } } }
            },
            movements: true
          }
        }
      }
    });

    if (batch) {
      // 2. Calcular Inversión Inicial (Compra)
      let purchaseQuantity = 0;
      let purchaseWeight = 0;
      let purchaseTotalCost = 0;

      if (batch.closure) {
        purchaseQuantity = batch.closure.totalHeads;
        purchaseWeight = batch.closure.totalGrossWeight;
        purchaseTotalCost = batch.closure.totalValue;
      } else {
        purchaseQuantity = batch.details.reduce((acc: number, d: any) => acc + d.quantity, 0);
        purchaseWeight = batch.details.reduce((acc: number, d: any) => acc + d.netWeight, 0);
      }
      
      // 3. Faena y Rendimiento
      let slaughterWeight = 0;
      let performance = 0;
      if (batch.slaughter) {
        slaughterWeight = batch.slaughter.totalCarcassWeight;
        performance = batch.slaughter.performance;
      }

      // 4. Ventas y Mermas desde Inventario
      let totalKgSold = 0;
      let totalSalesRevenue = 0;
      let totalKgMermas = 0;
      let totalStockValue = 0;
      let totalStockKg = 0;

      const salesList: any[] = [];
      const mermasList: any[] = [];
      const batchAny = batch as any;

      batchAny.inventoryLots.forEach((lot: any) => {
        // Stock actual
        totalStockKg += lot.currentStock;
        totalStockValue += (lot.currentStock * lot.unitCost);

        // Ventas
        lot.saleDetails.forEach((sd: any) => {
          if (sd.sale.status !== "CANCELLED") {
            totalKgSold += sd.quantity;
            const saleTotal = sd.quantity * sd.price;
            totalSalesRevenue += saleTotal;

            salesList.push({
              id: sd.id,
              date: sd.sale.date,
              invoiceNumber: sd.sale.invoiceNumber,
              clientName: sd.sale.client.legalName,
              itemName: lot.item.name,
              quantity: sd.quantity,
              price: sd.price,
              total: saleTotal,
              cost: sd.quantity * lot.unitCost // costo proporcional de la venta
            });
          }
        });

        // Mermas
        lot.movements.forEach((mov: any) => {
          if (mov.type === "OUT" && mov.concept.includes("MERMA")) {
            totalKgMermas += mov.quantity;
            mermasList.push({
              id: mov.id,
              date: mov.createdAt,
              itemName: lot.item.name,
              quantity: mov.quantity,
              cost: mov.quantity * lot.unitCost
            });
          }
        });
      });

      // 5. Gastos del Lote
      const totalExpenses = batchAny.expenses.reduce((acc: number, e: any) => acc + e.amount, 0);
      const totalMermasCost = mermasList.reduce((acc, m) => acc + m.cost, 0);
      const costOfSoldGoods = salesList.reduce((acc, s) => acc + s.cost, 0);

      // 6. Resultado Contable (Opción 1: Solo lo Realizado)
      // Resultado Bruto = Ingreso Ventas - Costo de la Carne Vendida
      const grossResult = totalSalesRevenue - costOfSoldGoods;
      
      // Resultado Neto = Resultado Bruto - Gastos (asumidos enteros por el lote) - Costo de Mermas
      const netResult = grossResult - totalExpenses - totalMermasCost;

      reportData = {
        batch,
        purchase: {
          quantity: purchaseQuantity,
          weight: purchaseWeight,
          totalCost: purchaseTotalCost,
          avgCost: purchaseWeight > 0 ? purchaseTotalCost / purchaseWeight : 0
        },
        slaughter: {
          weight: slaughterWeight,
          performance: performance
        },
        inventory: {
          stockKg: totalStockKg,
          stockValue: totalStockValue,
          mermasKg: totalKgMermas,
          mermasCost: totalMermasCost
        },
        sales: {
          totalKg: totalKgSold,
          revenue: totalSalesRevenue,
          costOfGoods: costOfSoldGoods,
          list: salesList
        },
        expenses: {
          total: totalExpenses,
          list: batch.expenses
        },
        results: {
          grossResult,
          netResult
        }
      };
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <LotReportClient allBatches={allBatches} reportData={reportData} />
    </div>
  );
}

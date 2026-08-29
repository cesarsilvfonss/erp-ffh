import { prisma } from "@/lib/prisma";
import { DashboardUI } from "./DashboardUI";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  
  if (session?.user?.role === "WEIGHER") {
    redirect("/operaciones/faena");
  }
  // 1. Saldo Bancario
  const bankAccounts = await prisma.bankAccount.findMany({
    include: { transactions: true }
  });
  const bankBalance = bankAccounts.reduce((acc, account) => {
    const transactionsSum = account.transactions.reduce((sum, tx) => {
      return tx.type === 'INCOME' ? sum + tx.amount : sum - tx.amount;
    }, 0);
    return acc + account.initialBalance + transactionsSum;
  }, 0);

  // 2. Valor del Inventario
  const inventoryLots = await prisma.inventoryLot.findMany({
    where: { currentStock: { gte: 0.2 } }
  });
  const inventoryValue = inventoryLots.reduce((acc, lot) => {
    return acc + (lot.currentStock * lot.unitCost);
  }, 0);

  // 3. Cheques en Cartera
  const walletChecksRecords = await prisma.check.findMany({
    where: { status: 'IN_PORTFOLIO' }
  });
  const walletChecks = walletChecksRecords.reduce((acc, check) => acc + check.amount, 0);

  // 4. Cuentas por Cobrar y Pagar
  const receivablesRecords = await prisma.accountReceivable.findMany({
    where: { status: { not: 'PAID' } }
  });
  const receivables = receivablesRecords.reduce((acc, rec) => acc + (rec.amount - rec.paidAmount), 0);

  const payablesRecords = await prisma.accountPayable.findMany({
    where: { status: { not: 'PAID' } }
  });
  const payables = payablesRecords.reduce((acc, pay) => acc + (pay.amount - pay.paidAmount), 0);

  // 4.1 Stock en Pie (Lotes cerrados sin faenar y no vendidos en pie)
  const liveStockClosures = await prisma.batchClosure.findMany({
    where: {
      batch: {
        inventoryLots: { none: {} },
        isLiveSale: false
      }
    }
  });
  const liveStockValue = liveStockClosures.reduce((acc, closure) => acc + closure.totalValue, 0);

  // 5. Capital Anterior (Último Cierre)
  const lastClosure = await prisma.monthlyClosure.findFirst({
    where: { status: 'CLOSED' },
    orderBy: [
      { year: 'desc' },
      { month: 'desc' }
    ]
  });
  const previousCapital = lastClosure ? lastClosure.totalCapital : 2717386896;

  // 6. Ranking de Rendimiento por Proveedor
  const rankingSlaughters = await prisma.slaughter.findMany({
    where: {
      batch: {
        isHookPurchase: false
      }
    },
    include: {
      batch: {
        include: {
          provider: true,
          details: { include: { item: true } },
          closure: { include: { prices: { include: { item: true } } } }
        }
      },
      details: {
        include: { item: true }
      }
    }
  });

  const rawEvents: any[] = [];

  rankingSlaughters.forEach(s => {
    const pName = s.batch.provider?.legalName || "Desconocido";
    const date = s.batch.date;
    const batchNumber = s.batch.batchNumber;

    const liveWeightByCat: Record<string, number> = {};
    if (s.batch.closure) {
      s.batch.closure.prices.forEach((p: any) => {
        liveWeightByCat[p.item.name] = (liveWeightByCat[p.item.name] || 0) + p.liquidWeight;
      });
    } else {
      s.batch.details.forEach((d: any) => {
        liveWeightByCat[d.item.name] = (liveWeightByCat[d.item.name] || 0) + d.netWeight;
      });
    }

    s.details.forEach((d: any) => {
      const catName = d.item.name;
      const liveWt = liveWeightByCat[catName] || 0;
      if (liveWt > 0) {
        rawEvents.push({
          providerName: pName,
          category: catName,
          batchNumber,
          date,
          carcass: d.weight,
          live: liveWt,
          rendimiento: (d.weight / liveWt) * 100
        });
      }
    });
  });

  const profitabilityBatches = await prisma.batch.findMany({
    where: {
      status: "CLOSED",
      closure: { isNot: null }
    },
    include: {
      provider: true,
      closure: true,
      expenses: true,
      inventoryLots: {
        include: {
          saleDetails: {
            where: { sale: { status: { not: "CANCELLED" } } },
            include: { sale: true }
          },
          movements: {
            where: { type: "OUT", concept: { contains: "MERMA" } }
          }
        }
      }
    }
  });

  const profitEvents = profitabilityBatches.map((b: any) => {
    const purchaseCost = b.closure.totalValue;
    
    let totalSalesRevenue = 0;
    let costOfSoldGoods = 0;
    let totalMermasCost = 0;

    b.inventoryLots.forEach((lot: any) => {
      lot.saleDetails.forEach((sd: any) => {
        totalSalesRevenue += (sd.quantityKg * sd.salePrice);
        costOfSoldGoods += (sd.quantityKg * lot.unitCost);
      });
      lot.movements.forEach((m: any) => {
        totalMermasCost += (m.quantity * lot.unitCost);
      });
    });

    const totalExpenses = b.expenses.reduce((acc: number, e: any) => acc + e.amount, 0);

    const grossResult = totalSalesRevenue - costOfSoldGoods;
    const netResult = grossResult - totalExpenses - totalMermasCost;
    const utilidadPorcentaje = purchaseCost > 0 ? (netResult / purchaseCost) * 100 : 0;

    return {
      batchId: b.id,
      batchNumber: b.batchNumber,
      date: b.date.toISOString(),
      providerName: b.provider?.legalName || "Desconocido",
      purchaseTotal: purchaseCost,
      netResult,
      utilidadPorcentaje
    };
  });

  return (
    <DashboardUI 
      bankBalance={bankBalance}
      inventoryValue={inventoryValue}
      liveStockValue={liveStockValue}
      walletChecks={walletChecks}
      receivables={receivables}
      payables={payables}
      previousCapital={previousCapital}
      rankingEvents={rawEvents}
      profitEvents={profitEvents}
    />
  );
}

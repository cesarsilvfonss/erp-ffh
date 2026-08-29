import { prisma } from "@/lib/prisma";
import { DashboardUI } from "./DashboardUI";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { startOfMonth, endOfMonth } from "date-fns";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  
  if (session?.user?.role === "WEIGHER") {
    redirect("/operaciones/faena");
  }

  const now = new Date();
  const start = startOfMonth(now);
  const end = endOfMonth(now);

  const [
    salesResult,
    expensesResult,
    purchasesResult
  ] = await Promise.all([
    prisma.sale.aggregate({
      where: { date: { gte: start, lte: end }, status: { not: "CANCELLED" } },
      _sum: { totalValue: true }
    }),
    prisma.expense.aggregate({
      where: { date: { gte: start, lte: end } },
      _sum: { amount: true }
    }),
    prisma.batchClosure.aggregate({
      where: { 
        batch: { date: { gte: start, lte: end } }
      },
      _sum: { totalValue: true }
    })
  ]);

  const monthlySales = salesResult._sum?.totalValue || 0;
  const monthlyExpenses = expensesResult._sum?.amount || 0;
  const monthlyPurchases = purchasesResult._sum?.totalValue || 0;

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
  const providerStats: Record<string, {
    name: string,
    globalLive: number,
    globalCarcass: number,
    categories: Record<string, { live: number, carcass: number }>
  }> = {};
  const allCategories = new Set<string>();

  rankingSlaughters.forEach(s => {
    const pName = s.batch.provider?.legalName || "Desconocido";
    const date = s.batch.date;
    const batchNumber = s.batch.batchNumber;

    if (!providerStats[pName]) {
      providerStats[pName] = { name: pName, globalLive: 0, globalCarcass: 0, categories: {} };
    }
    const pStats = providerStats[pName];

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

    const carcassWeightByCat: Record<string, number> = {};
    s.details.forEach((d: any) => {
      carcassWeightByCat[d.item.name] = (carcassWeightByCat[d.item.name] || 0) + d.weight;
      
      // Update provider global stats
      pStats.globalCarcass += d.weight;
      allCategories.add(d.item.name);
      if (!pStats.categories[d.item.name]) pStats.categories[d.item.name] = { live: 0, carcass: 0 };
      pStats.categories[d.item.name].carcass += d.weight;
    });

    Object.entries(liveWeightByCat).forEach(([catName, liveWt]) => {
      allCategories.add(catName);
      if (!pStats.categories[catName]) pStats.categories[catName] = { live: 0, carcass: 0 };
      pStats.categories[catName].live += liveWt;
      pStats.globalLive += liveWt;
    });

    // Populate raw events for the modal history
    Object.entries(carcassWeightByCat).forEach(([catName, carcassWt]) => {
      const liveWt = liveWeightByCat[catName] || 0;
      if (liveWt > 0) {
        rawEvents.push({
          providerName: pName,
          category: catName,
          batchNumber,
          date,
          carcass: carcassWt,
          live: liveWt,
          rendimiento: (carcassWt / liveWt) * 100
        });
      }
    });
  });

  const categoryHeaders = Array.from(allCategories).sort();

  const providerRanking = Object.values(providerStats).map(p => {
    const globalRend = p.globalLive > 0 ? (p.globalCarcass / p.globalLive) * 100 : 0;
    const catRend: Record<string, number> = {};
    categoryHeaders.forEach(c => {
      const stats = p.categories[c];
      catRend[c] = (stats && stats.live > 0) ? (stats.carcass / stats.live) * 100 : 0;
    });
    return {
      name: p.name,
      globalRendimiento: globalRend,
      categoryRendimientos: catRend
    };
  }).filter(p => p.globalRendimiento > 0).sort((a, b) => b.globalRendimiento - a.globalRendimiento);

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
      providerRanking={providerRanking}
      categoryHeaders={categoryHeaders}
      rankingEvents={rawEvents}
      profitEvents={profitEvents}
      monthlySales={monthlySales}
      monthlyPurchases={monthlyPurchases}
      monthlyExpenses={monthlyExpenses}
    />
  );
}

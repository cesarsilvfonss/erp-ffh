import { prisma } from "./src/lib/prisma";

async function run() {
  const lotesToTest = await prisma.batch.findMany({
    where: { batchNumber: { in: [2, 5, 6] } }
  });

  for (const lote of lotesToTest) {
    console.log(`Testing lote ${lote.batchNumber} (ID: ${lote.id})...`);
    const batchId = lote.id;
    
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
      
      let slaughterWeight = 0;
      let performance = 0;
      if (batch.slaughter) {
        slaughterWeight = batch.slaughter.totalCarcassWeight;
        performance = batch.slaughter.performance;
      }

      let totalKgSold = 0;
      let totalSalesRevenue = 0;
      let totalKgMermas = 0;
      let totalStockValue = 0;
      let totalStockKg = 0;

      const salesList: any[] = [];
      const mermasList: any[] = [];
      const batchAny = batch as any;

      batchAny.inventoryLots.forEach((lot: any) => {
        totalStockKg += lot.currentStock;
        totalStockValue += (lot.currentStock * lot.unitCost);

        lot.saleDetails.forEach((sd: any) => {
          if (sd.sale.status !== "CANCELLED") {
            totalKgSold += sd.quantityKg;
            const saleTotal = sd.quantityKg * sd.salePrice;
            totalSalesRevenue += saleTotal;

            salesList.push({
              id: sd.id,
              date: sd.sale.date,
              invoiceNumber: sd.sale.invoiceNumber,
              clientName: sd.sale.client.legalName,
              itemName: lot.item.name,
              quantity: sd.quantityKg,
              price: sd.salePrice,
              total: saleTotal,
              cost: sd.quantityKg * lot.unitCost
            });
          }
        });

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

      const totalExpenses = batchAny.expenses.reduce((acc: number, e: any) => acc + e.amount, 0);
      const totalMermasCost = mermasList.reduce((acc, m) => acc + m.cost, 0);
      const costOfSoldGoods = salesList.reduce((acc, s) => acc + s.cost, 0);

      const grossResult = totalSalesRevenue - costOfSoldGoods;
      const netResult = grossResult - totalExpenses - totalMermasCost;

      const reportData = {
        purchaseQuantity,
        purchaseWeight,
        purchaseTotalCost,
        avgCost: purchaseWeight > 0 ? purchaseTotalCost / purchaseWeight : 0,
        slaughterWeight,
        performance,
        totalStockKg,
        totalStockValue,
        totalKgMermas,
        totalMermasCost,
        totalKgSold,
        totalSalesRevenue,
        costOfSoldGoods,
        totalExpenses,
        grossResult,
        netResult
      };

      console.log(`Report Data for Lote ${lote.batchNumber}:`, JSON.stringify(reportData, null, 2));
      
      // Check for NaNs
      for (const [k, v] of Object.entries(reportData)) {
        if (Number.isNaN(v)) {
          console.error(`ERROR: Field ${k} is NaN in Lote ${lote.batchNumber}!`);
        }
      }
    }
  }
}

run().catch(console.error).finally(() => process.exit(0));

import { prisma } from "./src/lib/prisma";

async function run() {
  const liveStockClosures = await prisma.batchClosure.findMany({
    where: {
      batch: {
        inventoryLots: { none: {} },
        isLiveSale: false
      }
    }
  });
  const liveStockValue = liveStockClosures.reduce((acc, closure) => acc + closure.totalValue, 0);
  console.log("Live Stock Value:", liveStockValue);
}

run().catch(console.error).finally(() => process.exit(0));

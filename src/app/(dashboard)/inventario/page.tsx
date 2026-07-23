import { prisma } from "@/lib/prisma";
import { PackageSearch, TrendingUp } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const inventoryLots = await prisma.inventoryLot.findMany({
    where: {
      currentStock: { gt: 0 } // Sólo mostrar lotes con stock
    },
    include: {
      item: true,
      batch: true
    },
    orderBy: { createdAt: "desc" },
  });

  // Calcular métricas
  const totalKg = inventoryLots.reduce((acc, lot) => acc + lot.currentStock, 0);
  const totalValue = inventoryLots.reduce((acc, lot) => acc + (lot.currentStock * lot.unitCost), 0);
  const avgCostPerKg = totalKg > 0 ? totalValue / totalKg : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Inventario de Artículos por Lote</h1>
        <p className="text-zinc-400 text-sm mt-1">Stock disponible valorizado y agrupado por lote de compra.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <PackageSearch className="w-16 h-16 text-emerald-500" />
          </div>
          <p className="text-zinc-400 text-sm font-medium mb-1">Stock Disponible</p>
          <p className="text-3xl font-bold text-zinc-100">{totalKg.toLocaleString(undefined, { maximumFractionDigits: 1 })} <span className="text-lg text-zinc-500">KG</span></p>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <TrendingUp className="w-16 h-16 text-cyan-500" />
          </div>
          <p className="text-zinc-400 text-sm font-medium mb-1">Costo Promedio / KG</p>
          <p className="text-3xl font-bold text-cyan-400">
            <span className="text-lg text-cyan-400/50 mr-1">₲</span>
            {avgCostPerKg.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
        </div>

        <div className="bg-emerald-950/30 border border-emerald-900/50 rounded-xl p-6 relative overflow-hidden">
          <p className="text-emerald-400/80 text-sm font-medium mb-1">Valor Total del Inventario</p>
          <p className="text-3xl font-bold text-emerald-400">
            <span className="text-lg text-emerald-400/50 mr-1">₲</span>
            {totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
        </div>
      </div>

      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden mt-8">
        <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
          <h2 className="font-semibold text-zinc-100">Detalle de Stock por Artículo y Lote</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-950 text-zinc-400">
              <tr>
                <th className="px-6 py-3 font-medium">Artículo</th>
                <th className="px-6 py-3 font-medium">Lote Origen</th>
                <th className="px-6 py-3 font-medium text-right">KG Disponibles</th>
                <th className="px-6 py-3 font-medium text-right">Costo Unitario</th>
                <th className="px-6 py-3 font-medium text-right">Valor Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 text-zinc-300">
              {inventoryLots.map((lot) => (
                <tr key={lot.id} className="hover:bg-zinc-800/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="font-medium text-zinc-100">{lot.item.name}</div>
                    <div className="text-xs text-zinc-500">Cod: {lot.item.code}</div>
                  </td>
                  <td className="px-6 py-4 font-medium text-cyan-400">
                    {lot.batch ? `Lote #${lot.batch.batchNumber.toString().padStart(4, '0')}` : 'Ingreso Manual'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded-md font-medium">
                      {lot.currentStock.toLocaleString()} {lot.item.unit}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-zinc-400">
                    ₲ {lot.unitCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-emerald-400">
                    ₲ {(lot.currentStock * lot.unitCost).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {inventoryLots.length === 0 && (
            <div className="p-8 text-center text-zinc-500">
              El inventario está vacío. Registra una faena para generar stock.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

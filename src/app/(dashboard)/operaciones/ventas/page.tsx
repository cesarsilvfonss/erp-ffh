import { prisma } from "@/lib/prisma";
import { Plus, Search, Eye } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function VentasPage() {
  const sales = await prisma.sale.findMany({
    orderBy: { date: "desc" },
    include: {
      client: true,
      details: true,
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Registro de Ventas</h1>
          <p className="text-zinc-400 text-sm mt-1">Gestión de facturación y salida de inventario.</p>
        </div>
        <Link 
          href="/operaciones/ventas/nuevo"
          className="bg-emerald-500 hover:bg-emerald-600 text-zinc-950 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-lg shadow-emerald-500/20"
        >
          <Plus className="w-4 h-4" />
          Nueva Venta
        </Link>
      </div>

      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-zinc-800 flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input 
              type="text"
              placeholder="Buscar por comprobante o cliente..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50 transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-950 text-zinc-400">
              <tr>
                <th className="px-6 py-3 font-medium">Fecha</th>
                <th className="px-6 py-3 font-medium">Nº Comprobante</th>
                <th className="px-6 py-3 font-medium">Cliente</th>
                <th className="px-6 py-3 font-medium">Estado</th>
                <th className="px-6 py-3 font-medium text-right">Bruto (₲)</th>
                <th className="px-6 py-3 font-medium text-right">Retenciones (₲)</th>
                <th className="px-6 py-3 font-medium text-right">A Cobrar (₲)</th>
                <th className="px-6 py-3 font-medium text-right">Costo (₲)</th>
                <th className="px-6 py-3 font-medium text-right">Rentabilidad</th>
                <th className="px-6 py-3 font-medium text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 text-zinc-300">
              {sales.map((sale) => {
                const totalRetentions = (sale.ivaRetention || 0) + (sale.rentRetention || 0);
                const costOfSale = sale.details.reduce((acc, d) => acc + (d.costAtSale * d.quantityKg), 0);
                const profitability = sale.netValue - costOfSale;
                
                return (
                  <tr key={sale.id} className="hover:bg-zinc-800/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-zinc-400">
                      {new Date(sale.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 font-mono font-medium text-emerald-400">
                      {sale.invoiceNumber || "Sin comprobante"}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-zinc-200">{sale.client.legalName}</div>
                      <div className="text-xs text-zinc-500">RUC: {sale.client.tradeName || "N/A"}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-md text-[10px] uppercase font-bold border ${
                        sale.status === 'CONFIRMED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                        sale.status === 'CANCELLED' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 
                        'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}>
                        {sale.status === 'CONFIRMED' ? 'Confirmado' : sale.status === 'PENDING' ? 'Pendiente' : 'Cancelado'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-zinc-300">
                      {sale.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-rose-400/80">
                      {totalRetentions > 0 ? `-${totalRetentions.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '0'}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-emerald-400">
                      {sale.netValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-zinc-400">
                      {costOfSale.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`font-bold ${profitability >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {profitability >= 0 ? '+' : ''}{profitability.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button className="p-1.5 text-zinc-400 hover:text-emerald-400 rounded-md hover:bg-emerald-400/10 transition-colors inline-block">
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {sales.length === 0 && (
            <div className="p-8 text-center text-zinc-500">
              No hay ventas registradas todavía.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function PrintBatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  const batch = await prisma.batch.findUnique({
    where: { id },
    include: {
      provider: true,
      slaughterhouse: true,
      details: { orderBy: { createdAt: "asc" } },
      closure: {
        include: { prices: true }
      },
    },
  });

  if (!batch || !batch.closure) return notFound();

  const totalHeads = batch.details.reduce((acc, d) => acc + d.quantity, 0);

  return (
    <div className="bg-white text-black min-h-screen p-8 print:p-0 font-sans">
      <div className="max-w-4xl mx-auto">
        {/* HEADER */}
        <div className="flex justify-between items-start border-b-2 border-black pb-6 mb-6">
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tight">Sistema FFH</h1>
            <p className="text-sm text-gray-500 font-medium">Liquidación de Compra de Hacienda</p>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-bold">Lote #{batch.batchNumber.toString().padStart(4, '0')}</h2>
            <p className="text-sm text-gray-600">Fecha de Lote: {new Date(batch.date).toLocaleDateString()}</p>
            <p className="text-sm text-gray-600">Liquidación impresa: {new Date().toLocaleDateString()}</p>
          </div>
        </div>

        {/* INFO */}
        <div className="grid grid-cols-2 gap-8 mb-8 text-sm">
          <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
            <h3 className="font-bold text-gray-400 uppercase text-xs mb-2">Datos del Proveedor</h3>
            <p className="font-bold text-lg">{batch.provider.legalName}</p>
            {batch.provider.ruc && <p>RUC: {batch.provider.ruc}</p>}
            {batch.provider.address && <p>Dirección: {batch.provider.address}</p>}
          </div>
          <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
            <h3 className="font-bold text-gray-400 uppercase text-xs mb-2">Datos de Faena</h3>
            <p className="font-bold text-lg">{batch.slaughterhouse?.legalName || "No especificado"}</p>
            <p>Estado del Lote: CERRADO Y LIQUIDADO</p>
            <p>Cabezas Totales: {totalHeads}</p>
          </div>
        </div>

        {/* ROMANEO */}
        <div className="mb-8">
          <h3 className="font-bold text-lg mb-3 border-b border-gray-200 pb-1">1. Detalle de Romaneo (Pesajes)</h3>
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-100 font-bold border-y border-gray-300">
              <tr>
                <th className="py-2 px-3">#</th>
                <th className="py-2 px-3">Categoría</th>
                <th className="py-2 px-3">Condición</th>
                <th className="py-2 px-3 text-right">Cabezas</th>
                <th className="py-2 px-3 text-right">Peso Neto (KG)</th>
                <th className="py-2 px-3 text-right">Promedio (KG)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {batch.details.map((d, i) => (
                <tr key={d.id}>
                  <td className="py-2 px-3">{i + 1}</td>
                  <td className="py-2 px-3 font-medium">{d.category}</td>
                  <td className="py-2 px-3">{d.condition}</td>
                  <td className="py-2 px-3 text-right">{d.quantity}</td>
                  <td className="py-2 px-3 text-right">{d.netWeight.toLocaleString()}</td>
                  <td className="py-2 px-3 text-right text-gray-500">
                    {d.quantity > 0 ? (d.netWeight / d.quantity).toFixed(1) : 0}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 font-bold border-y border-gray-300">
              <tr>
                <td colSpan={3} className="py-2 px-3 text-right">Total Bruto:</td>
                <td className="py-2 px-3 text-right">{totalHeads}</td>
                <td className="py-2 px-3 text-right">{batch.closure.totalNetWeight.toLocaleString()} KG</td>
                <td className="py-2 px-3 text-right">
                  {totalHeads > 0 ? (batch.closure.totalNetWeight / totalHeads).toFixed(1) : 0} KG/cab
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* DESBASTE */}
        <div className="mb-8">
          <h3 className="font-bold text-lg mb-3 border-b border-gray-200 pb-1">2. Cálculo de Desbaste y Peso Líquido</h3>
          <div className="flex gap-12 text-sm bg-gray-50 p-4 rounded-lg border border-gray-200">
            <div>
              <p className="text-gray-500 font-medium">Peso Bruto Total</p>
              <p className="font-bold text-xl">{batch.closure.totalNetWeight.toLocaleString()} KG</p>
            </div>
            <div>
              <p className="text-gray-500 font-medium">Desbaste Aplicado ({batch.closure.discountPercentage}%)</p>
              <p className="font-bold text-xl text-red-600">-{batch.closure.totalDiscountWeight.toLocaleString()} KG</p>
            </div>
            <div>
              <p className="text-gray-500 font-medium">Peso Líquido Total</p>
              <p className="font-bold text-xl text-green-700">{batch.closure.totalLiquidWeight.toLocaleString()} KG</p>
            </div>
          </div>
        </div>

        {/* LIQUIDACION */}
        <div className="mb-12">
          <h3 className="font-bold text-lg mb-3 border-b border-gray-200 pb-1">3. Liquidación Monetaria por Categorías</h3>
          <table className="w-full text-sm text-left border border-gray-200">
            <thead className="bg-gray-100 font-bold border-b border-gray-300">
              <tr>
                <th className="py-2 px-3">Categoría</th>
                <th className="py-2 px-3 text-right">KG Líquidos</th>
                <th className="py-2 px-3 text-right">Precio Pactado / KG</th>
                <th className="py-2 px-3 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {batch.closure.prices.map((p, i) => (
                <tr key={p.id}>
                  <td className="py-2 px-3 font-medium">{p.category}</td>
                  <td className="py-2 px-3 text-right">{p.liquidWeight.toLocaleString()} KG</td>
                  <td className="py-2 px-3 text-right">₲ {p.pricePerKg.toLocaleString()}</td>
                  <td className="py-2 px-3 text-right font-medium">₲ {p.totalValue.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-900 text-white font-bold">
              <tr>
                <td colSpan={3} className="py-3 px-3 text-right uppercase tracking-wider text-xs">Total a Pagar</td>
                <td className="py-3 px-3 text-right text-lg">₲ {batch.closure.totalValue.toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* FIRMAS */}
        <div className="grid grid-cols-2 gap-16 mt-24 text-center">
          <div>
            <div className="border-t border-gray-400 pt-2">
              <p className="font-bold text-sm">Firma por Sistema FFH</p>
            </div>
          </div>
          <div>
            <div className="border-t border-gray-400 pt-2">
              <p className="font-bold text-sm">Firma de Conformidad (Proveedor)</p>
              <p className="text-xs text-gray-500 mt-1">{batch.provider.legalName}</p>
            </div>
          </div>
        </div>

        {/* PRINT SCRIPT */}
        <script
          dangerouslySetInnerHTML={{
            __html: `window.onload = function() { window.print(); }`
          }}
        />
      </div>
    </div>
  );
}

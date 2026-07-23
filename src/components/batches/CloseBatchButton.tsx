"use client";

import { useState } from "react";
import { CheckCircle, X } from "lucide-react";
import { closeBatch } from "@/actions/batch";

export function CloseBatchButton({ 
  batchId, 
  batchDetails,
  totalHeads,
  totalWeight,
  disabled 
}: { 
  batchId: string;
  batchDetails: any[]; // Using any because it includes item relation now
  totalHeads: number;
  totalWeight: number;
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [discountPercent, setDiscountPercent] = useState(4.0); // 4% default
  const [loading, setLoading] = useState(false);
  
  // Agrupar peso por artículo para pedir precios
  const weightPerItem = batchDetails.reduce((acc, d) => {
    if (!acc[d.itemId]) acc[d.itemId] = { name: d.item.name, weight: 0 };
    acc[d.itemId].weight += d.netWeight;
    return acc;
  }, {} as Record<string, { name: string, weight: number }>);
  
  const initialPrices = Object.keys(weightPerItem).reduce((acc, itemId) => {
    acc[itemId] = 0;
    return acc;
  }, {} as Record<string, number>);

  const [prices, setPrices] = useState(initialPrices);

  async function handleClose(e: React.FormEvent) {
    e.preventDefault();
    if (!confirm("¿Desea cerrar este lote? Ya no podrá modificar el romaneo y se generará la cuenta a pagar.")) return;
    
    setLoading(true);

    const formattedPrices = Object.keys(weightPerItem).map(itemId => {
      const grossWeight = weightPerItem[itemId].weight;
      const liquidWeight = grossWeight - (grossWeight * (discountPercent / 100));

      return {
        itemId,
        pricePerKg: Number(prices[itemId]),
        liquidWeight
      };
    });

    const res = await closeBatch(batchId, {
      discountPercentage: discountPercent,
      prices: formattedPrices
    });
    
    if (res.success) {
      setIsOpen(false);
    } else {
      alert("Error cerrando lote: " + res.error);
    }
    setLoading(false);
  }

  const totalDiscountWeight = totalWeight * (discountPercent / 100);
  const totalLiquidWeight = totalWeight - totalDiscountWeight;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        disabled={disabled}
        className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-950 px-6 py-2.5 rounded-lg font-bold transition-all shadow-lg shadow-emerald-500/20"
      >
        <CheckCircle className="w-5 h-5" />
        Cerrar Lote
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl shadow-2xl my-auto flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-zinc-800 sticky top-0 bg-zinc-900 z-10 rounded-t-2xl">
              <h2 className="font-bold text-xl text-zinc-100">Liquidación del Lote</h2>
              <button 
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-zinc-500 hover:text-zinc-300 transition-colors p-1"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleClose} className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
                <p className="text-zinc-400 text-sm mb-4">Resumen de Romaneo: Cabezas: {totalHeads} | Bruto: {totalWeight.toLocaleString()} KG</p>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Desbaste (Merma) %</label>
                <div className="relative">
                  <input 
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    required
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(parseFloat(e.target.value) || 0)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-4 pr-10 py-3 text-lg font-bold text-emerald-400 focus:outline-none focus:border-emerald-500/50 transition-colors"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">%</div>
                </div>
                <div className="flex justify-between text-xs text-zinc-500 mt-2 font-medium">
                  <span>Descuento: -{totalDiscountWeight.toLocaleString()} KG</span>
                  <span className="text-emerald-500">Líquido: {totalLiquidWeight.toLocaleString()} KG</span>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-medium text-zinc-300 border-b border-zinc-800 pb-2">Precios por Categoría</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(weightPerItem).map(([itemId, dataValue]) => {
                    const data = dataValue as { name: string, weight: number };
                    const itemLiquidWeight = data.weight - (data.weight * (discountPercent / 100));
                    const itemPrice = prices[itemId] || 0;
                    const itemTotal = itemLiquidWeight * itemPrice;

                    return (
                      <div key={itemId} className="bg-zinc-950 p-4 rounded-xl border border-zinc-800/50">
                        <div className="flex justify-between items-end mb-3">
                          <span className="font-bold text-zinc-200">{data.name}</span>
                          <span className="text-xs font-medium text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded">{itemLiquidWeight.toLocaleString()} KG líq.</span>
                        </div>
                        <div className="relative mb-2">
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">₲</div>
                          <input 
                            type="number"
                            required
                            min="1"
                            value={prices[itemId] === 0 ? '' : prices[itemId]}
                            onChange={(e) => setPrices({...prices, [itemId]: parseFloat(e.target.value) || 0})}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-8 pr-4 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50"
                            placeholder="Precio por KG"
                          />
                        </div>
                        <div className="text-right text-xs font-bold text-emerald-400">
                          Total: ₲ {itemTotal.toLocaleString()}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-zinc-800 sticky bottom-0 bg-zinc-900">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  disabled={loading}
                  className="px-6 py-2.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-zinc-950 px-6 py-2.5 rounded-lg font-bold transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2"
                >
                  {loading && <div className="w-4 h-4 border-2 border-zinc-950/30 border-t-zinc-950 rounded-full animate-spin" />}
                  Confirmar Liquidación
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

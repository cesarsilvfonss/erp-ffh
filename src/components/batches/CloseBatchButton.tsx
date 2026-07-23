"use client";

import { useState } from "react";
import { CheckCircle, X, Plus, Trash2 } from "lucide-react";
import { closeBatch } from "@/actions/batch";

type PriceSegment = {
  id: string;
  itemId: string;
  liquidWeight: number;
  pricePerKg: number;
};

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
  const [segments, setSegments] = useState<PriceSegment[]>([]);

  // Unique items in this batch
  const uniqueItems = batchDetails.reduce((acc, d) => {
    if (!acc.find((i: any) => i.id === d.item.id)) {
      acc.push(d.item);
    }
    return acc;
  }, [] as any[]);

  const totalDiscountWeight = totalWeight * (discountPercent / 100);
  const totalLiquidWeight = totalWeight - totalDiscountWeight;

  const handleAddSegment = () => {
    setSegments([
      ...segments,
      {
        id: Math.random().toString(36).substr(2, 9),
        itemId: uniqueItems[0]?.id || "",
        liquidWeight: 0,
        pricePerKg: 0,
      }
    ]);
  };

  const handleRemoveSegment = (id: string) => {
    setSegments(segments.filter(s => s.id !== id));
  };

  const handleSegmentChange = (id: string, field: keyof PriceSegment, value: any) => {
    setSegments(segments.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  async function handleClose(e: React.FormEvent) {
    e.preventDefault();
    if (segments.length === 0) {
      alert("Debe agregar al menos un precio para cerrar el lote.");
      return;
    }

    const currentLiquidWeight = segments.reduce((sum, seg) => sum + seg.liquidWeight, 0);
    // Allow small rounding differences
    if (Math.abs(currentLiquidWeight - totalLiquidWeight) > 1) {
      if (!confirm(`La suma de los kilos líquidos asignados (${currentLiquidWeight.toLocaleString()} KG) difiere del total líquido real (${totalLiquidWeight.toLocaleString()} KG). ¿Desea continuar de todos modos?`)) {
        return;
      }
    }

    if (!confirm("¿Desea cerrar este lote? Ya no podrá modificar el romaneo y se generará la cuenta a pagar.")) return;
    
    setLoading(true);

    const formattedPrices = segments.map(seg => ({
      itemId: seg.itemId,
      pricePerKg: Number(seg.pricePerKg),
      liquidWeight: Number(seg.liquidWeight)
    }));

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

  const currentAssignedWeight = segments.reduce((sum, seg) => sum + (seg.liquidWeight || 0), 0);
  const totalValue = segments.reduce((sum, seg) => sum + ((seg.liquidWeight || 0) * (seg.pricePerKg || 0)), 0);

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
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-3xl shadow-2xl my-auto flex flex-col">
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
                <div className="relative w-1/2">
                  <input 
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    required
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(parseFloat(e.target.value) || 0)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-4 pr-10 py-2 text-lg font-bold text-emerald-400 focus:outline-none focus:border-emerald-500/50 transition-colors"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">%</div>
                </div>
                <div className="flex justify-between text-xs text-zinc-500 mt-3 font-medium">
                  <span>Descuento: -{totalDiscountWeight.toLocaleString()} KG</span>
                  <span className="text-emerald-500">Total Líquido Esperado: {totalLiquidWeight.toLocaleString()} KG</span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                  <h3 className="font-medium text-zinc-300">Asignación de Precios</h3>
                  <button 
                    type="button"
                    onClick={handleAddSegment}
                    className="flex items-center gap-1 text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Agregar Precio
                  </button>
                </div>

                <div className="space-y-3">
                  {segments.map((seg, index) => (
                    <div key={seg.id} className="flex gap-3 items-start bg-zinc-950 p-3 rounded-xl border border-zinc-800/50">
                      <div className="flex-1">
                        <label className="block text-xs text-zinc-500 mb-1">Categoría</label>
                        <select
                          value={seg.itemId}
                          onChange={(e) => handleSegmentChange(seg.id, 'itemId', e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50"
                        >
                          {uniqueItems.map((item: any) => (
                            <option key={item.id} value={item.id}>{item.name}</option>
                          ))}
                        </select>
                      </div>
                      
                      <div className="w-32">
                        <label className="block text-xs text-zinc-500 mb-1">KG Líquidos</label>
                        <input
                          type="number"
                          step="0.1"
                          required
                          value={seg.liquidWeight || ''}
                          onChange={(e) => handleSegmentChange(seg.id, 'liquidWeight', parseFloat(e.target.value) || 0)}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50 text-right"
                        />
                      </div>

                      <div className="w-32 relative">
                        <label className="block text-xs text-zinc-500 mb-1">Precio x KG</label>
                        <div className="absolute left-2 top-8 text-xs text-zinc-500 font-bold">₲</div>
                        <input
                          type="number"
                          required
                          min="1"
                          value={seg.pricePerKg || ''}
                          onChange={(e) => handleSegmentChange(seg.id, 'pricePerKg', parseFloat(e.target.value) || 0)}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-6 pr-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50 text-right"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveSegment(seg.id)}
                        className="mt-6 p-2 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  
                  {segments.length === 0 && (
                    <div className="text-center py-6 text-zinc-500 text-sm">
                      No hay precios asignados. Usa el botón de arriba para agregar uno.
                    </div>
                  )}
                </div>

                <div className="bg-zinc-950 p-4 rounded-xl border border-emerald-900/50 mt-4 flex justify-between items-center shadow-[0_0_15px_rgba(16,185,129,0.05)]">
                  <div>
                    <span className="block text-xs text-zinc-500 mb-1">Kilos Asignados</span>
                    <span className={`font-bold font-mono ${Math.abs(currentAssignedWeight - totalLiquidWeight) > 1 ? 'text-amber-500' : 'text-emerald-400'}`}>
                      {currentAssignedWeight.toLocaleString()} / {totalLiquidWeight.toLocaleString()} KG
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="block text-xs text-zinc-500 mb-1">Valor Total de Compra</span>
                    <span className="text-xl font-bold font-mono text-emerald-400">
                      ₲ {totalValue.toLocaleString()}
                    </span>
                  </div>
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
                  disabled={loading || segments.length === 0}
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

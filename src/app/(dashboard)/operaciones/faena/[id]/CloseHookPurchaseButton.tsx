"use client";

import { useState, useEffect } from "react";
import { CheckCircle, X, Plus, Trash2, RefreshCw } from "lucide-react";
import { closeHookPurchase } from "@/actions/faena";

type PriceSegment = {
  id: string;
  itemId: string;
  liquidWeight: number;
  pricePerKg: number;
};

export function CloseHookPurchaseButton({ 
  slaughterId, 
  slaughterDetails,
  disabled 
}: { 
  slaughterId: string;
  slaughterDetails: any[]; // SlaughterDetail with item
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [segments, setSegments] = useState<PriceSegment[]>([]);

  // Unique items in this slaughter
  const uniqueItems = slaughterDetails.reduce((acc, d) => {
    if (!acc.find((i: any) => i.id === d.item.id)) {
      acc.push(d.item);
    }
    return acc;
  }, [] as any[]);

  // Agrupar pesos gancho por itemId
  const grossWeightPerItem = slaughterDetails.reduce((acc, d) => {
    acc[d.item.id] = (acc[d.item.id] || 0) + d.weight;
    return acc;
  }, {} as Record<string, number>);

  const totalWeight = slaughterDetails.reduce((sum, d) => sum + d.weight, 0);

  const initializeSegments = () => {
    const initialSegments = uniqueItems.map((item: any) => ({
      id: Math.random().toString(36).substr(2, 9),
      itemId: item.id,
      liquidWeight: Number((grossWeightPerItem[item.id]).toFixed(2)),
      pricePerKg: 0,
    }));
    setSegments(initialSegments);
  };

  useEffect(() => {
    if (isOpen && segments.length === 0) {
      initializeSegments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

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

  const handleLiquidWeightBlur = (id: string) => {
    setSegments(prev => {
      const changedSeg = prev.find(s => s.id === id);
      if (!changedSeg) return prev;

      const currentAssignedToItem = prev
        .filter(s => s.itemId === changedSeg.itemId)
        .reduce((sum, s) => sum + (s.liquidWeight || 0), 0);
        
      const targetLiquidWeight = grossWeightPerItem[changedSeg.itemId];
      
      const deficit = targetLiquidWeight - currentAssignedToItem;
      
      // Si falta asignar más de 0.1 kg, autocompletar con una nueva línea
      if (deficit > 0.1) {
        const newSegments = [...prev];
        const index = newSegments.findIndex(s => s.id === id);
        const newSeg: PriceSegment = {
          id: Math.random().toString(36).substr(2, 9),
          itemId: changedSeg.itemId,
          liquidWeight: Number(deficit.toFixed(2)),
          pricePerKg: 0 
        };
        newSegments.splice(index + 1, 0, newSeg);
        return newSegments;
      }
      
      return prev;
    });
  };

  async function handleClose(e: React.FormEvent) {
    e.preventDefault();
    if (segments.length === 0) {
      alert("Debe agregar al menos un precio para cerrar la compra al gancho.");
      return;
    }

    const currentLiquidWeight = segments.reduce((sum, seg) => sum + seg.liquidWeight, 0);
    // Allow small rounding differences
    if (Math.abs(currentLiquidWeight - totalWeight) > 1) {
      if (!confirm(`La suma de los kilos asignados (${currentLiquidWeight.toLocaleString()} KG) difiere del total pesado en gancho (${totalWeight.toLocaleString()} KG). ¿Desea continuar de todos modos?`)) {
        return;
      }
    }

    if (!confirm("¿Desea cerrar esta compra al gancho? Ya no podrá cargar medias reses y se generará la cuenta a pagar.")) return;
    
    setLoading(true);

    const formattedPrices = segments.map(seg => ({
      itemId: seg.itemId,
      pricePerKg: Number(seg.pricePerKg),
      liquidWeight: Number(seg.liquidWeight)
    }));

    const res = await closeHookPurchase(slaughterId, {
      prices: formattedPrices
    });
    
    if (res.success) {
      setIsOpen(false);
    } else {
      alert("Error cerrando compra al gancho: " + res.error);
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
        className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 disabled:bg-zinc-800 disabled:text-zinc-500 text-white px-6 py-2.5 rounded-lg font-bold transition-all shadow-lg shadow-rose-600/20"
      >
        <CheckCircle className="w-5 h-5" />
        Cerrar Compra y Faena
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-3xl shadow-2xl my-auto flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-zinc-800 sticky top-0 bg-zinc-900 z-10 rounded-t-2xl">
              <div>
                <h2 className="font-bold text-xl text-zinc-100 text-rose-500">Liquidación de Compra al Gancho</h2>
                <p className="text-xs text-zinc-400 mt-1">Asigna el precio de compra a la carne obtenida en la faena.</p>
              </div>
              <button 
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-zinc-500 hover:text-zinc-300 transition-colors p-1"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleClose} className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 relative">
                <p className="text-zinc-400 text-sm mb-4">Resumen de Faena: {Math.ceil(slaughterDetails.length / 2)} Cabezas aprox | Total Gancho: {totalWeight.toLocaleString()} KG</p>
                
                <button
                  type="button"
                  onClick={initializeSegments}
                  className="absolute top-4 right-4 flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Recalcular Kilos
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                  <h3 className="font-medium text-zinc-300">Asignación de Precios</h3>
                  <button 
                    type="button"
                    onClick={handleAddSegment}
                    className="flex items-center gap-1 text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Agregar Línea Manual
                  </button>
                </div>

                <div className="space-y-3">
                  {segments.map((seg) => (
                    <div key={seg.id} className="flex gap-3 items-start bg-zinc-950 p-3 rounded-xl border border-zinc-800/50">
                      <div className="flex-1">
                        <label className="block text-xs text-zinc-500 mb-1">Categoría</label>
                        <select
                          value={seg.itemId}
                          onChange={(e) => handleSegmentChange(seg.id, 'itemId', e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-rose-500/50"
                        >
                          {uniqueItems.map((item: any) => (
                            <option key={item.id} value={item.id}>{item.name}</option>
                          ))}
                        </select>
                      </div>
                      
                      <div className="w-32">
                        <label className="block text-xs text-zinc-500 mb-1">KG Facturados</label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={seg.liquidWeight === 0 ? '' : seg.liquidWeight}
                          onChange={(e) => handleSegmentChange(seg.id, 'liquidWeight', parseFloat(e.target.value) || 0)}
                          onBlur={() => handleLiquidWeightBlur(seg.id)}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-rose-500/50 text-right"
                        />
                      </div>

                      <div className="w-32 relative">
                        <label className="block text-xs text-zinc-500 mb-1">Precio x KG</label>
                        <div className="absolute left-2 top-8 text-xs text-zinc-500 font-bold">₲</div>
                        <input
                          type="number"
                          required
                          min="1"
                          value={seg.pricePerKg === 0 ? '' : seg.pricePerKg}
                          onChange={(e) => handleSegmentChange(seg.id, 'pricePerKg', parseFloat(e.target.value) || 0)}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-6 pr-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-rose-500/50 text-right"
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
                      No hay precios asignados. Usa el botón de recalcular para generarlos automáticamente.
                    </div>
                  )}
                </div>

                <div className="bg-zinc-950 p-4 rounded-xl border border-rose-900/50 mt-4 flex justify-between items-center shadow-[0_0_15px_rgba(225,29,72,0.05)]">
                  <div>
                    <span className="block text-xs text-zinc-500 mb-1">Kilos Asignados</span>
                    <span className={`font-bold font-mono ${Math.abs(currentAssignedWeight - totalWeight) > 1 ? 'text-amber-500' : 'text-emerald-400'}`}>
                      {currentAssignedWeight.toLocaleString()} / {totalWeight.toLocaleString()} KG
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="block text-xs text-zinc-500 mb-1">Valor Total de Compra</span>
                    <span className="text-xl font-bold font-mono text-emerald-400">
                      ₲ {totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
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
                  className="bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg font-bold transition-all shadow-lg shadow-rose-600/20 flex items-center gap-2"
                >
                  {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
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

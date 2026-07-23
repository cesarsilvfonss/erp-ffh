"use client";

import { useState, useEffect, useMemo } from "react";
import { CheckCircle2, X, Plus, Trash2 } from "lucide-react";
import { closeBatch } from "@/actions/batch";
import { AnimalCategory } from "@prisma/client";

type PriceSegment = {
  id: string;
  category: AnimalCategory;
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
  batchDetails: any[];
  totalHeads: number;
  totalWeight: number;
  disabled: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [merma, setMerma] = useState<number>(4);
  const [segments, setSegments] = useState<PriceSegment[]>([]);

  const categoryStats = useMemo(() => {
    return batchDetails.reduce((acc, d) => {
      if (!acc[d.category]) acc[d.category] = { netWeight: 0, headCount: 0, conditions: {} };
      acc[d.category].netWeight += d.netWeight;
      acc[d.category].headCount += d.quantity;
      if (!acc[d.category].conditions[d.condition]) acc[d.category].conditions[d.condition] = { netWeight: 0, headCount: 0 };
      acc[d.category].conditions[d.condition].netWeight += d.netWeight;
      acc[d.category].conditions[d.condition].headCount += d.quantity;
      return acc;
    }, {} as Record<string, { netWeight: number, headCount: number, conditions: Record<string, { netWeight: number, headCount: number }> }>);
  }, [batchDetails]);

  // Inicializar o resetear segmentos cuando se abre o cambia la merma
  useEffect(() => {
    if (isOpen) {
      const initial: PriceSegment[] = [];
      Object.entries(categoryStats).forEach(([cat, stats]) => {
        const expectedLiquid = stats.netWeight * (1 - (merma / 100));
        initial.push({ 
          id: Math.random().toString(), 
          category: cat as AnimalCategory, 
          liquidWeight: expectedLiquid, 
          pricePerKg: 0 
        });
      });
      setSegments(initial);
    }
  }, [isOpen, merma, categoryStats]);

  const updateSegmentWeight = (id: string, weightStr: string) => {
    const val = parseFloat(weightStr);
    setSegments(prev => prev.map(s => s.id === id ? { ...s, liquidWeight: isNaN(val) ? 0 : val } : s));
  };

  const updateSegmentPrice = (id: string, priceStr: string) => {
    const val = parseFloat(priceStr);
    setSegments(prev => prev.map(s => s.id === id ? { ...s, pricePerKg: isNaN(val) ? 0 : val } : s));
  };

  const removeSegment = (id: string) => {
    setSegments(prev => prev.filter(s => s.id !== id));
  };

  const addSegment = (category: AnimalCategory, weight: number, priceStr: string) => {
    const price = parseFloat(priceStr);
    if (isNaN(price) || price <= 0) return;
    
    setSegments(prev => [
      ...prev,
      { id: Math.random().toString(), category, liquidWeight: weight, pricePerKg: price }
    ]);
  };

  const totalValue = useMemo(() => {
    return segments.reduce((acc, seg) => acc + (seg.liquidWeight * (seg.pricePerKg || 0)), 0);
  }, [segments]);

  // Validar si podemos guardar
  const isValid = useMemo(() => {
    if (segments.some(s => s.pricePerKg <= 0)) return false;
    
    for (const [cat, stats] of Object.entries(categoryStats)) {
      const expectedLiquid = stats.netWeight * (1 - (merma / 100));
      const assigned = segments.filter(s => s.category === cat).reduce((acc, s) => acc + s.liquidWeight, 0);
      if (Math.abs(expectedLiquid - assigned) > 0.1) return false;
    }
    return true;
  }, [segments, merma, categoryStats]);

  async function handleClose() {
    if (!isValid) return;
    setLoading(true);
    
    const payload = {
      batchId,
      discountPercentage: merma,
      prices: segments.map(s => ({
        category: s.category,
        liquidWeight: s.liquidWeight,
        pricePerKg: s.pricePerKg
      }))
    };

    const res = await closeBatch(payload);
    if (res.success) {
      setIsOpen(false);
    } else {
      alert("Error: " + res.error);
    }
    setLoading(false);
  }

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        disabled={disabled}
        className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-950 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-lg shadow-emerald-500/20"
      >
        <CheckCircle2 className="w-4 h-4" />
        Cerrar Lote
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl shadow-2xl my-auto">
            <div className="flex items-center justify-between p-4 border-b border-zinc-800 sticky top-0 bg-zinc-900 z-10 rounded-t-2xl">
              <h2 className="font-bold text-lg text-zinc-100">Liquidación de Lote</h2>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-zinc-500 hover:text-zinc-300 transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              
              {/* DESBASTE GLOBAL */}
              <div className="flex items-center gap-4 bg-zinc-950 border border-zinc-800 rounded-xl p-4">
                <div className="flex-1">
                  <h3 className="font-medium text-zinc-200">Porcentaje de Desbaste</h3>
                  <p className="text-xs text-zinc-500">Se aplicará a todas las categorías para calcular el peso líquido.</p>
                </div>
                <div className="relative w-32">
                  <input 
                    type="number"
                    value={merma}
                    onChange={(e) => setMerma(parseFloat(e.target.value) || 0)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg pr-8 pl-3 py-2 text-right text-emerald-400 font-bold focus:outline-none focus:border-emerald-500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500">%</span>
                </div>
              </div>

              {/* DESGLOSE POR CATEGORIA */}
              <div className="space-y-6">
                {Object.entries(categoryStats).map(([cat, stats]) => {
                  const expectedLiquid = stats.netWeight * (1 - (merma / 100));
                  const catSegments = segments.filter(s => s.category === cat);
                  const assigned = catSegments.reduce((acc, s) => acc + s.liquidWeight, 0);
                  const remaining = expectedLiquid - assigned;
                  const mermaKilos = stats.netWeight * (merma / 100);

                  return (
                    <div key={cat} className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
                      <div className="bg-zinc-800/30 px-4 py-3 border-b border-zinc-800 flex flex-col md:flex-row md:justify-between md:items-center gap-2">
                        <div>
                          <h4 className="font-bold text-zinc-200">{cat} <span className="text-zinc-500 font-normal text-sm">({stats.headCount} cabezas)</span></h4>
                          <div className="flex gap-2 mt-1 flex-wrap">
                            {Object.entries(stats.conditions || {}).map(([cond, cStats]) => (
                              <span key={cond} className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${
                                cond === 'GORDO' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                                cond === 'FLACO' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 
                                'bg-rose-500/10 text-rose-400 border-rose-500/20'
                              }`}>
                                {cond}: {cStats.netWeight.toLocaleString()} KG ({cStats.headCount} cbz)
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="flex gap-4 text-xs">
                          <div className="text-zinc-400"><span className="block text-[10px] uppercase text-zinc-500">Bruto</span>{stats.netWeight.toLocaleString()} KG</div>
                          <div className="text-rose-400"><span className="block text-[10px] uppercase text-rose-500/70">Desbaste</span>-{mermaKilos.toLocaleString(undefined, {maximumFractionDigits:1})} KG</div>
                          <div className="text-emerald-400 font-medium"><span className="block text-[10px] uppercase text-emerald-500/70">Líquido Total</span>{expectedLiquid.toLocaleString(undefined, {maximumFractionDigits:1})} KG</div>
                        </div>
                      </div>
                      
                      <div className="p-4 space-y-3">
                        {catSegments.map((seg, idx) => (
                          <div key={seg.id} className="flex flex-col md:flex-row md:items-center gap-3 bg-zinc-950/50 md:bg-transparent p-3 md:p-0 rounded-lg">
                            <div className="flex-1 w-full">
                              <div className="relative">
                                <input 
                                  type="number" 
                                  value={seg.liquidWeight === 0 ? "" : seg.liquidWeight} 
                                  onChange={(e) => updateSegmentWeight(seg.id, e.target.value)}
                                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 text-xs">KG Líq.</span>
                              </div>
                            </div>
                            <div className="flex-1 w-full">
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">₲</span>
                                <input 
                                  type="number" 
                                  value={seg.pricePerKg === 0 ? "" : seg.pricePerKg} 
                                  onChange={(e) => updateSegmentPrice(seg.id, e.target.value)}
                                  placeholder="Precio por KG"
                                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg pl-8 pr-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500"
                                />
                              </div>
                            </div>
                            <div className="flex justify-between items-center w-full md:w-auto mt-2 md:mt-0">
                              <div className="text-right text-sm font-medium text-emerald-400/80 md:w-24">
                                ₲ {((seg.liquidWeight || 0) * (seg.pricePerKg || 0)).toLocaleString()}
                              </div>
                              <div className="w-8 flex justify-end">
                                {catSegments.length > 1 && (
                                  <button onClick={() => removeSegment(seg.id)} className="text-zinc-600 hover:text-rose-400 transition-colors p-1 bg-zinc-900 rounded md:bg-transparent">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                        
                        {/* Fila sugerida si hay sobrante de kilos */}
                        {remaining > 0.05 && (
                          <div className="flex flex-col md:flex-row md:items-center gap-3 mt-4 pt-4 border-t border-zinc-800/50">
                            <div className="flex-1 w-full">
                              <div className="relative opacity-60">
                                <input 
                                  type="text" 
                                  readOnly 
                                  value={remaining.toLocaleString(undefined, {maximumFractionDigits:2})} 
                                  className="w-full bg-zinc-950 border border-dashed border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-400"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 text-xs">KG Restantes</span>
                              </div>
                            </div>
                            <div className="flex-1 w-full">
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500/50 text-sm">₲</span>
                                <input 
                                  type="number"
                                  placeholder="Asignar precio al resto"
                                  onBlur={(e) => {
                                    if (e.target.value) {
                                      addSegment(cat as AnimalCategory, remaining, e.target.value);
                                      e.target.value = '';
                                    }
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && e.currentTarget.value) {
                                      addSegment(cat as AnimalCategory, remaining, e.currentTarget.value);
                                      e.currentTarget.value = '';
                                    }
                                  }}
                                  className="w-full bg-emerald-950/20 border border-emerald-900/50 rounded-lg pl-8 pr-3 py-2 text-sm text-emerald-100 placeholder-emerald-700 focus:outline-none focus:border-emerald-500"
                                />
                              </div>
                            </div>
                            <div className="w-full md:w-24 text-left md:text-right text-xs text-zinc-500 italic mt-1 md:mt-0">
                              Agregue el precio para completar
                            </div>
                            <div className="hidden md:block w-8"></div>
                          </div>
                        )}
                        {remaining < -0.05 && (
                          <div className="text-rose-400 text-xs text-right mt-2">
                            Has excedido los kilos líquidos en {Math.abs(remaining).toFixed(2)} KG.
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* TOTAL Y GUARDAR */}
              <div className="sticky bottom-0 bg-zinc-900 pt-4 pb-2 border-t border-zinc-800 flex items-center justify-between mt-6">
                <div>
                  <p className="text-xs text-zinc-400 mb-1">Total a Pagar (Guaraníes)</p>
                  <p className="text-2xl font-bold text-emerald-400">
                    ₲ {totalValue.toLocaleString()}
                  </p>
                </div>
                
                <button
                  onClick={handleClose}
                  disabled={loading || !isValid}
                  className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-950 px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/20"
                >
                  {loading ? "Procesando..." : "Cerrar y Liquidar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

"use client";

import { useState } from "react";
import { CheckCircle2, X } from "lucide-react";
import { closeBatch } from "@/actions/batch";
import { AnimalCategory } from "@prisma/client";

export function CloseBatchButton({ 
  batchId, 
  categories,
  totalHeads,
  totalWeight,
  disabled
}: { 
  batchId: string;
  categories: AnimalCategory[];
  totalHeads: number;
  totalWeight: number;
  disabled: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [prices, setPrices] = useState<Partial<Record<AnimalCategory, number>>>({});

  // 4% default merma
  const merma = totalWeight * 0.04;
  const liquidWeight = totalWeight - merma;

  async function handleClose() {
    setLoading(true);
    const res = await closeBatch({ batchId, prices });
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-zinc-800">
              <h2 className="font-bold text-lg text-zinc-100">Liquidar y Cerrar Lote</h2>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-zinc-500 hover:text-zinc-300 transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="bg-zinc-950 rounded-lg p-4 text-sm space-y-2 border border-zinc-800/50">
                <div className="flex justify-between text-zinc-400">
                  <span>Cabezas Totales:</span>
                  <span className="text-zinc-100 font-medium">{totalHeads}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Peso Bruto:</span>
                  <span className="text-zinc-100 font-medium">{totalWeight.toLocaleString()} KG</span>
                </div>
                <div className="flex justify-between text-rose-400">
                  <span>Merma (4%):</span>
                  <span>-{merma.toLocaleString()} KG</span>
                </div>
                <div className="flex justify-between text-emerald-400 pt-2 border-t border-zinc-800 font-medium">
                  <span>Peso Líquido Total:</span>
                  <span>{liquidWeight.toLocaleString()} KG</span>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-medium text-zinc-300">Ingrese los precios pactados por KG (Líquido)</h3>
                
                {categories.map((cat) => (
                  <div key={cat} className="flex items-center gap-4">
                    <label className="w-24 text-sm text-zinc-400 font-medium">{cat}</label>
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">₲</span>
                      <input 
                        type="number"
                        placeholder="Ej: 15500"
                        value={prices[cat] || ""}
                        onChange={(e) => setPrices({...prices, [cat]: parseFloat(e.target.value) || 0})}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-8 pr-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4">
                <p className="text-xs text-emerald-400/80 mb-1">Total preliminar a pagar</p>
                <p className="text-2xl font-bold text-emerald-400">
                  {/* Estimación simple en UI, cálculo real se hace en Backend */}
                  {categories.length > 0 ? "Por calcular..." : "₲ 0"}
                </p>
              </div>

              <button
                onClick={handleClose}
                disabled={loading}
                className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-zinc-950 px-4 py-3 rounded-xl font-bold transition-all"
              >
                {loading ? "Procesando..." : "Confirmar y Generar Deuda"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

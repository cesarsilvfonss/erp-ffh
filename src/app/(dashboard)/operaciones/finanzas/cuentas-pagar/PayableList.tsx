"use client";

import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Clock, CheckCircle2, AlertCircle, HandCoins } from "lucide-react";

export function PayableList({ payables, bankAccounts }: { payables: any[], bankAccounts: any[] }) {
  const [searchTerm, setSearchTerm] = useState("");

  const filtered = payables.filter(p => 
    p.provider.legalName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between gap-4">
        <input 
          type="text"
          placeholder="Buscar proveedor..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-950 text-zinc-400">
            <tr>
              <th className="px-6 py-3 font-medium">Vencimiento</th>
              <th className="px-6 py-3 font-medium">Proveedor</th>
              <th className="px-6 py-3 font-medium">Tipo / Origen</th>
              <th className="px-6 py-3 font-medium text-right">Total (₲)</th>
              <th className="px-6 py-3 font-medium text-right">Pagado (₲)</th>
              <th className="px-6 py-3 font-medium text-right">Saldo (₲)</th>
              <th className="px-6 py-3 font-medium text-center">Estado</th>
              <th className="px-6 py-3 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800 text-zinc-300">
            {filtered.map((payable) => {
              const saldo = payable.amount - payable.paidAmount;
              const isOverdue = saldo > 0 && new Date(payable.dueDate) < new Date();

              return (
                <tr key={payable.id} className="hover:bg-zinc-800/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className={`font-medium ${isOverdue ? 'text-rose-400' : 'text-zinc-300'}`}>
                        {format(new Date(payable.dueDate), "dd MMM yyyy", { locale: es })}
                      </span>
                      {isOverdue && <span className="text-[10px] text-rose-500 font-bold uppercase mt-0.5">Vencido</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4 font-medium text-zinc-100">{payable.provider.legalName}</td>
                  <td className="px-6 py-4">
                    {payable.type === 'LOAN' && (
                      <span className="px-2 py-1 rounded text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1 w-max">
                        <HandCoins className="w-3 h-3" /> Préstamo
                      </span>
                    )}
                    {payable.type === 'BATCH_PURCHASE' && (
                      <span className="px-2 py-1 rounded text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        Compra Lote
                      </span>
                    )}
                    {payable.type === 'EXPENSE' && (
                      <span className="px-2 py-1 rounded text-xs font-bold bg-zinc-700/50 text-zinc-300 border border-zinc-600/50">
                        Gasto
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right font-mono">{payable.amount.toLocaleString()}</td>
                  <td className="px-6 py-4 text-right font-mono text-emerald-400/80">{payable.paidAmount.toLocaleString()}</td>
                  <td className="px-6 py-4 text-right font-mono font-bold text-amber-400">{saldo.toLocaleString()}</td>
                  <td className="px-6 py-4 text-center">
                    {payable.status === "PENDING" && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-500 border border-amber-500/20"><Clock className="w-3.5 h-3.5" /> Pendiente</span>}
                    {payable.status === "PARTIAL" && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20"><AlertCircle className="w-3.5 h-3.5" /> Parcial</span>}
                    {payable.status === "PAID" && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"><CheckCircle2 className="w-3.5 h-3.5" /> Pagado</span>}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {saldo > 0 && (
                      <button 
                        className="text-emerald-400 hover:text-emerald-300 text-sm font-medium hover:underline"
                        onClick={() => alert("Función de Registrar Pago de Cuentas por Pagar en desarrollo (próximo paso)")}
                      >
                        Pagar
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-zinc-500">
                  No hay cuentas por pagar registradas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

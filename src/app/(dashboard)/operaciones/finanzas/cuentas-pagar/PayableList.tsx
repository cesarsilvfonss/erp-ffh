"use client";

import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Clock, CheckCircle2, AlertCircle, HandCoins } from "lucide-react";
import { PayablePaymentModal } from "./PayablePaymentModal";
import { BulkPayablePaymentModal } from "./BulkPayablePaymentModal";

export function PayableList({ payables, bankAccounts }: { payables: any[], bankAccounts: any[] }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPayable, setSelectedPayable] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"ALL" | "BATCH_PURCHASE" | "EXPENSE" | "LOAN">("ALL");

  const filtered = payables.filter(p => {
    const matchesSearch = p.provider.legalName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTab = activeTab === "ALL" || p.type === activeTab;
    return matchesSearch && matchesTab;
  });

  const handleTabChange = (tab: "ALL" | "BATCH_PURCHASE" | "EXPENSE" | "LOAN") => {
    setActiveTab(tab);
    setSelectedIds(new Set()); // Clear selection when changing tabs
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const allPendingIds = filtered.filter(p => p.status !== "PAID").map(p => p.id);
      setSelectedIds(new Set(allPendingIds));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const selectedPayablesData = payables.filter(p => selectedIds.has(p.id));
  const totalBulkAmount = selectedPayablesData.reduce((acc, p) => acc + (p.amount - p.paidAmount), 0);

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden relative">
      <div className="border-b border-zinc-800">
        <div className="flex px-4 overflow-x-auto hide-scrollbar">
          {(["ALL", "BATCH_PURCHASE", "EXPENSE", "LOAN"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              className={`px-4 py-4 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                activeTab === tab
                  ? "border-emerald-500 text-emerald-400"
                  : "border-transparent text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
              }`}
            >
              {tab === "ALL" && "Todos"}
              {tab === "BATCH_PURCHASE" && "Compras de Hacienda"}
              {tab === "EXPENSE" && "Gastos Operativos"}
              {tab === "LOAN" && "Préstamos Adquiridos"}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 border-b border-zinc-800 flex items-center justify-between gap-4">
        <input 
          type="text"
          placeholder="Buscar proveedor..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50"
        />
        
        {selectedIds.size > 0 && (
          <button
            onClick={() => setIsBulkModalOpen(true)}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-emerald-900/20"
          >
            Pagar {selectedIds.size} seleccionados (Total: ₲ {totalBulkAmount.toLocaleString()})
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-950 text-zinc-400">
            <tr>
              <th className="px-6 py-3 font-medium w-10">
                <input 
                  type="checkbox"
                  onChange={handleSelectAll}
                  checked={selectedIds.size > 0 && selectedIds.size === filtered.filter(p => p.status !== "PAID").length}
                  className="rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-emerald-500/50"
                />
              </th>
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
              const isPaid = payable.status === "PAID";

              return (
                <tr key={payable.id} className="hover:bg-zinc-800/50 transition-colors">
                  <td className="px-6 py-4">
                    {!isPaid && (
                      <input 
                        type="checkbox"
                        checked={selectedIds.has(payable.id)}
                        onChange={() => handleSelectOne(payable.id)}
                        className="rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-emerald-500/50"
                      />
                    )}
                  </td>
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
                    {!isPaid && (
                      <button 
                        className="text-emerald-400 hover:text-emerald-300 text-sm font-medium hover:underline"
                        onClick={() => setSelectedPayable(payable)}
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
                <td colSpan={9} className="px-6 py-8 text-center text-zinc-500">
                  No hay cuentas por pagar registradas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <PayablePaymentModal 
        isOpen={!!selectedPayable}
        onClose={() => setSelectedPayable(null)}
        payable={selectedPayable}
        banks={bankAccounts}
      />

      {isBulkModalOpen && (
        <BulkPayablePaymentModal
          isOpen={isBulkModalOpen}
          onClose={() => setIsBulkModalOpen(false)}
          payables={selectedPayablesData}
          banks={bankAccounts}
          onSuccess={() => {
            setIsBulkModalOpen(false);
            setSelectedIds(new Set());
          }}
        />
      )}
    </div>
  );
}

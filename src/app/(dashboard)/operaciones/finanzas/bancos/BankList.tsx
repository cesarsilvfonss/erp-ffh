"use client";

import React, { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Building2, ChevronDown, ChevronUp, ArrowUpRight, ArrowDownRight, RefreshCcw } from "lucide-react";

export function BankList({ initialBanks }: { initialBanks: any[] }) {
  const [banks, setBanks] = useState(initialBanks);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const formatCurrency = (val: number, code: string) => 
    new Intl.NumberFormat('es-PY', { style: 'currency', currency: code }).format(val);

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-900 border-b border-zinc-800 text-zinc-400">
            <tr>
              <th className="px-6 py-4 font-medium w-8"></th>
              <th className="px-6 py-4 font-medium">Banco</th>
              <th className="px-6 py-4 font-medium">Cuenta</th>
              <th className="px-6 py-4 font-medium">Moneda</th>
              <th className="px-6 py-4 font-medium">Estado</th>
              <th className="px-6 py-4 font-medium text-right">Saldo Actual</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {banks.map((bank) => {
              const isExpanded = expandedId === bank.id;

              return (
                <React.Fragment key={bank.id}>
                  <tr className={`hover:bg-zinc-800/50 transition-colors ${isExpanded ? 'bg-zinc-800/30' : ''}`}>
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => setExpandedId(isExpanded ? null : bank.id)}
                        className="text-zinc-500 hover:text-zinc-300 transition-colors"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </td>
                    <td className="px-6 py-4 font-medium text-zinc-200">
                      {bank.bankName}
                    </td>
                    <td className="px-6 py-4 text-zinc-400">
                      {bank.accountName} <br/>
                      <span className="text-xs">{bank.accountNumber}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-1 rounded border border-zinc-700 bg-zinc-800 text-xs text-zinc-300 font-medium">
                        {bank.currency.code}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {bank.status ? (
                        <span className="text-emerald-400 text-xs font-medium bg-emerald-400/10 border border-emerald-400/20 px-2 py-1 rounded">Activo</span>
                      ) : (
                        <span className="text-zinc-500 text-xs font-medium bg-zinc-800 border border-zinc-700 px-2 py-1 rounded">Inactivo</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-emerald-400">
                      {formatCurrency(bank.initialBalance, bank.currency.code)}
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 bg-zinc-900/30">
                        <div className="pl-8 border-l-2 border-zinc-800 space-y-3">
                          <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Últimos Movimientos (Top 10)</h4>
                          
                          {bank.transactions.length === 0 ? (
                            <p className="text-sm text-zinc-500 italic">No hay movimientos registrados.</p>
                          ) : (
                            <div className="space-y-2">
                              {bank.transactions.map((tx: any) => (
                                <div key={tx.id} className="flex items-center justify-between text-sm bg-zinc-900 border border-zinc-800 p-3 rounded-lg">
                                  <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${
                                      tx.type === "INCOME" ? "bg-emerald-500/10 text-emerald-400" :
                                      tx.type === "EXPENSE" ? "bg-rose-500/10 text-rose-400" :
                                      "bg-blue-500/10 text-blue-400"
                                    }`}>
                                      {tx.type === "INCOME" ? <ArrowDownRight className="w-4 h-4" /> :
                                       tx.type === "EXPENSE" ? <ArrowUpRight className="w-4 h-4" /> :
                                       <RefreshCcw className="w-4 h-4" />}
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="font-medium text-zinc-300">{tx.concept}</span>
                                      <span className="text-xs text-zinc-500">
                                        {format(new Date(tx.date), "dd/MM/yyyy HH:mm")}
                                        {tx.reference && ` • Ref: ${tx.reference}`}
                                        {tx.user && ` • Por: ${tx.user.name}`}
                                      </span>
                                    </div>
                                  </div>
                                  <span className={`font-medium ${
                                    tx.type === "INCOME" ? "text-emerald-400" :
                                    tx.type === "EXPENSE" ? "text-rose-400" :
                                    "text-blue-400"
                                  }`}>
                                    {tx.type === "INCOME" ? "+" : "-"} {formatCurrency(tx.amount, bank.currency.code)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

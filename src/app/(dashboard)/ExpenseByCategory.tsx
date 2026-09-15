"use client";

import { motion } from "framer-motion";
import { Receipt } from "lucide-react";

export function ExpenseByCategory({ 
  expenses 
}: { 
  expenses: { category: string; amount: number }[] 
}) {
  const formatCurrency = (val: number) => 
    val.toLocaleString("es-PY", { style: "currency", currency: "PYG", maximumFractionDigits: 0 });

  return (
    <div className="mt-8 bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
      <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Receipt className="w-5 h-5 text-rose-500" />
            Gastos por Categoría
          </h2>
          <p className="text-zinc-400 text-sm mt-1">
            Distribución de gastos del periodo contable actual.
          </p>
        </div>
      </div>

      <div className="p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="pb-3 font-medium text-zinc-400 text-sm">Categoría</th>
                <th className="pb-3 font-medium text-zinc-400 text-sm text-right">Total Gastado</th>
              </tr>
            </thead>
            <tbody>
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={2} className="py-8 text-center text-zinc-500">
                    No hay gastos en este periodo.
                  </td>
                </tr>
              ) : (
                expenses.map((exp, idx) => (
                  <tr key={idx} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                    <td className="py-4">
                      <span className="font-bold text-zinc-100">{exp.category}</span>
                    </td>
                    <td className="py-4 text-right">
                      <span className="font-medium text-rose-400">{formatCurrency(exp.amount)}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

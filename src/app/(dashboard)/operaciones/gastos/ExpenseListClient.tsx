"use client";

import { useState } from "react";
import { Search } from "lucide-react";

export function ExpenseListClient({ expenses, categories }: { expenses: any[], categories: any[] }) {
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const filtered = expenses.filter(exp => {
    if (categoryId && exp.categoryId !== categoryId) return false;
    
    if (startDate) {
      const expDate = new Date(exp.date);
      const sDate = new Date(startDate + "T00:00:00");
      if (expDate < sDate) return false;
    }
    
    if (endDate) {
      const expDate = new Date(exp.date);
      const eDate = new Date(endDate + "T23:59:59");
      if (expDate > eDate) return false;
    }

    if (search) {
      const q = search.toLowerCase();
      if (
        !exp.provider.legalName.toLowerCase().includes(q) &&
        !exp.description.toLowerCase().includes(q) &&
        !(exp.batch && exp.batch.batchNumber.toString().includes(q))
      ) {
        return false;
      }
    }

    return true;
  });

  const totalFiltered = filtered.reduce((acc, g) => acc + g.amount, 0);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
          <p className="text-sm text-zinc-400 mb-1">Total (Filtrado)</p>
          <p className="text-3xl font-bold text-rose-400">₲ {totalFiltered.toLocaleString()}</p>
        </div>
      </div>

      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-zinc-800 flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input 
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar gasto, proveedor o lote..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50 transition-all"
            />
          </div>
          
          <select 
            value={categoryId} 
            onChange={e => setCategoryId(e.target.value)}
            className="bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50"
          >
            <option value="">Todas las Categorías</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <div className="flex items-center gap-2">
            <input 
              type="date" 
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50"
            />
            <span className="text-zinc-500">-</span>
            <input 
              type="date" 
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-950 text-zinc-400">
              <tr>
                <th className="px-6 py-3 font-medium">Fecha</th>
                <th className="px-6 py-3 font-medium">Categoría</th>
                <th className="px-6 py-3 font-medium">Proveedor</th>
                <th className="px-6 py-3 font-medium">Lote Asociado</th>
                <th className="px-6 py-3 font-medium">Descripción</th>
                <th className="px-6 py-3 font-medium text-right">Monto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 text-zinc-300">
              {filtered.map((exp) => (
                <tr key={exp.id} className="hover:bg-zinc-800/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-zinc-400">
                    {new Date(exp.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 font-medium text-zinc-200">
                    {exp.category.name}
                  </td>
                  <td className="px-6 py-4">
                    {exp.provider.legalName}
                  </td>
                  <td className="px-6 py-4">
                    {exp.batch ? (
                      <span className="px-2 py-1 rounded bg-zinc-800 text-zinc-300 border border-zinc-700 text-xs">
                        Lote #{exp.batch.batchNumber}
                      </span>
                    ) : (
                      <span className="text-zinc-500 italic text-xs">General</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-zinc-400 max-w-xs truncate">
                    {exp.description}
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-rose-400">
                    ₲ {exp.amount.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="p-8 text-center text-zinc-500">
              No se encontraron gastos con estos filtros.
            </div>
          )}
        </div>
      </div>
    </>
  );
}

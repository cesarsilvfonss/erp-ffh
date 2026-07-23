"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Save, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { createBulkExpenses } from "@/actions/bulkExpense";

type ExpenseRow = {
  id: string;
  categoryId: string;
  providerId: string;
  description: string;
  amount: number;
};

export function BulkExpenseForm({ 
  batches, 
  categories, 
  providers 
}: { 
  batches: any[]; 
  categories: any[]; 
  providers: any[] 
}) {
  const router = useRouter();
  const [batchId, setBatchId] = useState<string>("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [rows, setRows] = useState<ExpenseRow[]>([
    { id: Math.random().toString(), categoryId: "", providerId: "", description: "", amount: 0 }
  ]);
  const [loading, setLoading] = useState(false);

  const addRow = () => {
    setRows([...rows, { id: Math.random().toString(), categoryId: "", providerId: "", description: "", amount: 0 }]);
  };

  const removeRow = (id: string) => {
    if (rows.length === 1) return;
    setRows(rows.filter(r => r.id !== id));
  };

  const updateRow = (id: string, field: keyof ExpenseRow, value: any) => {
    setRows(rows.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const totalAmount = rows.reduce((acc, r) => acc + (r.amount || 0), 0);

  const handleSubmit = async () => {
    // Validations
    if (!batchId) return alert("Debe seleccionar un lote.");
    if (rows.some(r => !r.categoryId || !r.providerId || r.amount <= 0)) {
      return alert("Complete todos los campos requeridos en las filas de gastos (Monto debe ser mayor a 0).");
    }

    setLoading(true);
    const res = await createBulkExpenses({
      batchId,
      date: new Date(date),
      expenses: rows.map(r => ({
        categoryId: r.categoryId,
        providerId: r.providerId,
        description: r.description,
        amount: r.amount
      }))
    });

    if (res.success) {
      router.push("/operaciones/gastos");
      router.refresh();
    } else {
      alert("Error: " + res.error);
      setLoading(false);
    }
  };

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 pb-6 border-b border-zinc-800">
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-2">Lote Asociado *</label>
          <select 
            value={batchId}
            onChange={e => setBatchId(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50"
          >
            <option value="">Seleccione un lote...</option>
            {batches.map(b => (
              <option key={b.id} value={b.id}>
                Lote #{b.batchNumber} - {b.provider.legalName} ({new Date(b.date).toLocaleDateString()})
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-2">Fecha del Gasto *</label>
          <input 
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50"
          />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold text-zinc-200">Detalle de Gastos</h3>
        
        {/* Desktop Headers */}
        <div className="hidden md:grid grid-cols-12 gap-4 text-xs font-medium text-zinc-500 px-2">
          <div className="col-span-3">Categoría de Gasto *</div>
          <div className="col-span-3">Proveedor / Acreedor *</div>
          <div className="col-span-3">Descripción / Referencia</div>
          <div className="col-span-2 text-right">Monto (₲) *</div>
          <div className="col-span-1 text-center">X</div>
        </div>

        {rows.map((row, index) => (
          <div key={row.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-zinc-950/50 p-4 md:p-2 rounded-lg items-center border border-zinc-800/50 md:border-none">
            
            <div className="md:col-span-3">
              <label className="md:hidden block text-xs text-zinc-500 mb-1">Categoría</label>
              <select 
                value={row.categoryId}
                onChange={e => updateRow(row.id, "categoryId", e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50"
              >
                <option value="">Seleccionar...</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div className="md:col-span-3">
              <label className="md:hidden block text-xs text-zinc-500 mb-1">Proveedor</label>
              <select 
                value={row.providerId}
                onChange={e => updateRow(row.id, "providerId", e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50"
              >
                <option value="">Seleccionar...</option>
                {providers.map(p => <option key={p.id} value={p.id}>{p.legalName}</option>)}
              </select>
            </div>

            <div className="md:col-span-3">
              <label className="md:hidden block text-xs text-zinc-500 mb-1">Descripción</label>
              <input 
                type="text" 
                value={row.description}
                onChange={e => updateRow(row.id, "description", e.target.value)}
                placeholder="Ej: Flete de estancia a planta"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50"
              />
            </div>

            <div className="md:col-span-2">
              <label className="md:hidden block text-xs text-zinc-500 mb-1">Monto</label>
              <input 
                type="number"
                value={row.amount === 0 ? "" : row.amount}
                onChange={e => updateRow(row.id, "amount", parseFloat(e.target.value) || 0)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-right font-medium text-emerald-400 focus:outline-none focus:border-emerald-500/50"
              />
            </div>

            <div className="md:col-span-1 flex justify-end md:justify-center mt-2 md:mt-0">
              <button 
                onClick={() => removeRow(row.id)}
                disabled={rows.length === 1}
                className="p-2 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg disabled:opacity-50 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

          </div>
        ))}
      </div>

      <div className="mt-4 flex justify-between items-center pb-6 border-b border-zinc-800">
        <button 
          onClick={addRow}
          className="flex items-center gap-2 text-sm text-emerald-400 hover:text-emerald-300 font-medium px-2 py-1 rounded hover:bg-emerald-500/10 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Agregar Fila
        </button>

        <div className="text-right">
          <p className="text-xs text-zinc-500">Total a Pagar</p>
          <p className="text-2xl font-bold text-emerald-400">₲ {totalAmount.toLocaleString()}</p>
        </div>
      </div>

      <div className="mt-6 flex justify-between">
        <Link 
          href="/operaciones/gastos"
          className="flex items-center gap-2 text-zinc-400 hover:text-zinc-200 font-medium px-4 py-2 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Cancelar
        </Link>
        <button 
          onClick={handleSubmit}
          disabled={loading || totalAmount === 0}
          className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-zinc-950 px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2"
        >
          <Save className="w-5 h-5" />
          {loading ? "Guardando..." : "Guardar Gastos"}
        </button>
      </div>

    </div>
  );
}

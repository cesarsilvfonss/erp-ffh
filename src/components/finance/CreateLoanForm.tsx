"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createLoan } from "@/actions/finance";
import { Save, Plus, Trash2, Building2, Landmark, Calendar, Banknote } from "lucide-react";

export function CreateLoanForm({ 
  providers, 
  bankAccounts 
}: { 
  providers: { id: string, legalName: string, ruc: string | null }[],
  bankAccounts: { id: string, bankName: string, accountNumber: string, currency: { symbol: string } }[]
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [providerId, setProviderId] = useState(providers[0]?.id || "");
  const [bankAccountId, setBankAccountId] = useState(bankAccounts[0]?.id || "");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [concept, setConcept] = useState("");
  const [principalAmount, setPrincipalAmount] = useState("");

  const [quotas, setQuotas] = useState<{ date: string, amount: string }[]>([
    { date: "", amount: "" }
  ]);

  const handleAddQuota = () => {
    setQuotas([...quotas, { date: "", amount: "" }]);
  };

  const handleRemoveQuota = (index: number) => {
    setQuotas(quotas.filter((_, i) => i !== index));
  };

  const handleQuotaChange = (index: number, field: string, value: string) => {
    const newQuotas = [...quotas];
    newQuotas[index] = { ...newQuotas[index], [field]: value };
    setQuotas(newQuotas);
  };

  const totalPrincipal = parseFloat(principalAmount) || 0;
  const totalQuotas = quotas.reduce((acc, q) => acc + (parseFloat(q.amount) || 0), 0);
  const interestTotal = totalQuotas - totalPrincipal;
  const interestRate = totalPrincipal > 0 ? (interestTotal / totalPrincipal) * 100 : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!providerId || !bankAccountId || !principalAmount) return;

    for (const q of quotas) {
      if (!q.date || !q.amount || parseFloat(q.amount) <= 0) {
        alert("Complete correctamente todas las cuotas (fecha y monto mayor a 0).");
        return;
      }
    }

    if (totalQuotas < totalPrincipal) {
      alert("El total a pagar en cuotas no puede ser menor al capital acreditado.");
      return;
    }

    setLoading(true);
    const res = await createLoan({
      providerId,
      bankAccountId,
      date,
      principalAmount: totalPrincipal,
      concept,
      quotas: quotas.map(q => ({ date: q.date, amount: parseFloat(q.amount) }))
    });

    if (res.success) {
      router.push("/operaciones/finanzas");
    } else {
      alert("Error: " + res.error);
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-2xl">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-2">
          <label className="block text-sm font-medium text-zinc-400 mb-2">Proveedor / Acreedor *</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Building2 className="h-5 w-5 text-zinc-500" />
            </div>
            <select 
              value={providerId}
              onChange={e => setProviderId(e.target.value)}
              required
              disabled={loading}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-10 pr-4 py-2.5 text-zinc-100 focus:outline-none focus:border-emerald-500/50"
            >
              {providers.map(p => <option key={p.id} value={p.id}>{p.legalName} {p.ruc ? `(${p.ruc})` : ""}</option>)}
            </select>
          </div>
        </div>

        <div className="lg:col-span-2">
          <label className="block text-sm font-medium text-zinc-400 mb-2">Cuenta Destino (Ingreso de Capital) *</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Landmark className="h-5 w-5 text-zinc-500" />
            </div>
            <select 
              value={bankAccountId}
              onChange={e => setBankAccountId(e.target.value)}
              required
              disabled={loading}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-10 pr-4 py-2.5 text-zinc-100 focus:outline-none focus:border-emerald-500/50"
            >
              {bankAccounts.map(b => <option key={b.id} value={b.id}>{b.bankName} - {b.accountNumber} ({b.currency.symbol})</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-2">Fecha del Préstamo *</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Calendar className="h-5 w-5 text-zinc-500" />
            </div>
            <input 
              type="date" 
              required
              disabled={loading}
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-10 pr-4 py-2.5 text-zinc-100 focus:outline-none focus:border-emerald-500/50"
            />
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-2">Monto a Acreditar (Capital) *</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500 font-bold">
              ₲
            </div>
            <input 
              type="number"
              min="1"
              required
              disabled={loading}
              value={principalAmount}
              onChange={e => setPrincipalAmount(e.target.value)}
              placeholder="0"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-10 pr-4 py-2.5 text-zinc-100 font-mono focus:outline-none focus:border-emerald-500/50"
            />
          </div>
        </div>

        <div className="lg:col-span-2">
          <label className="block text-sm font-medium text-zinc-400 mb-2">Concepto / Descripción *</label>
          <input 
            type="text"
            required
            disabled={loading}
            value={concept}
            onChange={e => setConcept(e.target.value)}
            placeholder="Ej: Préstamo para compra de ganado"
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-zinc-100 focus:outline-none focus:border-emerald-500/50"
          />
        </div>
      </div>

      <div className="mt-8 border-t border-zinc-800 pt-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-zinc-200">Plan de Pagos (Cuotas)</h2>
          <button 
            type="button"
            onClick={handleAddQuota}
            disabled={loading}
            className="flex items-center gap-2 text-sm text-emerald-400 hover:text-emerald-300 font-medium px-3 py-1.5 rounded-lg hover:bg-emerald-500/10 transition-colors"
          >
            <Plus className="w-4 h-4" /> Agregar Cuota
          </button>
        </div>

        <div className="space-y-3">
          {quotas.map((q, index) => (
            <div key={index} className="flex flex-col md:flex-row gap-3 bg-zinc-950 p-4 rounded-lg border border-zinc-800/50 items-end">
              <div className="flex-1">
                <label className="block text-xs font-medium text-zinc-500 mb-1">Vencimiento Cuota {index + 1}</label>
                <input
                  type="date"
                  required
                  disabled={loading}
                  value={q.date}
                  onChange={e => handleQuotaChange(index, "date", e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50"
                />
              </div>
              
              <div className="flex-1 relative">
                <label className="block text-xs font-medium text-zinc-500 mb-1">Monto a Pagar (Capital + Interés)</label>
                <div className="absolute left-3 top-8 text-xs text-zinc-500 font-bold">₲</div>
                <input
                  type="number"
                  min="1"
                  required
                  disabled={loading}
                  value={q.amount}
                  onChange={e => handleQuotaChange(index, "amount", e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-7 pr-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50 text-right font-mono"
                  placeholder="0"
                />
              </div>

              <div className="pb-1">
                <button
                  type="button"
                  onClick={() => handleRemoveQuota(index)}
                  disabled={quotas.length === 1 || loading}
                  className="p-2 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-6 border-t border-zinc-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex flex-col gap-2 w-full md:w-auto">
          <div className="flex items-center justify-between md:justify-start gap-4 px-4">
            <span className="text-zinc-500 font-medium text-sm">Capital Acreditado:</span>
            <span className="font-bold text-zinc-300 font-mono">₲ {totalPrincipal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
          </div>

          <div className="flex items-center justify-between md:justify-start gap-4 px-4">
            <span className="text-rose-500/80 font-medium text-sm">Interés Calculado:</span>
            <span className="font-bold text-rose-400 font-mono">
              + ₲ {interestTotal > 0 ? interestTotal.toLocaleString(undefined, { maximumFractionDigits: 0 }) : 0} ({interestRate.toFixed(2)}%)
            </span>
          </div>

          <div className="flex items-center justify-between md:justify-start gap-4 bg-zinc-950 px-6 py-3 rounded-xl border border-amber-900/50 shadow-[0_0_15px_rgba(245,158,11,0.05)] mt-2">
            <span className="text-amber-400 font-bold text-lg">Total a Pagar (Cuotas):</span>
            <span className="text-2xl font-black text-amber-400 font-mono">
              ₲ {totalQuotas.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || totalPrincipal === 0 || totalQuotas === 0}
          className="w-full md:w-auto bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-zinc-950 px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-zinc-950/30 border-t-zinc-950 rounded-full animate-spin" />
          ) : (
            <Save className="w-5 h-5" />
          )}
          Registrar Préstamo
        </button>
      </div>
    </form>
  );
}

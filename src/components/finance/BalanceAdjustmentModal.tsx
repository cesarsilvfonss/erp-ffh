"use client";

import { useState } from "react";
import { adjustBankBalance } from "@/actions/banks";
import { X, Settings2 } from "lucide-react";

export function BalanceAdjustmentModal({ 
  bankAccountId,
  bankName,
  currentBalance,
  onClose 
}: { 
  bankAccountId: string;
  bankName: string;
  currentBalance: number;
  onClose: () => void;
}) {
  const [newBalance, setNewBalance] = useState<number>(currentBalance);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newBalance === currentBalance) {
      alert("El nuevo saldo debe ser diferente al actual.");
      return;
    }
    if (!reason.trim()) {
      alert("Por favor, ingrese un motivo para el ajuste.");
      return;
    }

    setLoading(true);
    const res = await adjustBankBalance({
      bankAccountId,
      newBalance,
      reason
    });

    if (res.success) {
      onClose();
    } else {
      alert("Error: " + res.error);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl w-full max-w-md overflow-hidden">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
          <div className="flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-emerald-400" />
            <h2 className="font-semibold text-zinc-100">Ajuste de Saldo</h2>
          </div>
          <button onClick={onClose} className="p-1 text-zinc-400 hover:text-zinc-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="bg-zinc-900/50 p-3 rounded-lg border border-zinc-800/50">
            <p className="text-sm text-zinc-400 mb-1">Cuenta</p>
            <p className="font-medium text-zinc-100">{bankName}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">
              Saldo Actual
            </label>
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-500 font-mono">
              Gs. {currentBalance.toLocaleString("es-PY")}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-200 mb-1">
              Nuevo Saldo Real (Gs) *
            </label>
            <input
              type="number"
              required
              value={newBalance}
              onChange={(e) => setNewBalance(Number(e.target.value))}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-100 focus:outline-none focus:border-emerald-500/50 transition-colors font-mono"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-200 mb-1">
              Motivo del Ajuste *
            </label>
            <textarea
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej: Corrección por diferencia en extracto físico..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-100 focus:outline-none focus:border-emerald-500/50 transition-colors h-20 resize-none"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading || newBalance === currentBalance}
              className="w-full bg-emerald-500 text-zinc-950 font-semibold py-2 rounded-lg hover:bg-emerald-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Registrando Ajuste..." : "Aplicar Ajuste"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

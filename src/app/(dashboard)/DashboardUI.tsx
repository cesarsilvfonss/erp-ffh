"use client";

import { motion } from "framer-motion";
import { Beef, CircleDollarSign, TrendingUp, Users, AlertTriangle, Receipt, ArrowDownRight, ArrowUpRight } from "lucide-react";
import Link from "next/link";

export function DashboardUI({ 
  bankBalance, 
  inventoryValue, 
  salesThisMonth, 
  costOfSalesThisMonth,
  grossProfit,
  mermasThisMonth,
  expensesThisMonth,
  retentionsThisMonth,
  netProfit,
  receivables,
  payables
}: {
  bankBalance: number;
  inventoryValue: number;
  salesThisMonth: number;
  costOfSalesThisMonth: number;
  grossProfit: number;
  mermasThisMonth: number;
  expensesThisMonth: number;
  retentionsThisMonth: number;
  netProfit: number;
  receivables: number;
  payables: number;
}) {
  const formatCurrency = (value: number) => {
    return value.toLocaleString("es-PY", { style: "currency", currency: "PYG", maximumFractionDigits: 0 });
  };

  const metrics = [
    { label: "Saldo Bancario", value: formatCurrency(bankBalance), icon: CircleDollarSign, trend: "Actualizado", trendColor: "text-emerald-400", href: "/operaciones/finanzas/bancos" },
    { label: "Valor Inventario", value: formatCurrency(inventoryValue), icon: Beef, trend: "Costo total en stock", trendColor: "text-emerald-400", href: "/inventario" },
    { label: "Ventas del Mes", value: formatCurrency(salesThisMonth), icon: TrendingUp, trend: "Ingreso Bruto", trendColor: "text-emerald-400", href: "/operaciones/ventas" },
    { label: "Cuentas por Cobrar", value: formatCurrency(receivables), icon: Users, trend: "Saldo a favor", trendColor: "text-emerald-400", href: "/operaciones/finanzas/cuentas-cobrar" },
    { label: "Cuentas por Pagar", value: formatCurrency(payables), icon: Users, trend: "Deudas", trendColor: "text-amber-400", href: "/operaciones/finanzas/cuentas-pagar" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Dashboard Gerencial</h1>
          <p className="text-zinc-400 text-sm mt-1">Resumen en tiempo real de operaciones y finanzas.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {metrics.map((metric, index) => (
          <Link key={metric.label} href={metric.href} className="block">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="bg-zinc-900/50 border border-zinc-800 p-5 rounded-xl hover:bg-zinc-800 transition-colors group cursor-pointer h-full"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-zinc-400 text-sm font-medium">{metric.label}</p>
                  <h3 className="text-xl font-bold text-zinc-100 mt-2">{metric.value}</h3>
                </div>
                <div className="p-2 bg-zinc-800 rounded-lg group-hover:bg-zinc-700 transition-colors">
                  <metric.icon className="w-5 h-5 text-emerald-400" />
                </div>
              </div>
              <p className={`text-xs mt-4 font-medium ${metric.trendColor}`}>
                {metric.trend}
              </p>
            </motion.div>
          </Link>
        ))}
      </div>

      {/* RENTABILIDAD */}
      <div className="mt-8">
        <h2 className="text-lg font-bold text-zinc-100 mb-4">Rentabilidad del Mes Actual</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="lg:col-span-2 bg-zinc-900/50 border border-zinc-800 rounded-xl p-6"
          >
            <div className="flex flex-col md:flex-row justify-between gap-6">
              <div className="flex-1 space-y-4">
                <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
                  <span className="text-zinc-400 font-medium">Ventas Brutas</span>
                  <span className="text-emerald-400 font-bold">{formatCurrency(salesThisMonth)}</span>
                </div>
                <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
                  <span className="text-zinc-400 font-medium flex items-center gap-2"><ArrowDownRight className="w-4 h-4 text-rose-500"/> Costo de Ventas (Carne)</span>
                  <span className="text-rose-400 font-bold">-{formatCurrency(costOfSalesThisMonth)}</span>
                </div>
                <div className="flex justify-between items-center border-b border-zinc-800 pb-3 bg-zinc-900/50 p-2 rounded-lg">
                  <span className="text-zinc-200 font-bold">Rentabilidad Bruta</span>
                  <span className="text-cyan-400 font-bold text-lg">{formatCurrency(grossProfit)}</span>
                </div>
                <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
                  <span className="text-zinc-400 font-medium flex items-center gap-2"><Receipt className="w-4 h-4 text-rose-500"/> Gastos Operativos</span>
                  <span className="text-rose-400 font-bold">-{formatCurrency(expensesThisMonth)}</span>
                </div>
                <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
                  <span className="text-zinc-400 font-medium flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-500"/> Pérdida por Mermas</span>
                  <span className="text-amber-400 font-bold">-{formatCurrency(mermasThisMonth)}</span>
                </div>
                <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
                  <span className="text-zinc-400 font-medium flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-500"/> Retenciones Sufridas</span>
                  <span className="text-amber-400 font-bold">-{formatCurrency(retentionsThisMonth)}</span>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className={`rounded-xl p-6 flex flex-col justify-center items-center text-center border relative overflow-hidden ${
              netProfit >= 0 
                ? "bg-emerald-950/20 border-emerald-900/50" 
                : "bg-rose-950/20 border-rose-900/50"
            }`}
          >
            <div className="absolute top-0 right-0 p-4 opacity-10">
              {netProfit >= 0 ? <ArrowUpRight className="w-24 h-24 text-emerald-500" /> : <ArrowDownRight className="w-24 h-24 text-rose-500" />}
            </div>
            <p className="text-zinc-400 font-medium mb-2 relative z-10">Rentabilidad Neta (Mes)</p>
            <h2 className={`text-4xl font-bold relative z-10 ${netProfit >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {formatCurrency(netProfit)}
            </h2>
            <p className="text-sm text-zinc-500 mt-4 max-w-[80%] relative z-10">
              Margen de ganancia exacto tras deducir costo de carne, gastos operativos y mermas de cámara.
            </p>
          </motion.div>

        </div>
      </div>
    </div>
  );
}

"use client";

import { motion } from "framer-motion";
import { Beef, CircleDollarSign, TrendingUp, Users } from "lucide-react";

export default function DashboardPage() {
  const metrics = [
    { label: "Lotes Activos", value: "12", icon: Beef, trend: "+2 desde ayer", trendColor: "text-emerald-400" },
    { label: "Valor Inventario", value: "₲ 450.000.000", icon: CircleDollarSign, trend: "+5% este mes", trendColor: "text-emerald-400" },
    { label: "Ventas del Mes", value: "₲ 120.500.000", icon: TrendingUp, trend: "+12% vs mes anterior", trendColor: "text-emerald-400" },
    { label: "Cuentas por Cobrar", value: "₲ 85.000.000", icon: Users, trend: "3 facturas vencidas", trendColor: "text-amber-400" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Dashboard Gerencial</h1>
          <p className="text-zinc-400 text-sm mt-1">Resumen de operaciones y finanzas.</p>
        </div>
        <button className="bg-zinc-900 border border-zinc-800 text-zinc-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-zinc-800 transition-colors">
          Exportar Reporte
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric, index) => (
          <motion.div
            key={metric.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
            className="bg-zinc-900/50 border border-zinc-800 p-5 rounded-xl hover:bg-zinc-900 transition-colors group"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-zinc-400 text-sm font-medium">{metric.label}</p>
                <h3 className="text-2xl font-bold text-zinc-100 mt-2">{metric.value}</h3>
              </div>
              <div className="p-2 bg-zinc-800 rounded-lg group-hover:bg-zinc-700 transition-colors">
                <metric.icon className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
            <p className={`text-xs mt-4 font-medium ${metric.trendColor}`}>
              {metric.trend}
            </p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="lg:col-span-2 bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 min-h-[400px]"
        >
          <h3 className="text-lg font-medium text-zinc-100 mb-6">Evolución de Compras vs Ventas</h3>
          <div className="w-full h-[300px] flex items-center justify-center border border-dashed border-zinc-800 rounded-lg">
            <span className="text-zinc-500 text-sm">Gráfico de líneas (Recharts se integrará aquí)</span>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
          className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 min-h-[400px]"
        >
          <h3 className="text-lg font-medium text-zinc-100 mb-6">Estado de Lotes</h3>
          <div className="w-full h-[300px] flex items-center justify-center border border-dashed border-zinc-800 rounded-lg">
            <span className="text-zinc-500 text-sm">Gráfico de torta (Recharts)</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

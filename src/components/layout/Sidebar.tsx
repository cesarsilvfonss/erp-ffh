"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { 
  LayoutDashboard, 
  Users, 
  Beef,
  CircleDollarSign,
  Settings,
  Store,
  Wallet,
  ArrowRightLeft,
  Factory
} from "lucide-react";
import { motion } from "framer-motion";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/" },
  { icon: Store, label: "Compras (Lotes)", href: "/operaciones/lotes" },
  { icon: Factory, label: "Faena", href: "/faena" },
  { icon: Beef, label: "Inventario", href: "/inventario" },
  { icon: CircleDollarSign, label: "Ventas", href: "/ventas" },
  { icon: ArrowRightLeft, label: "Finanzas", href: "/finanzas" },
  { icon: Wallet, label: "Cuentas por Cobrar/Pagar", href: "/cuentas" },
  { icon: Users, label: "Terceros", href: "/terceros" },
  { icon: Settings, label: "Configuración", href: "/configuracion" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="w-64 bg-zinc-950 border-r border-zinc-800 flex flex-col h-full shrink-0">
      <div className="p-6">
        <h2 className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
          FFH Asociados
        </h2>
        <p className="text-zinc-500 text-xs mt-1 font-medium tracking-wider uppercase">ERP System</p>
      </div>

      <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          
          return (
            <Link key={item.href} href={item.href} className="block relative">
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 bg-zinc-800/50 rounded-lg border border-zinc-700/50"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <div className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive ? "text-emerald-400" : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/50"
              }`}>
                <item.icon className="w-5 h-5" />
                {item.label}
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-zinc-800">
        <div className="bg-zinc-900/50 p-3 rounded-lg border border-zinc-800/50">
          <p className="text-xs text-zinc-400">Usuario Activo</p>
          <p className="text-sm text-zinc-200 font-medium truncate">Admin</p>
        </div>
      </div>
    </div>
  );
}

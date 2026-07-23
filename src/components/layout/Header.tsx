"use client";

import { Bell, Search, LogOut, Menu } from "lucide-react";
import { signOut } from "next-auth/react";
import { useMobileMenu } from "./MobileMenuContext";

export function Header() {
  const { toggle } = useMobileMenu();

  return (
    <header className="h-16 border-b border-zinc-800 bg-zinc-950/50 backdrop-blur-xl flex items-center justify-between px-4 md:px-6 sticky top-0 z-10">
      <div className="flex items-center gap-2 md:gap-4 flex-1">
        <button 
          onClick={toggle}
          className="p-2 -ml-2 text-zinc-400 hover:text-zinc-100 md:hidden transition-colors"
        >
          <Menu className="w-6 h-6" />
        </button>
        
        <div className="relative w-96 hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input 
            type="text"
            placeholder="Buscar lotes, clientes, facturas..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-full pl-10 pr-4 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button className="relative p-2 text-zinc-400 hover:text-zinc-100 transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full border border-zinc-950"></span>
        </button>
        
        <div className="h-8 w-px bg-zinc-800 mx-2"></div>
        
        <button 
          onClick={() => signOut()}
          className="flex items-center gap-2 text-sm text-zinc-400 hover:text-red-400 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Salir</span>
        </button>
      </div>
    </header>
  );
}

"use client";

import { useState } from "react";
import { Plus, Search, Edit2, Trash2 } from "lucide-react";
import { motion } from "framer-motion";

export default function ProveedoresPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const mockProveedores = [
    { id: "1", legalName: "Ganadera San Juan S.A.", contact: "Juan Pérez", phone: "0981 123 456", email: "contacto@sanjuan.com" },
    { id: "2", legalName: "Estancia El Ombú", contact: "María Gómez", phone: "0982 987 654", email: "ventas@elombu.com.py" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Proveedores</h1>
          <p className="text-zinc-400 text-sm mt-1">Gestión de proveedores de ganado y servicios.</p>
        </div>
        <button className="bg-emerald-500 hover:bg-emerald-600 text-zinc-950 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-lg shadow-emerald-500/20">
          <Plus className="w-4 h-4" />
          Nuevo Proveedor
        </button>
      </div>

      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-zinc-800 flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input 
              type="text"
              placeholder="Buscar por nombre, RUC o contacto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50 transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-950 text-zinc-400">
              <tr>
                <th className="px-6 py-3 font-medium">Razón Social</th>
                <th className="px-6 py-3 font-medium">Contacto</th>
                <th className="px-6 py-3 font-medium">Teléfono</th>
                <th className="px-6 py-3 font-medium">Email</th>
                <th className="px-6 py-3 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 text-zinc-300">
              {mockProveedores.map((prov, i) => (
                <motion.tr 
                  key={prov.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="hover:bg-zinc-800/50 transition-colors group"
                >
                  <td className="px-6 py-4 font-medium text-zinc-100">{prov.legalName}</td>
                  <td className="px-6 py-4">{prov.contact}</td>
                  <td className="px-6 py-4">{prov.phone}</td>
                  <td className="px-6 py-4">{prov.email}</td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button className="p-1.5 text-zinc-400 hover:text-cyan-400 rounded-md hover:bg-cyan-400/10 transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button className="p-1.5 text-zinc-400 hover:text-red-400 rounded-md hover:bg-red-400/10 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
          {mockProveedores.length === 0 && (
            <div className="p-8 text-center text-zinc-500">
              No se encontraron proveedores
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

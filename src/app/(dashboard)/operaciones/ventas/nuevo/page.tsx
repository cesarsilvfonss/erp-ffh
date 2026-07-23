import { prisma } from "@/lib/prisma";
import { NewSaleForm } from "./NewSaleForm";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function NewSalePage() {
  const clients = await prisma.client.findMany({
    orderBy: { legalName: "asc" },
  });

  const inventoryLots = await prisma.inventoryLot.findMany({
    where: { currentStock: { gt: 0 } },
    include: { item: true, batch: true },
    orderBy: { item: { name: "asc" } },
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <Link 
          href="/operaciones/ventas"
          className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Nueva Venta</h1>
          <p className="text-zinc-400 text-sm mt-1">Registra una nueva venta de carne descontando del stock.</p>
        </div>
      </div>

      <NewSaleForm clients={clients} inventoryLots={inventoryLots} />
    </div>
  );
}

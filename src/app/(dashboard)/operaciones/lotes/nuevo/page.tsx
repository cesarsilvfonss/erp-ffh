import { prisma } from "@/lib/prisma";
import { CreateBatchForm } from "./CreateBatchForm";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function NewBatchPage() {
  const providers = await prisma.provider.findMany({
    orderBy: { legalName: "asc" },
  });

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4">
        <Link 
          href="/operaciones/lotes"
          className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Apertura de Lote</h1>
          <p className="text-zinc-400 text-sm mt-1">Registra un nuevo lote de compra de ganado.</p>
        </div>
      </div>

      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
        <CreateBatchForm providers={providers} />
      </div>
    </div>
  );
}

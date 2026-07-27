import { prisma } from "@/lib/prisma";
import { CreateLoanForm } from "@/components/finance/CreateLoanForm";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PrestamosPage() {
  const providers = await prisma.provider.findMany({
    orderBy: { legalName: "asc" }
  });

  const bankAccounts = await prisma.bankAccount.findMany({
    include: { currency: true },
    orderBy: { bankName: "asc" }
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <Link 
          href="/operaciones/finanzas"
          className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Registrar Préstamo Adquirido</h1>
          <p className="text-zinc-400 text-sm mt-1">Registra un ingreso de capital y genera las cuotas por pagar.</p>
        </div>
      </div>

      <CreateLoanForm providers={providers} bankAccounts={bankAccounts} />
    </div>
  );
}

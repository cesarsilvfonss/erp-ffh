import { prisma } from "@/lib/prisma";
import { Building2 } from "lucide-react";
import { BankList } from "./BankList";
import { BankForm } from "./BankForm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function BancosPage() {
  const session = await getServerSession(authOptions);
  
  if (!session || session.user.role === "WEIGHER") {
    redirect("/");
  }

  // Obtener todos los bancos con todas sus transacciones para el saldo real
  const allBanks = await prisma.bankAccount.findMany({
    include: {
      currency: true,
      transactions: {
        orderBy: { date: "desc" },
        include: { user: true }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  // Mapear inyectando el saldo real y limitando las transacciones a 10 para la UI
  const banksWithBalance = allBanks.map(bank => {
    const realBalance = bank.transactions.reduce((acc, tx) => {
      return tx.type === 'INCOME' ? acc + tx.amount : acc - tx.amount;
    }, bank.initialBalance);

    return {
      ...bank,
      currentBalance: realBalance,
      transactions: bank.transactions.slice(0, 10) // Solo pasamos las últimas 10
    };
  });

  const currencies = await prisma.currency.findMany();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-emerald-500" />
            Cuentas Bancarias
          </h1>
          <p className="text-zinc-400 text-sm mt-1">Gestión de bancos y movimientos.</p>
        </div>
        
        <BankForm currencies={currencies} />
      </div>

      <BankList initialBanks={banksWithBalance} userRole={session.user.role} />
    </div>
  );
}

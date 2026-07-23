import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Wallet, Search, CheckCircle2, Clock } from "lucide-react";
import { ReceivablesList } from "./ReceivablesList";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ReceivablesPage() {
  const session = await getServerSession(authOptions);
  
  // Protect route
  if (!session || session.user.role === "WEIGHER") {
    redirect("/");
  }

  const receivables = await prisma.accountReceivable.findMany({
    include: {
      client: true,
      sale: true,
      payments: {
        include: {
          bankAccount: true
        }
      }
    },
    orderBy: { dueDate: "asc" }
  });

  const banks = await prisma.bankAccount.findMany({
    include: { currency: true },
    where: { status: true }
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
            <Wallet className="w-6 h-6 text-emerald-500" />
            Cuentas por Cobrar
          </h1>
          <p className="text-zinc-400 text-sm mt-1">Gestión de saldos de clientes y registro de pagos.</p>
        </div>
      </div>

      <ReceivablesList initialReceivables={receivables} banks={banks} />
    </div>
  );
}

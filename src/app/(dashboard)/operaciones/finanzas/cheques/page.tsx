import { prisma } from "@/lib/prisma";
import { FileText } from "lucide-react";
import { CheckList } from "./CheckList";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ChecksPage() {
  const session = await getServerSession(authOptions);
  
  if (!session || session.user.role === "WEIGHER") {
    redirect("/");
  }

  const checks = await prisma.check.findMany({
    include: {
      payment: {
        include: {
          accountReceivable: {
            include: {
              client: true
            }
          }
        }
      },
      depositBank: true
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
            <FileText className="w-6 h-6 text-emerald-500" />
            Cartera de Cheques
          </h1>
          <p className="text-zinc-400 text-sm mt-1">Gestión de cheques diferidos recibidos y depósitos.</p>
        </div>
      </div>

      <CheckList initialChecks={checks} banks={banks} />
    </div>
  );
}

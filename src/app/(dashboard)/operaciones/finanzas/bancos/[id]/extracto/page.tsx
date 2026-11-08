import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ExtractoClient } from "./ExtractoClient";
import { todayPY, startOfDayPY, endOfDayPY } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function BankExtractPage({ 
  params,
  searchParams 
}: { 
  params: Promise<{ id: string }>,
  searchParams: Promise<{ from?: string, to?: string }> 
}) {
  const session = await getServerSession(authOptions);
  
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "ADMINISTRATION")) {
    redirect("/");
  }

  const { id } = await params;
  const resolvedSearchParams = await searchParams;

  const bank = await prisma.bankAccount.findUnique({
    where: { id },
    include: { currency: true }
  });

  if (!bank) return notFound();

  // Rango de fechas (hora Asunción). Por defecto: del 1° del mes actual a hoy.
  const isYmd = (v?: string) => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);
  const today = todayPY();
  let from = isYmd(resolvedSearchParams.from) ? resolvedSearchParams.from! : `${today.slice(0, 8)}01`;
  let to = isYmd(resolvedSearchParams.to) ? resolvedSearchParams.to! : today;
  if (from > to) [from, to] = [to, from];

  const startDate = startOfDayPY(from);
  const endDate = endOfDayPY(to);

  // Obtener todas las transacciones anteriores a startDate para calcular saldo anterior
  const previousTransactions = await prisma.transaction.findMany({
    where: {
      bankAccountId: bank.id,
      date: { lt: startDate }
    }
  });

  let previousBalance = bank.initialBalance;
  for (const tx of previousTransactions) {
    if (tx.type === "INCOME") previousBalance += tx.amount;
    else previousBalance -= tx.amount;
  }

  // Obtener las transacciones del periodo seleccionado
  const periodTransactions = await prisma.transaction.findMany({
    where: {
      bankAccountId: bank.id,
      date: {
        gte: startDate,
        lte: endDate
      }
    },
    include: {
      payablePayments: {
        include: {
          accountPayable: {
            include: { provider: true }
          }
        }
      }
    },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }] // Importante para calcular el running balance
  });

  // Calcular el Running Balance fila por fila
  let runningBalance = previousBalance;
  const extractoRows = periodTransactions.map(tx => {
    if (tx.type === "INCOME") runningBalance += tx.amount;
    else runningBalance -= tx.amount;
    
    return {
      ...tx,
      runningBalance
    };
  });

  // Saldo total actual (histórico completo, independientemente del filtro) para mostrar arriba
  const allTxCount = await prisma.transaction.findMany({
    where: { bankAccountId: bank.id }
  });
  let currentBalance = bank.initialBalance;
  for (const tx of allTxCount) {
    if (tx.type === "INCOME") currentBalance += tx.amount;
    else currentBalance -= tx.amount;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <ExtractoClient 
        bank={bank} 
        rows={extractoRows} 
        previousBalance={previousBalance}
        currentBalance={currentBalance}
        from={from}
        to={to}
      />
    </div>
  );
}

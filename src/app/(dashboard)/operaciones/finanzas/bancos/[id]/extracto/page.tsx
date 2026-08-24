import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ExtractoClient } from "./ExtractoClient";

export const dynamic = "force-dynamic";

export default async function ExtractoBancarioPage({ 
  params, 
  searchParams 
}: { 
  params: Promise<{ id: string }>,
  searchParams: { month?: string, year?: string } 
}) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  
  if (!session || session.user.role === "WEIGHER") {
    redirect("/");
  }

  const bank = await prisma.bankAccount.findUnique({
    where: { id },
    include: { currency: true }
  });

  if (!bank) return notFound();

  const now = new Date();
  const month = searchParams.month ? parseInt(searchParams.month) : now.getMonth();
  const year = searchParams.year ? parseInt(searchParams.year) : now.getFullYear();

  // Fecha inicio y fin del mes seleccionado
  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);

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
    orderBy: { date: "asc" } // Importante para calcular el running balance
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
        selectedMonth={month}
        selectedYear={year}
      />
    </div>
  );
}

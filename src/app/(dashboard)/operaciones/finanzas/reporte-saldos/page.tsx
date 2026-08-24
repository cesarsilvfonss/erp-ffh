import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { BalancesReportClient } from "./BalancesReportClient";

export const dynamic = "force-dynamic";

export default async function BalancesReportPage() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect("/login");
  }

  // Verificar permisos (ADMIN o ADMINISTRATION)
  if (session.user.role !== "ADMIN" && session.user.role !== "ADMINISTRATION") {
    redirect("/");
  }

  // 1. Consultar Cuentas por Cobrar pendientes o parciales
  const receivables = await prisma.accountReceivable.findMany({
    where: {
      status: { in: ["PENDING", "PARTIAL"] }
    },
    include: {
      client: true,
      sale: true,
    },
    orderBy: {
      dueDate: "asc" // Ordenadas por vencimiento globalmente primero
    }
  });

  // 2. Agrupar por Cliente
  // Utilizaremos un Map para asegurar la consistencia o simplemente un objeto
  const groupedData: Record<string, {
    client: any;
    receivables: any[];
    totalAmount: number;
    totalPaid: number;
    totalPending: number;
  }> = {};

  for (const r of receivables) {
    const clientId = r.clientId;
    if (!groupedData[clientId]) {
      groupedData[clientId] = {
        client: r.client,
        receivables: [],
        totalAmount: 0,
        totalPaid: 0,
        totalPending: 0
      };
    }

    groupedData[clientId].receivables.push(r);
    groupedData[clientId].totalAmount += r.amount;
    groupedData[clientId].totalPaid += r.paidAmount;
    groupedData[clientId].totalPending += (r.amount - r.paidAmount);
  }

  // 3. Ordenar clientes alfabéticamente por nombre
  const sortedClients = Object.values(groupedData).sort((a, b) => 
    (a.client.legalName || "").localeCompare(b.client.legalName || "")
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <BalancesReportClient data={sortedClients} />
    </div>
  );
}

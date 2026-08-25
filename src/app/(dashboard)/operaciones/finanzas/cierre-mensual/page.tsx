import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { CapitalAnalysisClient } from "./CapitalAnalysisClient";
import { getLiveCapital } from "@/actions/closure";

export const dynamic = "force-dynamic";

export default async function MonthlyClosurePage({
  searchParams
}: {
  searchParams: { month?: string, year?: string }
}) {
  const session = await getServerSession(authOptions);
  
  if (!session || session.user.role === "WEIGHER") {
    redirect("/");
  }

  const now = new Date();
  const month = searchParams.month ? parseInt(searchParams.month) : now.getMonth();
  const year = searchParams.year ? parseInt(searchParams.year) : now.getFullYear();

  // Buscar si existe un cierre (DRAFT o CLOSED)
  const closure = await prisma.monthlyClosure.findUnique({
    where: { year_month: { year, month } }
  });

  let currentData;
  if (closure) {
    currentData = closure;
  } else {
    // Si no existe ni borrador, traemos en vivo el estado actual
    const live = await getLiveCapital();
    currentData = {
      status: "OPEN",
      ...live
    };
  }

  // Buscar el cierre del mes INMEDIATAMENTE ANTERIOR para comparar
  let prevMonth = month - 1;
  let prevYear = year;
  if (prevMonth < 0) {
    prevMonth = 11;
    prevYear--;
  }

  const prevClosure = await prisma.monthlyClosure.findUnique({
    where: { year_month: { year: prevYear, month: prevMonth } }
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <CapitalAnalysisClient 
        data={currentData} 
        prevData={prevClosure}
        selectedMonth={month}
        selectedYear={year}
        userRole={session.user.role}
        userId={session.user.id}
      />
    </div>
  );
}

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { CapitalAnalysisClient } from "./CapitalAnalysisClient";
import { getLiveCapital } from "@/actions/closure";
import { getOpenPeriod } from "@/lib/closure";
import { todayPY } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function PeriodClosurePage({ 
  searchParams 
}: { 
  searchParams: Promise<{ id?: string }> 
}) {
  const session = await getServerSession(authOptions);
  
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "ADMINISTRATION")) {
    redirect("/");
  }

  const { id } = await searchParams;

  const closures = await prisma.monthlyClosure.findMany({
    where: { status: "CLOSED" },
    orderBy: { periodEnd: "desc" },
    include: { closedBy: { select: { name: true } } }
  });

  const openPeriod = await getOpenPeriod();
  const selected = id ? closures.find(c => c.id === id) || null : null;

  let data: any;
  if (selected) {
    data = {
      ...selected,
      status: "CLOSED",
      periodStart: selected.periodStart.toISOString(),
      periodEnd: selected.periodEnd.toISOString(),
      closedAt: selected.closedAt?.toISOString() || null,
      closedByName: selected.closedBy?.name || null,
    };
  } else {
    const live = await getLiveCapital();
    data = {
      status: "OPEN",
      ...live,
      periodStart: openPeriod.start.toISOString(),
      previousCapital: openPeriod.previousCapital,
    };
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <CapitalAnalysisClient 
        data={data}
        closures={closures.map(c => ({
          id: c.id,
          closingDate: c.closingDate,
          periodStart: c.periodStart.toISOString(),
          totalCapital: c.totalCapital,
        }))}
        isLatestClosure={!!selected && closures[0]?.id === selected.id}
        today={todayPY()}
        userRole={session.user.role}
      />
    </div>
  );
}

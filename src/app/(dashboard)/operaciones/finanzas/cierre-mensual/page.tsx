import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { CapitalAnalysisClient } from "./CapitalAnalysisClient";
import { getLiveCapital } from "@/actions/closure";
import { getOpenPeriod } from "@/lib/closure";
import { todayPY } from "@/lib/dates";
import { computeDistribution } from "@/lib/shareholders";
import { loadDistributionInputs } from "@/lib/distribution";

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
    const [live, inputs] = await Promise.all([getLiveCapital(), loadDistributionInputs()]);
    const dist = computeDistribution(inputs.shareholders, inputs.participants, live.totalCapital - openPeriod.previousCapital);
    data = {
      status: "OPEN",
      ...live,
      periodStart: openPeriod.start.toISOString(),
      previousCapital: openPeriod.previousCapital,
      grossIncome: dist.grossIncome,
      participantEstimates: dist.participants.map(p => ({
        name: p.name,
        profitShare: p.profitShare,
        amount: p.amount,
        salary: p.salary,
        retained: p.retained,
      })),
      participantsTotal: dist.participantsTotal,
      totalSalary: dist.totalSalary,
    };
  }

  const banks = await prisma.bankAccount.findMany({ where: { status: true }, orderBy: { bankName: "asc" } });

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
        banks={banks.map(b => ({ id: b.id, label: `${b.bankName} - ${b.accountName} (${b.accountNumber})` }))}
      />
    </div>
  );
}

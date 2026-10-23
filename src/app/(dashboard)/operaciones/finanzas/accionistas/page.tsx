import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getLiveCapital } from "@/actions/closure";
import { getOpenPeriod } from "@/lib/closure";
import { todayPY } from "@/lib/dates";
import { computeDistribution, capitalMismatch } from "@/lib/shareholders";
import { loadDistributionInputs } from "@/lib/distribution";
import { ShareholdersClient } from "./ShareholdersClient";

export const dynamic = "force-dynamic";

export default async function ShareholdersPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    redirect("/");
  }

  const [people, inputs, openPeriod, live, closures, movements, banks] = await Promise.all([
    prisma.shareholder.findMany({ orderBy: [{ isActive: "desc" }, { createdAt: "asc" }] }),
    loadDistributionInputs(),
    getOpenPeriod(),
    getLiveCapital(),
    prisma.monthlyClosure.findMany({
      where: { status: "CLOSED" },
      orderBy: { periodEnd: "desc" },
      include: { shareholderHistory: { include: { shareholder: { select: { name: true, type: true } } } } },
    }),
    prisma.retentionMovement.findMany({ orderBy: [{ date: "desc" }, { createdAt: "desc" }] }),
    prisma.bankAccount.findMany({ where: { status: true }, orderBy: { bankName: "asc" } }),
  ]);

  // Capital inicial del período = capital del último cierre (o capital inicial del sistema).
  const periodInitialCapital = openPeriod.previousCapital;
  // Utilidad BRUTA del período en tiempo real = capital actual - capital inicial del período.
  const grossIncome = live.totalCapital - periodInitialCapital;

  const distribution = computeDistribution(inputs.shareholders, inputs.participants, grossIncome);
  const capitalCheck = capitalMismatch(distribution.totalInitialCapital, periodInitialCapital);

  // Estado del salario del último cierre (para la tarjeta del participante)
  const lastPayableIds = (closures[0]?.shareholderHistory || []).map(h => h.payableId).filter((x): x is string => !!x);
  const lastPayables = lastPayableIds.length
    ? await prisma.accountPayable.findMany({ where: { id: { in: lastPayableIds } } })
    : [];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <ShareholdersClient
        people={people.map(s => ({
          id: s.id,
          type: s.type === "PARTICIPANT" ? "PARTICIPANT" : "SHAREHOLDER",
          name: s.name,
          document: s.document,
          phone: s.phone,
          email: s.email,
          notes: s.notes,
          initialCapital: s.initialCapital,
          fixedProfitShare: s.fixedProfitShare,
          capitalizationRate: s.capitalizationRate,
          isActive: s.isActive,
          retentionBalance: inputs.balances.get(s.id) || 0,
        }))}
        periodStart={openPeriod.start.toISOString()}
        today={todayPY()}
        periodInitialCapital={periodInitialCapital}
        currentCapital={live.totalCapital}
        distribution={distribution}
        capitalCheck={capitalCheck}
        banks={banks.map(b => ({ id: b.id, label: `${b.bankName} - ${b.accountName} (${b.accountNumber})` }))}
        movements={movements.map(m => ({
          id: m.id,
          shareholderId: m.shareholderId,
          date: m.date.toISOString(),
          type: m.type,
          amount: m.amount,
          concept: m.concept,
        }))}
        lastSalaries={(closures[0]?.shareholderHistory || [])
          .filter(h => h.payableId)
          .map(h => {
            const p = lastPayables.find(x => x.id === h.payableId);
            return {
              shareholderId: h.shareholderId,
              closingDate: closures[0].closingDate,
              amount: h.withdrawalAmount,
              paid: p ? p.paidAmount : 0,
              status: p?.status || "PENDING",
            };
          })}
        history={closures.map(c => ({
          id: c.id,
          periodStart: c.periodStart.toISOString(),
          closingDate: c.closingDate,
          previousCapital: c.previousCapital,
          grossIncome: c.netIncome,
          participantShare: c.participantShare,
          participantSalary: c.participantSalary,
          totalCapital: c.totalCapital,
          rows: c.shareholderHistory
            .sort((a, b) => (a.shareholder.type === b.shareholder.type ? b.initialCapital - a.initialCapital : a.shareholder.type === "PARTICIPANT" ? 1 : -1))
            .map(h => ({
              name: h.shareholder.name,
              isParticipant: h.shareholder.type === "PARTICIPANT",
              initialCapital: h.initialCapital,
              participation: h.participation,
              profitShare: h.profitShare,
              profitAmount: h.profitAmount,
              capitalizedAmount: h.capitalizedAmount,
              withdrawalAmount: h.withdrawalAmount,
              finalCapital: h.finalCapital,
            })),
        }))}
      />
    </div>
  );
}

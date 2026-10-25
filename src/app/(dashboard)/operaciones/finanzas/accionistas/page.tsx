import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getLiveCapital } from "@/actions/closure";
import { getOpenPeriod } from "@/lib/closure";
import { todayPY, diffDaysYmd, toYmdPY, startOfDayPY } from "@/lib/dates";
import { computeDistribution, capitalMismatch, type DistributionResult } from "@/lib/shareholders";
import { loadDistributionInputs } from "@/lib/distribution";
import { ShareholdersClient } from "./ShareholdersClient";

export const dynamic = "force-dynamic";

/** Duración del período en días calendario, contando el día de inicio y el de fin. */
function periodDays(startYmd: string, endYmd: string) {
  return Math.max(1, diffDaysYmd(startYmd, endYmd) + 1);
}

export default async function ShareholdersPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    redirect("/");
  }

  const { id } = await searchParams;

  const [people, closures, banks] = await Promise.all([
    prisma.shareholder.findMany({ orderBy: [{ isActive: "desc" }, { createdAt: "asc" }] }),
    prisma.monthlyClosure.findMany({
      where: { status: "CLOSED" },
      orderBy: { periodEnd: "desc" },
      include: { shareholderHistory: { include: { shareholder: { select: { name: true, type: true } } } } },
    }),
    prisma.bankAccount.findMany({ where: { status: true }, orderBy: { bankName: "asc" } }),
  ]);

  const selected = id ? closures.find(c => c.id === id) || null : null;
  const peopleById = new Map(people.map(p => [p.id, p]));

  let mode: "LIVE" | "CLOSED";
  let periodStartIso: string;
  let periodEndYmd: string;
  let periodInitialCapital: number;
  let currentCapital: number;
  let distribution: DistributionResult;
  let movementsUntil: Date | null = null;
  let salaryClosure: (typeof closures)[number] | undefined;
  let retentionBalances = new Map<string, number>();

  if (selected) {
    // ===== Período cerrado: se reconstruye desde el historial guardado al cerrar =====
    mode = "CLOSED";
    periodStartIso = selected.periodStart.toISOString();
    periodEndYmd = selected.closingDate;
    periodInitialCapital = selected.previousCapital;
    currentCapital = selected.totalCapital + selected.participantShare; // capital antes de liquidar participantes
    movementsUntil = selected.periodEnd;
    salaryClosure = selected;

    const sh = selected.shareholderHistory.filter(h => h.shareholder.type !== "PARTICIPANT").sort((a, b) => b.initialCapital - a.initialCapital);
    const pa = selected.shareholderHistory.filter(h => h.shareholder.type === "PARTICIPANT");

    const participants = pa.map(h => {
      const cfg = peopleById.get(h.shareholderId);
      const retentionRate = h.profitAmount > 0 ? (h.capitalizedAmount / h.profitAmount) * 100 : cfg?.capitalizationRate ?? 0;
      return {
        id: h.shareholderId,
        name: h.shareholder.name,
        profitShare: h.profitAmount > 0 ? h.profitShare : cfg?.fixedProfitShare ?? 0,
        retentionRate,
        amount: h.profitAmount,
        retained: h.capitalizedAmount,
        salary: h.withdrawalAmount,
        retentionBefore: h.initialCapital,
        retentionAfter: h.finalCapital,
      };
    });
    const shareholders = sh.map(h => ({
      id: h.shareholderId,
      name: h.shareholder.name,
      initialCapital: h.initialCapital,
      participation: h.participation,
      profitShare: h.profitShare,
      profitAmount: h.profitAmount,
      finalCapital: h.finalCapital,
    }));
    const totalInitialCapital = shareholders.reduce((a, s) => a + s.initialCapital, 0);
    const shareholdersIncome = shareholders.reduce((a, s) => a + s.profitAmount, 0);
    const participantsPercent = participants.reduce((a, p) => a + (p.amount > 0 ? p.profitShare : 0), 0);

    distribution = {
      grossIncome: selected.netIncome,
      participantsPercent,
      participantsTotal: selected.participantShare,
      totalSalary: selected.participantSalary,
      totalRetained: participants.reduce((a, p) => a + p.retained, 0),
      shareholdersPercent: 100 - participantsPercent,
      shareholdersIncome,
      totalInitialCapital,
      totalFinalCapital: totalInitialCapital + shareholdersIncome,
      participants,
      shareholders,
      errors: selected.shareholderHistory.length === 0 ? ["Este cierre fue realizado antes de registrar accionistas: no tiene distribución guardada."] : [],
    };
    participants.forEach(p => retentionBalances.set(p.id, p.retentionAfter));
  } else {
    // ===== Período abierto: cálculo en vivo =====
    mode = "LIVE";
    const [inputs, openPeriod, live] = await Promise.all([loadDistributionInputs(), getOpenPeriod(), getLiveCapital()]);
    periodStartIso = openPeriod.start.toISOString();
    periodEndYmd = todayPY();
    periodInitialCapital = openPeriod.previousCapital;
    currentCapital = live.totalCapital;
    distribution = computeDistribution(inputs.shareholders, inputs.participants, live.totalCapital - periodInitialCapital);
    salaryClosure = closures[0];
    retentionBalances = inputs.balances;
  }

  const days = periodDays(toYmdPY(periodStartIso), periodEndYmd);
  const capitalCheck = capitalMismatch(distribution.totalInitialCapital, periodInitialCapital);

  const movements = await prisma.retentionMovement.findMany({
    where: movementsUntil ? { date: { lte: movementsUntil } } : {},
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });

  const salaryPayableIds = (salaryClosure?.shareholderHistory || []).map(h => h.payableId).filter((x): x is string => !!x);
  const salaryPayables = salaryPayableIds.length ? await prisma.accountPayable.findMany({ where: { id: { in: salaryPayableIds } } }) : [];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <ShareholdersClient
        mode={mode}
        selectedClosureId={selected?.id || null}
        closureOptions={closures.map(c => ({ id: c.id, periodStart: c.periodStart.toISOString(), closingDate: c.closingDate }))}
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
          retentionBalance: retentionBalances.get(s.id) || 0,
        }))}
        periodStart={periodStartIso}
        periodEnd={startOfDayPY(periodEndYmd).toISOString()}
        periodDays={days}
        today={todayPY()}
        periodInitialCapital={periodInitialCapital}
        currentCapital={currentCapital}
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
        lastSalaries={(salaryClosure?.shareholderHistory || [])
          .filter(h => h.payableId)
          .map(h => {
            const p = salaryPayables.find(x => x.id === h.payableId);
            return {
              shareholderId: h.shareholderId,
              closingDate: salaryClosure!.closingDate,
              amount: h.withdrawalAmount,
              paid: p ? p.paidAmount : 0,
              status: p?.status || "PENDING",
            };
          })}
        history={closures.map(c => ({
          id: c.id,
          periodStart: c.periodStart.toISOString(),
          closingDate: c.closingDate,
          periodDays: periodDays(toYmdPY(c.periodStart), c.closingDate),
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

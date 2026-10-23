import { prisma } from "./prisma";
import type { ShareholderInput, ParticipantInput } from "./shareholders";

/** Saldo de retención por participante (deuda de la empresa con cada uno). */
export async function getRetentionBalances() {
  const grouped = await prisma.retentionMovement.groupBy({
    by: ["shareholderId"],
    _sum: { amount: true },
  });
  const map = new Map<string, number>();
  grouped.forEach(g => map.set(g.shareholderId, g._sum.amount || 0));
  return map;
}

/** Saldo total de retenciones de participantes (se resta en el Análisis sobre Capital). */
export async function getTotalRetentionBalance() {
  const agg = await prisma.retentionMovement.aggregate({ _sum: { amount: true } });
  return agg._sum.amount || 0;
}

/** Accionistas y participantes activos, listos para `computeDistribution`. */
export async function loadDistributionInputs() {
  const [people, balances] = await Promise.all([
    prisma.shareholder.findMany({ where: { isActive: true }, orderBy: { createdAt: "asc" } }),
    getRetentionBalances(),
  ]);

  const shareholders: (ShareholderInput & { raw: (typeof people)[number] })[] = people
    .filter(p => p.type !== "PARTICIPANT")
    .map(p => ({ id: p.id, name: p.name, initialCapital: p.initialCapital, raw: p }));

  const participants: (ParticipantInput & { raw: (typeof people)[number] })[] = people
    .filter(p => p.type === "PARTICIPANT")
    .map(p => ({
      id: p.id,
      name: p.name,
      profitShare: p.fixedProfitShare || 0,
      retentionRate: p.capitalizationRate,
      retentionBalance: balances.get(p.id) || 0,
      raw: p,
    }));

  return { shareholders, participants, balances };
}

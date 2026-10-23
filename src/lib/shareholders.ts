/**
 * Distribución de la utilidad del período.
 *
 * Reglas de la sociedad:
 *  - ACCIONISTAS (ej. CSDF, MH): tienen capital. La suma de sus capitales iniciales debe
 *    coincidir con el capital del último cierre (control estricto).
 *  - PARTICIPANTES (ej. YL): NO son accionistas. Reciben un % fijo de la utilidad BRUTA
 *    del período (ej. 33,33%), solo si hay utilidad:
 *      · `retentionRate` % (ej. 10%) se RETIENE: es una deuda de la empresa con el
 *        participante (no es capital) y se resta en el Análisis sobre Capital.
 *      · El resto (ej. 90%) es SALARIO: gasto con fecha del día de cierre.
 *  - El resto de la utilidad (ej. 66,67%) se reparte entre los accionistas proporcionalmente
 *    a su capital y se capitaliza 100%.
 *  - Si hay pérdida, los participantes no cobran y los accionistas absorben el 100%.
 *
 * Montos redondeados a guaraníes; el último accionista absorbe el redondeo para que
 * las sumas cierren exactas con la utilidad.
 */

/** Tolerancia (Gs.) para considerar que dos capitales coinciden. */
export const CAPITAL_TOLERANCE = 1;

export type ShareholderInput = {
  id: string;
  name: string;
  initialCapital: number;
};

export type ParticipantInput = {
  id: string;
  name: string;
  profitShare: number; // % sobre la utilidad bruta
  retentionRate: number; // % de su parte que se retiene
  retentionBalance: number; // saldo actual de su retención
};

export type ParticipantRow = {
  id: string;
  name: string;
  profitShare: number;
  retentionRate: number;
  amount: number; // parte total
  retained: number; // a retención
  salary: number; // salario (gasto)
  retentionBefore: number;
  retentionAfter: number;
};

export type ShareholderRow = {
  id: string;
  name: string;
  initialCapital: number;
  participation: number; // % del capital de accionistas
  profitShare: number; // % de la utilidad bruta
  profitAmount: number;
  finalCapital: number;
};

export type DistributionResult = {
  grossIncome: number; // utilidad bruta del período
  participantsPercent: number;
  participantsTotal: number;
  totalSalary: number;
  totalRetained: number;
  shareholdersPercent: number;
  shareholdersIncome: number; // utilidad para accionistas
  totalInitialCapital: number;
  totalFinalCapital: number;
  participants: ParticipantRow[];
  shareholders: ShareholderRow[];
  errors: string[];
};

export function computeDistribution(
  shareholders: ShareholderInput[],
  participants: ParticipantInput[],
  grossIncome: number,
): DistributionResult {
  const errors: string[] = [];
  const U = Math.round(grossIncome);
  const hasProfit = U > 0;

  const participantsPercent = participants.reduce((a, p) => a + p.profitShare, 0);
  const totalInitialCapital = shareholders.reduce((a, s) => a + s.initialCapital, 0);

  if (shareholders.length === 0) errors.push("No hay accionistas activos registrados.");
  if (participantsPercent > 100 + 1e-9) errors.push(`La suma de % de participantes (${participantsPercent.toFixed(4)}%) supera el 100%.`);
  if (shareholders.length > 0 && totalInitialCapital <= 0) errors.push("Los accionistas no tienen capital cargado.");

  // 1. Participantes (solo si hay utilidad)
  const participantRows: ParticipantRow[] = participants.map(p => {
    const rate = Math.min(Math.max(p.retentionRate, 0), 100);
    const amount = hasProfit ? Math.round((U * p.profitShare) / 100) : 0;
    const retained = Math.round((amount * rate) / 100);
    const salary = amount - retained;
    return {
      id: p.id,
      name: p.name,
      profitShare: p.profitShare,
      retentionRate: rate,
      amount,
      retained,
      salary,
      retentionBefore: p.retentionBalance,
      retentionAfter: p.retentionBalance + retained,
    };
  });
  const participantsTotal = participantRows.reduce((a, r) => a + r.amount, 0);

  // 2. Accionistas: el resto, proporcional al capital
  const shareholdersIncome = U - participantsTotal;
  let assigned = 0;
  const shareholderRows: ShareholderRow[] = shareholders.map((s, i) => {
    const ratio = totalInitialCapital > 0 ? s.initialCapital / totalInitialCapital : 0;
    const isLast = i === shareholders.length - 1;
    const profitAmount = isLast ? shareholdersIncome - assigned : Math.round(shareholdersIncome * ratio);
    assigned += profitAmount;
    return {
      id: s.id,
      name: s.name,
      initialCapital: s.initialCapital,
      participation: ratio * 100,
      profitShare: U !== 0 ? (profitAmount / U) * 100 : 0,
      profitAmount,
      finalCapital: s.initialCapital + profitAmount,
    };
  });

  return {
    grossIncome: U,
    participantsPercent: hasProfit ? participantsPercent : 0,
    participantsTotal,
    totalSalary: participantRows.reduce((a, r) => a + r.salary, 0),
    totalRetained: participantRows.reduce((a, r) => a + r.retained, 0),
    shareholdersPercent: hasProfit ? 100 - participantsPercent : 100,
    shareholdersIncome,
    totalInitialCapital,
    totalFinalCapital: totalInitialCapital + shareholdersIncome,
    participants: participantRows,
    shareholders: shareholderRows,
    errors,
  };
}

/** Valida que la suma de capitales iniciales coincida con el capital del último cierre. */
export function capitalMismatch(totalInitialCapital: number, periodInitialCapital: number) {
  const difference = periodInitialCapital - totalInitialCapital;
  return { difference, isBalanced: Math.abs(difference) < CAPITAL_TOLERANCE };
}

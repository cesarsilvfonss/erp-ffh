import { prisma } from "./prisma";
import {
  formatDatePY,
  startOfDayPY,
  toYmdPY,
  addDaysYmd,
  INITIAL_PERIOD_START_YMD,
  INITIAL_CAPITAL,
} from "./dates";

/** Último cierre vigente (status CLOSED), o null si nunca se cerró. */
export async function getLastClosure() {
  return prisma.monthlyClosure.findFirst({
    where: { status: "CLOSED" },
    orderBy: { periodEnd: "desc" },
  });
}

/**
 * Período abierto actual: comienza a las 00:00:00.000 (Asunción) del día
 * siguiente al último cierre, o en la fecha inicial del sistema.
 */
export async function getOpenPeriod() {
  const last = await getLastClosure();
  const startYmd = last ? addDaysYmd(last.closingDate, 1) : INITIAL_PERIOD_START_YMD;
  return {
    lastClosure: last,
    startYmd,
    start: startOfDayPY(startYmd),
    previousCapital: last ? last.totalCapital : INITIAL_CAPITAL,
  };
}

/**
 * Lanza error si la fecha cae dentro de un período ya cerrado
 * (es decir, <= 23:59:59.999 hora Asunción del último día cerrado).
 */
export async function checkPeriodClosure(date: Date | string) {
  const d = new Date(date);
  if (isNaN(d.getTime())) return;

  const last = await getLastClosure();
  if (last && d.getTime() <= last.periodEnd.getTime()) {
    throw new Error(
      `El período cerrado hasta el ${formatDatePY(last.periodEnd)} 23:59:59 no admite modificaciones ` +
      `(fecha de la operación: ${formatDatePY(d)}). Las operaciones deben tener fecha a partir del ` +
      `${formatDatePY(startOfDayPY(addDaysYmd(last.closingDate, 1)))}.`
    );
  }
}

/** Valida que una fecha elegida por el usuario no sea posterior a hoy (Asunción). */
export function assertNotFutureDate(date: Date | string) {
  const ymd = toYmdPY(date);
  const today = toYmdPY(new Date());
  if (ymd > today) {
    throw new Error(`La fecha ${formatDatePY(date)} es posterior a la fecha de hoy (${formatDatePY(new Date())}).`);
  }
}

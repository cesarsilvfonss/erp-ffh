/**
 * Utilidades de fecha centralizadas del sistema.
 *
 * TODO el sistema trabaja en horario de ASUNCIÓN, PARAGUAY.
 * Desde octubre de 2024 Paraguay adoptó el horario UTC-3 de forma PERMANENTE
 * (sin cambio de horario de verano/invierno). Muchas bases de datos de zonas
 * horarias (ICU / tzdata antiguas, incluida la de Node 22) todavía aplican la
 * regla vieja de "America/Asuncion" (UTC-4 en invierno), por eso usamos un
 * desfase FIJO de -03:00 ("Etc/GMT+3") en lugar de "America/Asuncion".
 *
 * Convenciones:
 *  - Fechas elegidas por el usuario (input type="date", "YYYY-MM-DD") se guardan
 *    como `YYYY-MM-DDT12:00:00.000Z` (09:00 hs en Asunción). Así el día
 *    calendario es el mismo en cualquier zona horaria.
 *  - Los cierres de período terminan a las 23:59:59.999 (hora de Asunción) del
 *    día en que se cierran y el período siguiente comienza a las 00:00:00.000
 *    del día siguiente.
 */

export const APP_TIMEZONE = "Etc/GMT+3"; // = UTC-3 fijo (Asunción)
export const APP_TZ_OFFSET = "-03:00";
const OFFSET_MS = 3 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Fecha de inicio del primer ejercicio (capital inicial). */
export const INITIAL_PERIOD_START_YMD = "2026-07-26";
/** Capital inicial del sistema al inicio del primer ejercicio (solo accionistas: CSDF + MH).
 *  Antes era 3.124.115.358; los 13.957.842 de YL son una retención (deuda), no capital. */
export const INITIAL_CAPITAL = 3110157516;

/** Devuelve el día calendario ("YYYY-MM-DD") en Asunción de un instante dado. */
export function toYmdPY(date: Date | string | number): string {
  const d = new Date(date);
  return new Date(d.getTime() - OFFSET_MS).toISOString().slice(0, 10);
}

/** Día de hoy ("YYYY-MM-DD") en Asunción. Usar para defaults y `max` de inputs. */
export function todayPY(): string {
  return toYmdPY(new Date());
}

/** 00:00:00.000 (Asunción) del día indicado. */
export function startOfDayPY(ymd: string): Date {
  return new Date(`${ymd}T00:00:00.000${APP_TZ_OFFSET}`);
}

/** 23:59:59.999 (Asunción) del día indicado. */
export function endOfDayPY(ymd: string): Date {
  return new Date(`${ymd}T23:59:59.999${APP_TZ_OFFSET}`);
}

/** Convierte el valor de un input type="date" al instante estándar del sistema (mediodía UTC). */
export function dateFromInputPY(ymd: string): Date {
  return new Date(`${ymd}T12:00:00.000Z`);
}

/** Suma (o resta) días a un "YYYY-MM-DD". */
export function addDaysYmd(ymd: string, days: number): string {
  const d = new Date(`${ymd}T12:00:00.000Z`);
  return new Date(d.getTime() + days * DAY_MS).toISOString().slice(0, 10);
}

/** Cantidad de días calendario entre dos "YYYY-MM-DD" (b - a). */
export function diffDaysYmd(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / DAY_MS);
}

/** Formatea en horario de Asunción: dd/MM/yyyy o dd/MM/yyyy HH:mm:ss. */
export function formatDatePY(date: Date | string | number, withTime = false): string {
  const s = new Date(new Date(date).getTime() - OFFSET_MS).toISOString(); // YYYY-MM-DDTHH:mm:ss
  const [y, m, d] = s.slice(0, 10).split("-");
  const base = `${d}/${m}/${y}`;
  return withTime ? `${base} ${s.slice(11, 19)}` : base;
}

/** Fuerza la zona horaria del proceso Node (servidor) a Asunción. */
export function forceServerTimezone() {
  if (typeof window === "undefined" && typeof process !== "undefined" && process.env) {
    if (process.env.TZ !== APP_TIMEZONE) process.env.TZ = APP_TIMEZONE;
  }
}

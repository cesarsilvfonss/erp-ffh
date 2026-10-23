import { forceServerTimezone } from "./lib/dates";

// Se ejecuta una vez al iniciar el servidor: fija la zona horaria del proceso
// a Asunción (UTC-3 fijo) para que date-fns, toLocaleString, getDate(), etc.
// den el mismo resultado sin importar dónde esté alojado el servidor.
forceServerTimezone();

export async function register() {
  forceServerTimezone();
}

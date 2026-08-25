import { prisma } from "./prisma";

export async function checkPeriodClosure(date: Date) {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-11 in JS Date

  const closure = await prisma.monthlyClosure.findUnique({
    where: {
      year_month: { year, month }
    }
  });

  if (closure && closure.status === "CLOSED") {
    throw new Error(`El período ${month + 1}/${year} se encuentra cerrado definitivamente. No se pueden realizar modificaciones en esta fecha.`);
  }
}

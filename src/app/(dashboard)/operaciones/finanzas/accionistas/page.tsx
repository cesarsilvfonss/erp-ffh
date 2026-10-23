import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getLiveCapital } from "@/actions/closure";
import { getOpenPeriod } from "@/lib/closure";
import { todayPY } from "@/lib/dates";
import { ShareholdersClient } from "./ShareholdersClient";

export const dynamic = "force-dynamic";

export default async function ShareholdersPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    redirect("/");
  }

  const [shareholders, openPeriod, live] = await Promise.all([
    prisma.shareholder.findMany({ orderBy: [{ isActive: "desc" }, { initialCapital: "desc" }, { name: "asc" }] }),
    getOpenPeriod(),
    getLiveCapital(),
  ]);

  // Capital inicial del período = capital del último cierre (o capital inicial del sistema).
  const periodInitialCapital = openPeriod.previousCapital;
  // Utilidad neta del ejercicio en tiempo real = capital actual - capital inicial del período.
  const netIncome = live.totalCapital - periodInitialCapital;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <ShareholdersClient
        shareholders={shareholders.map(s => ({
          id: s.id,
          name: s.name,
          document: s.document,
          phone: s.phone,
          email: s.email,
          notes: s.notes,
          initialCapital: s.initialCapital,
          isActive: s.isActive,
        }))}
        periodStart={openPeriod.start.toISOString()}
        today={todayPY()}
        periodInitialCapital={periodInitialCapital}
        currentCapital={live.totalCapital}
        netIncome={netIncome}
      />
    </div>
  );
}

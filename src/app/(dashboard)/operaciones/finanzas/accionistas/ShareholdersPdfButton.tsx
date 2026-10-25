"use client";

import { useState } from "react";
import { FileDown, Loader2 } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { DistributionResult } from "@/lib/shareholders";

// jsPDF (helvetica) no soporta el símbolo ₲: se usa "Gs."
const gs = (v: number) => `${v < 0 ? "-" : ""}Gs. ${Math.round(Math.abs(v)).toLocaleString("es-PY")}`;
const pct = (v: number, d = 2) => `${v.toLocaleString("es-PY", { minimumFractionDigits: d, maximumFractionDigits: d })} %`;

export type ShareholdersPdfData = {
  mode: "LIVE" | "CLOSED";
  periodFromLabel: string;
  periodToLabel: string;
  periodDays: number;
  periodInitialCapital: number;
  currentCapital: number;
  distribution: DistributionResult;
  capitalBalanced: boolean;
  capitalDifference: number;
  retentionMovements: { participant: string; date: string; type: string; concept: string; amount: number }[];
};

export function ShareholdersPdfButton({ data }: { data: ShareholdersPdfData }) {
  const [busy, setBusy] = useState(false);

  function generate() {
    setBusy(true);
    try {
      const d = data.distribution;
      const doc = new jsPDF({ orientation: "landscape" });
      const W = doc.internal.pageSize.getWidth();
      const growth = (s: { profitAmount: number; initialCapital: number }) => (s.initialCapital > 0 ? (s.profitAmount / s.initialCapital) * 100 : 0);
      const monthly = (g: number) => (g / data.periodDays) * 30;

      // --- Encabezado ---
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text("FFH Asociados", 14, 16);
      doc.setFontSize(12);
      doc.text("Distribución de Utilidades — Accionistas", 14, 23);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(90);
      doc.text(
        `Período: ${data.periodFromLabel} al ${data.periodToLabel}  ·  Duración: ${data.periodDays} días  ·  ${data.mode === "CLOSED" ? "PERÍODO CERRADO" : "PERÍODO ABIERTO (valores en vivo, estimados)"}`,
        14,
        29,
      );
      doc.text(`Impreso: ${new Date().toLocaleString("es-PY")}`, W - 14, 16, { align: "right" });
      doc.setTextColor(0);
      doc.setDrawColor(0);
      doc.line(14, 32, W - 14, 32);

      // --- 1. Utilidad del período ---
      const cascade: [string, string][] = [
        ["Capital al cierre antes de participaciones" + (data.mode === "LIVE" ? " (en vivo)" : ""), gs(data.currentCapital)],
        ["(-) Capital inicial del período", gs(-data.periodInitialCapital)],
        ["= UTILIDAD BRUTA DEL PERÍODO", gs(d.grossIncome)],
        ...d.participants.map(p => [
          `(-) Participación ${p.name} ${pct(p.profitShare)} (salario ${gs(p.salary)} + retención ${gs(p.retained)})`,
          gs(-p.amount),
        ] as [string, string]),
        [`= UTILIDAD PARA ACCIONISTAS (${pct(d.shareholdersPercent)})`, gs(d.shareholdersIncome)],
      ];
      autoTable(doc, {
        startY: 37,
        head: [["1. Utilidad del Período", "Monto"]],
        body: cascade,
        theme: "grid",
        headStyles: { fillColor: [24, 24, 27] },
        styles: { fontSize: 9 },
        columnStyles: { 1: { halign: "right", cellWidth: 60 } },
        didParseCell: h => {
          if (h.section === "body" && String(h.row.raw && (h.row.raw as string[])[0]).startsWith("=")) h.cell.styles.fontStyle = "bold";
        },
      });

      // --- 2. Participantes ---
      let y = (doc as any).lastAutoTable.finalY + 6;
      if (d.participants.length > 0) {
        autoTable(doc, {
          startY: y,
          head: [["2. Participante", "% Utilidad", "Participación", "Salario", "Retención período", "Retención inicial", "Retención final"]],
          body: d.participants.map(p => [
            p.name,
            pct(p.profitShare),
            gs(p.amount),
            gs(p.salary),
            gs(p.retained),
            gs(p.retentionBefore),
            gs(p.retentionAfter),
          ]),
          theme: "grid",
          headStyles: { fillColor: [8, 145, 178] },
          styles: { fontSize: 9 },
          columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" }, 5: { halign: "right" }, 6: { halign: "right" } },
        });
        y = (doc as any).lastAutoTable.finalY + 6;
      }

      // --- 3. Accionistas ---
      const totalGrowth = d.totalInitialCapital > 0 ? (d.shareholdersIncome / d.totalInitialCapital) * 100 : 0;
      autoTable(doc, {
        startY: y,
        head: [["3. Accionista", "% Capital", "Capital Inicial", "% Utilidad Bruta", "Capitalización", "Capital Final", "% Crecimiento", "% Crec. Mensual"]],
        body: d.shareholders.map(s => {
          const g = growth(s);
          return [s.name, pct(s.participation, 4), gs(s.initialCapital), pct(s.profitShare, 4), gs(s.profitAmount), gs(s.finalCapital), pct(g), pct(monthly(g))];
        }),
        foot: [[
          "TOTAL",
          pct(100, 4),
          gs(d.totalInitialCapital),
          pct(d.shareholders.reduce((a, s) => a + s.profitShare, 0), 4),
          gs(d.shareholdersIncome),
          gs(d.totalFinalCapital),
          pct(totalGrowth),
          pct(monthly(totalGrowth)),
        ]],
        theme: "grid",
        headStyles: { fillColor: [5, 150, 105] },
        footStyles: { fillColor: [24, 24, 27], textColor: 255 },
        styles: { fontSize: 9 },
        columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" }, 5: { halign: "right" }, 6: { halign: "right" }, 7: { halign: "right" } },
      });
      y = (doc as any).lastAutoTable.finalY + 5;
      doc.setFontSize(8);
      doc.setTextColor(90);
      doc.text(
        `% Crecimiento = Capitalización / Capital Inicial. % Crec. Mensual = % Crecimiento / ${data.periodDays} días × 30. ` +
          (data.capitalBalanced
            ? "Control de capital OK: suma de accionistas = capital inicial del período."
            : `ATENCIÓN: suma de accionistas difiere del capital inicial del período en ${gs(data.capitalDifference)}.`),
        14,
        y,
        { maxWidth: W - 28 },
      );
      doc.setTextColor(0);
      y += 8;

      // --- Movimientos de retención ---
      if (data.retentionMovements.length > 0) {
        autoTable(doc, {
          startY: y,
          head: [["Movimientos de retención", "Fecha", "Tipo", "Concepto", "Monto"]],
          body: data.retentionMovements.map(m => [m.participant, m.date, m.type, m.concept, gs(m.amount)]),
          theme: "grid",
          headStyles: { fillColor: [63, 63, 70] },
          styles: { fontSize: 8 },
          columnStyles: { 4: { halign: "right" } },
        });
      }

      const file = `accionistas_${data.periodFromLabel.replace(/\//g, "-")}_al_${data.periodToLabel.replace(/\//g, "-")}.pdf`;
      doc.save(file);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={generate}
      disabled={busy}
      className="flex items-center gap-2 px-4 py-2 text-zinc-300 hover:bg-zinc-800 rounded-lg font-medium transition-colors border border-zinc-800 disabled:opacity-50"
    >
      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
      PDF
    </button>
  );
}

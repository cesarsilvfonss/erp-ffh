"use client";

import { Download } from "lucide-react";
import { useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export function GeneratePdfButton({ batch }: { batch: any }) {
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePDF = () => {
    setIsGenerating(true);
    
    try {
      const doc = new jsPDF();
      
      const totalHeads = batch.details.reduce((acc: number, d: any) => acc + d.quantity, 0);
      const categoryStats = batch.details.reduce((acc: any, d: any) => {
        if (!acc[d.category]) {
          acc[d.category] = { headCount: 0, netWeight: 0, discountWeight: 0, liquidWeight: 0 };
        }
        acc[d.category].headCount += d.quantity;
        acc[d.category].netWeight += d.netWeight;
        acc[d.category].discountWeight += d.netWeight * (batch.closure!.discountPercentage / 100);
        acc[d.category].liquidWeight += d.netWeight * (1 - (batch.closure!.discountPercentage / 100));
        return acc;
      }, {} as Record<string, { headCount: number, netWeight: number, discountWeight: number, liquidWeight: number }>);

      // --- ENCABEZADO ---
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text("Sistema FFH", 14, 20);
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100);
      doc.text("Liquidación de Compra de Hacienda", 14, 26);
      
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0);
      doc.text(`Lote #${batch.batchNumber.toString().padStart(4, '0')}`, 140, 20);
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Fecha de Lote: ${new Date(batch.date).toLocaleDateString()}`, 140, 26);
      doc.text(`Liquidación impresa: ${new Date().toLocaleDateString()}`, 140, 31);
      
      doc.setDrawColor(0);
      doc.setLineWidth(0.5);
      doc.line(14, 35, 196, 35);

      // --- DATOS INFORMATIVOS ---
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(150);
      doc.text("DATOS DEL PROVEEDOR", 14, 42);
      doc.setFontSize(12);
      doc.setTextColor(0);
      doc.text(batch.provider.legalName, 14, 48);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      if (batch.provider.ruc) doc.text(`RUC: ${batch.provider.ruc}`, 14, 53);
      if (batch.provider.address) doc.text(`Dirección: ${batch.provider.address}`, 14, 58);

      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(150);
      doc.text("DATOS DE FAENA", 110, 42);
      doc.setFontSize(12);
      doc.setTextColor(0);
      doc.text(batch.slaughterhouse?.legalName || "No especificado", 110, 48);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("Estado del Lote: CERRADO Y LIQUIDADO", 110, 53);
      doc.text(`Cabezas Totales: ${totalHeads}`, 110, 58);

      let currentY = 70;

      // --- 1. ROMANEO ---
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("1. Detalle de Romaneo (Pesajes)", 14, currentY);
      
      const romaneoData = batch.details.map((d: any, i: number) => [
        i + 1,
        d.category,
        d.condition,
        d.quantity,
        `${d.netWeight.toLocaleString()} KG`,
        d.quantity > 0 ? `${(d.netWeight / d.quantity).toFixed(1)} KG/cab` : "0"
      ]);
      
      // Totales Romaneo
      romaneoData.push([
        "",
        "Total Bruto",
        "",
        totalHeads,
        `${batch.closure.totalNetWeight.toLocaleString()} KG`,
        totalHeads > 0 ? `${(batch.closure.totalNetWeight / totalHeads).toFixed(1)} KG/cab` : "0"
      ]);

      autoTable(doc, {
        startY: currentY + 4,
        head: [['#', 'Categoría', 'Condición', 'Cabezas', 'Peso Neto', 'Promedio']],
        body: romaneoData,
        theme: 'striped',
        headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
        footStyles: { fillColor: [250, 250, 250], textColor: [0, 0, 0], fontStyle: 'bold' },
        didParseCell: (data) => {
          if (data.row.index === romaneoData.length - 1) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [240, 240, 240];
          }
        },
        styles: { fontSize: 9 },
      });

      currentY = (doc as any).lastAutoTable.finalY + 15;

      // --- 2. DESBASTE ---
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("2. Cálculo de Desbaste y Peso Líquido por Categoría", 14, currentY);

      const desbasteData = Object.entries(categoryStats).map(([cat, stats]: [string, any]) => [
        cat,
        stats.headCount,
        `${stats.netWeight.toLocaleString()} KG`,
        `-${stats.discountWeight.toLocaleString(undefined, {maximumFractionDigits:1})} KG`,
        `${stats.liquidWeight.toLocaleString(undefined, {maximumFractionDigits:1})} KG`
      ]);

      desbasteData.push([
        "Totales",
        totalHeads,
        `${batch.closure.totalNetWeight.toLocaleString()} KG`,
        `-${batch.closure.totalDiscountWeight.toLocaleString(undefined, {maximumFractionDigits:1})} KG`,
        `${batch.closure.totalLiquidWeight.toLocaleString(undefined, {maximumFractionDigits:1})} KG`
      ]);

      autoTable(doc, {
        startY: currentY + 4,
        head: [['Categoría', 'Cabezas', 'Peso Bruto', `Desbaste (${batch.closure.discountPercentage}%)`, 'Peso Líquido']],
        body: desbasteData,
        theme: 'striped',
        headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
        didParseCell: (data) => {
          if (data.column.index === 3) {
            data.cell.styles.textColor = [200, 0, 0]; // Rojo para desbaste
          }
          if (data.column.index === 4) {
            data.cell.styles.textColor = [0, 128, 0]; // Verde para líquido
            data.cell.styles.fontStyle = 'bold';
          }
          if (data.row.index === desbasteData.length - 1) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [240, 240, 240];
          }
        },
        styles: { fontSize: 9 },
      });

      currentY = (doc as any).lastAutoTable.finalY + 15;

      // --- 3. LIQUIDACION ---
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.textColor = 0;
      doc.text("3. Liquidación Monetaria por Categorías", 14, currentY);

      const liquidacionData = batch.closure.prices.map((p: any) => [
        p.category,
        `${p.liquidWeight.toLocaleString()} KG`,
        `Gs. ${p.pricePerKg.toLocaleString()}`,
        `Gs. ${p.totalValue.toLocaleString()}`
      ]);

      liquidacionData.push([
        "TOTAL A PAGAR",
        "",
        "",
        `Gs. ${batch.closure.totalValue.toLocaleString()}`
      ]);

      autoTable(doc, {
        startY: currentY + 4,
        head: [['Categoría', 'KG Líquidos', 'Precio Pactado / KG', 'Subtotal']],
        body: liquidacionData,
        theme: 'striped',
        headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
        didParseCell: (data) => {
          if (data.row.index === liquidacionData.length - 1) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [30, 41, 59]; // slate-800
            data.cell.styles.textColor = [255, 255, 255]; // white
            data.cell.styles.fontSize = 11;
          }
        },
        styles: { fontSize: 10 },
      });

      // Save PDF
      doc.save(`Liquidacion_Lote_${batch.batchNumber.toString().padStart(4, '0')}.pdf`);
    } catch (error) {
      console.error("Error generando PDF:", error);
      alert("Hubo un error al generar el PDF.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <button
      onClick={generatePDF}
      disabled={isGenerating}
      className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm rounded-lg border border-zinc-700 transition-colors flex items-center gap-2 disabled:opacity-50"
    >
      <Download className="w-4 h-4" />
      {isGenerating ? "Generando..." : "Descargar Liquidación (PDF)"}
    </button>
  );
}

"use client";

import { Download } from "lucide-react";
import jsPDF from "jspdf";
import "jspdf-autotable";

// We extend jsPDF type to include autoTable if needed, but we can also use (doc as any).autoTable
export function GenerateFaenaPdfButton({ 
  slaughter, 
}: { 
  slaughter: any; 
}) {
  
  const handleDownload = () => {
    const doc = new jsPDF();
    const batch = slaughter.batch;
    const provider = batch.provider;

    // Colores
    const mainColor = [16, 185, 129]; // Emerald 500
    const darkColor = [24, 24, 27];   // Zinc 900
    
    // Header
    doc.setFillColor(mainColor[0], mainColor[1], mainColor[2]);
    doc.rect(0, 0, 210, 40, "F");
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("LIQUIDACIÓN DE FAENA", 105, 20, { align: "center" });
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Lote Nº: ${batch.batchNumber.toString().padStart(4, '0')} | Fecha de Faena: ${new Date(slaughter.date).toLocaleDateString()}`, 105, 30, { align: "center" });

    // Proveedor
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Datos del Proveedor", 14, 50);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Razón Social: ${provider.legalName}`, 14, 57);
    if (provider.ruc) doc.text(`RUC: ${provider.ruc}`, 14, 64);
    
    // Totales Comparativos (Romaneo Vivo vs Faena)
    const totalBoughtHeads = batch.details.reduce((acc: any, d: any) => acc + d.quantity, 0);
    const totalBoughtWeight = batch.details.reduce((acc: any, d: any) => acc + d.netWeight, 0);
    
    const totalFaenaHeads = slaughter.details.length * 0.5;
    const totalFaenaWeight = slaughter.details.reduce((acc: any, d: any) => acc + d.weight, 0);
    
    const globalYield = totalBoughtWeight > 0 ? (totalFaenaWeight / totalBoughtWeight) * 100 : 0;

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Resumen de Rendimiento (Pie vs Gancho)", 14, 80);

    const resumenBody = [
      ["Cabezas (Compra vs Faena)", `${totalBoughtHeads}`, `${totalFaenaHeads}`],
      ["Kilos Netos (Compra vs Faena)", `${totalBoughtWeight.toLocaleString()} KG`, `${totalFaenaWeight.toLocaleString()} KG`],
      ["Rendimiento Global (%)", "-", `${globalYield.toFixed(2)} %`],
    ];

    (doc as any).autoTable({
      startY: 85,
      head: [["Concepto", "Compra (En Pie)", "Faena (Al Gancho)"]],
      body: resumenBody,
      theme: "grid",
      headStyles: { fillColor: mainColor },
      styles: { fontSize: 10 }
    });

    // Detalle de Medias Reses (Agrupadas por Categoría)
    let finalY = (doc as any).lastAutoTable.finalY + 15;
    
    // Grouping by item to show yields per item
    const catStats = slaughter.details.reduce((acc: any, d: any) => {
      const itemName = d.item.name;
      if (!acc[itemName]) acc[itemName] = { medias: 0, weight: 0 };
      acc[itemName].medias += 1;
      acc[itemName].weight += d.weight;
      return acc;
    }, {});

    const catBody = Object.keys(catStats).map(itemName => {
      // Find bought weight for this category
      const bWeight = batch.details.filter((bd: any) => bd.item.name === itemName).reduce((acc: any, bd: any) => acc + bd.netWeight, 0);
      const yieldP = bWeight > 0 ? (catStats[itemName].weight / bWeight) * 100 : 0;

      return [
        itemName,
        `${catStats[itemName].medias}`,
        `${(catStats[itemName].medias * 0.5)}`,
        `${catStats[itemName].weight.toLocaleString()} KG`,
        `${bWeight.toLocaleString()} KG`,
        `${yieldP.toFixed(2)} %`
      ];
    });

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Detalle por Categoría", 14, finalY);
    
    (doc as any).autoTable({
      startY: finalY + 5,
      head: [["Categoría", "Medias Reses", "Cabezas Eq.", "KG Gancho", "KG Pie", "Rend. %"]],
      body: catBody,
      theme: "grid",
      headStyles: { fillColor: [50, 50, 50] },
      styles: { fontSize: 9 }
    });

    // Save
    doc.save(`Liquidacion_Faena_Lote_${batch.batchNumber.toString().padStart(4, '0')}.pdf`);
  };

  return (
    <button
      onClick={handleDownload}
      className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-lg transition-colors font-medium text-sm"
    >
      <Download className="w-4 h-4" />
      PDF Rendimiento
    </button>
  );
}

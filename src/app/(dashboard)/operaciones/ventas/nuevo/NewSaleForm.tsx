"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSale } from "@/actions/sales";
import { Plus, Save, Trash2, Users } from "lucide-react";
import { Client, Item, Inventory } from "@prisma/client";

type InventoryWithItem = Inventory & { item: Item };

export function NewSaleForm({ 
  clients, 
  inventoryItems 
}: { 
  clients: Client[],
  inventoryItems: InventoryWithItem[]
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  const [clientId, setClientId] = useState(clients[0]?.id || "");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  
  const [details, setDetails] = useState<{ itemId: string, quantityKg: string, salePrice: string }[]>([
    { itemId: inventoryItems[0]?.item.id || "", quantityKg: "", salePrice: "" }
  ]);

  const handleAddDetail = () => {
    setDetails([...details, { itemId: inventoryItems[0]?.item.id || "", quantityKg: "", salePrice: "" }]);
  };

  const handleRemoveDetail = (index: number) => {
    setDetails(details.filter((_, i) => i !== index));
  };

  const handleDetailChange = (index: number, field: string, value: string) => {
    const newDetails = [...details];
    newDetails[index] = { ...newDetails[index], [field]: value };
    setDetails(newDetails);
  };

  const getAvailableStock = (itemId: string) => {
    const inv = inventoryItems.find(i => i.item.id === itemId);
    return inv ? inv.currentStock : 0;
  };

  const totalSale = details.reduce((acc, d) => {
    const q = parseFloat(d.quantityKg) || 0;
    const p = parseFloat(d.salePrice) || 0;
    return acc + (q * p);
  }, 0);

  const selectedClient = clients.find(c => c.id === clientId);
  const ivaRetention = selectedClient?.isIvaRetainer ? (totalSale / 21) * 0.3 : 0;
  const rentRetention = selectedClient?.isRentRetainer ? (totalSale - (totalSale / 21)) * 0.004 : 0;
  const netSale = totalSale - ivaRetention - rentRetention;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId || details.length === 0) return;

    // Validar cantidad vs stock
    for (const d of details) {
      if (!d.itemId || !d.quantityKg || !d.salePrice) {
        alert("Complete todos los campos de los detalles");
        return;
      }
      const qty = parseFloat(d.quantityKg);
      if (qty <= 0) {
        alert("La cantidad debe ser mayor a 0");
        return;
      }
      const stock = getAvailableStock(d.itemId);
      if (qty > stock) {
        alert(`Stock insuficiente. Solo hay ${stock} KG disponibles para el artículo seleccionado.`);
        return;
      }
    }

    if (invoiceNumber && !/^\d{3}-\d{3}-\d{7}$/.test(invoiceNumber)) {
      alert("El número de factura debe tener el formato 000-000-0000000");
      return;
    }

    setLoading(true);
    const res = await createSale({
      clientId,
      date,
      invoiceNumber,
      ivaRetention,
      rentRetention,
      netValue: netSale,
      details: details.map(d => ({
        itemId: d.itemId,
        quantityKg: parseFloat(d.quantityKg),
        salePrice: parseFloat(d.salePrice)
      }))
    });

    if (res.success) {
      router.push("/operaciones/ventas");
    } else {
      alert("Error: " + (res as any).error);
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-2xl">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-2">Cliente *</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Users className="h-5 w-5 text-zinc-500" />
            </div>
            <select 
              value={clientId}
              onChange={e => setClientId(e.target.value)}
              required
              disabled={loading}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-10 pr-4 py-2.5 text-zinc-100 focus:outline-none focus:border-emerald-500/50"
            >
              {clients.map(c => <option key={c.id} value={c.id}>{c.legalName}</option>)}
            </select>
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-2">Fecha *</label>
          <input 
            type="date" 
            required
            disabled={loading}
            value={date}
            onChange={e => setDate(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-zinc-100 focus:outline-none focus:border-emerald-500/50"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-2">Factura Nº</label>
          <input 
            type="text" 
            disabled={loading}
            placeholder="001-001-0000001"
            value={invoiceNumber}
            onChange={e => {
              let val = e.target.value.replace(/\D/g, '');
              if (val.length > 3) val = val.slice(0,3) + '-' + val.slice(3);
              if (val.length > 7) val = val.slice(0,7) + '-' + val.slice(7, 14);
              setInvoiceNumber(val);
            }}
            maxLength={15}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-zinc-100 font-mono focus:outline-none focus:border-emerald-500/50 placeholder-zinc-700"
          />
        </div>
      </div>

      <div className="mt-8 border-t border-zinc-800 pt-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-zinc-200">Detalles de Venta</h2>
          <button 
            type="button"
            onClick={handleAddDetail}
            disabled={loading}
            className="flex items-center gap-2 text-sm text-emerald-400 hover:text-emerald-300 font-medium px-3 py-1.5 rounded-lg hover:bg-emerald-500/10 transition-colors"
          >
            <Plus className="w-4 h-4" /> Agregar Línea
          </button>
        </div>

        <div className="space-y-3">
          {details.map((d, index) => (
            <div key={index} className="flex flex-col md:flex-row gap-3 bg-zinc-950 p-3 rounded-lg border border-zinc-800/50">
              <div className="flex-1">
                <label className="block text-xs font-medium text-zinc-500 mb-1">Artículo</label>
                <select
                  value={d.itemId}
                  onChange={e => handleDetailChange(index, "itemId", e.target.value)}
                  disabled={loading}
                  required
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50"
                >
                  {inventoryItems.map(inv => (
                    <option key={inv.id} value={inv.item.id}>
                      {inv.item.name} (Disp: {inv.currentStock.toLocaleString()} {inv.item.unit})
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="w-full md:w-32">
                <label className="block text-xs font-medium text-zinc-500 mb-1">Cant. (KG)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  required
                  disabled={loading}
                  value={d.quantityKg}
                  onChange={e => handleDetailChange(index, "quantityKg", e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50 text-right"
                  placeholder="0.0"
                />
              </div>

              <div className="w-full md:w-40 relative">
                <label className="block text-xs font-medium text-zinc-500 mb-1">Precio Unit.</label>
                <div className="absolute left-3 top-8 text-xs text-zinc-500 font-bold">₲</div>
                <input
                  type="number"
                  min="1"
                  required
                  disabled={loading}
                  value={d.salePrice}
                  onChange={e => handleDetailChange(index, "salePrice", e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-7 pr-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50 text-right font-mono"
                  placeholder="0"
                />
              </div>

              <div className="w-full md:w-48 pt-1">
                <label className="block text-xs font-medium text-zinc-500 mb-1">Subtotal</label>
                <div className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-emerald-400 font-bold text-right font-mono flex items-center justify-end h-[38px]">
                  ₲ {((parseFloat(d.quantityKg) || 0) * (parseFloat(d.salePrice) || 0)).toLocaleString()}
                </div>
              </div>

              <div className="flex items-end pb-[2px]">
                <button
                  type="button"
                  onClick={() => handleRemoveDetail(index)}
                  disabled={details.length === 1 || loading}
                  className="p-2 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-6 border-t border-zinc-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        
        <div className="flex flex-col gap-2 w-full md:w-auto">
          <div className="flex items-center justify-between md:justify-start gap-4 px-4">
            <span className="text-zinc-500 font-medium text-sm">Monto Bruto:</span>
            <span className="font-bold text-zinc-300 font-mono">₲ {totalSale.toLocaleString()}</span>
          </div>

          {selectedClient?.isIvaRetainer && (
            <div className="flex items-center justify-between md:justify-start gap-4 px-4">
              <span className="text-rose-500/80 font-medium text-sm">Retención IVA (30%):</span>
              <span className="font-bold text-rose-400 font-mono">- ₲ {ivaRetention.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
            </div>
          )}

          {selectedClient?.isRentRetainer && (
            <div className="flex items-center justify-between md:justify-start gap-4 px-4">
              <span className="text-rose-500/80 font-medium text-sm">Retención Renta (0.4%):</span>
              <span className="font-bold text-rose-400 font-mono">- ₲ {rentRetention.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
            </div>
          )}

          <div className="flex items-center justify-between md:justify-start gap-4 bg-zinc-950 px-6 py-3 rounded-xl border border-emerald-900/50 shadow-[0_0_15px_rgba(16,185,129,0.05)] mt-2">
            <span className="text-emerald-400 font-bold text-lg">Neto a Cobrar:</span>
            <span className="text-2xl font-black text-emerald-400 font-mono">
              ₲ {netSale.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || details.length === 0}
          className="w-full md:w-auto bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-zinc-950 px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-zinc-950/30 border-t-zinc-950 rounded-full animate-spin" />
          ) : (
            <Save className="w-5 h-5" />
          )}
          Confirmar Venta
        </button>
      </div>
    </form>
  );
}

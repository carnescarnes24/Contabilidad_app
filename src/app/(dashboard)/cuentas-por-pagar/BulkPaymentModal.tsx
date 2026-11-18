"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { registerBulkPayment } from "./actions";

type InvoiceRow = {
  id: string;
  number: string;
  thirdPartyId: string;
  thirdPartyName: string;
  dueDate: string;
  amount: number;
  paidAmount: number;
};

type Party = { id: string; name: string };

export function BulkPaymentModal({
  invoices,
  parties,
  onClose,
}: {
  invoices: InvoiceRow[];
  parties: Party[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [thirdPartyId, setThirdPartyId] = useState("");
  const [amount, setAmount] = useState<number>(0);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState("Transferencia");
  const [reference, setReference] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const partyInvoices = useMemo(() => {
    if (!thirdPartyId) return [];
    return invoices
      .filter((i) => i.thirdPartyId === thirdPartyId)
      .filter((i) => i.amount - i.paidAmount > 0.01)
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }, [invoices, thirdPartyId]);

  const saldoSeleccionado = useMemo(() => {
    return selected.reduce((s, id) => {
      const inv = partyInvoices.find((i) => i.id === id);
      return inv ? s + (inv.amount - inv.paidAmount) : s;
    }, 0);
  }, [selected, partyInvoices]);

  const distribucion = useMemo(() => {
    let remaining = amount;
    const result: { inv: InvoiceRow; pago: number }[] = [];
    for (const id of selected) {
      const inv = partyInvoices.find((i) => i.id === id);
      if (!inv || remaining <= 0.01) break;
      const saldo = inv.amount - inv.paidAmount;
      const pago = Math.min(remaining, saldo);
      result.push({ inv, pago });
      remaining -= pago;
    }
    return result;
  }, [selected, partyInvoices, amount]);

  function toggleInvoice(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      await registerBulkPayment({
        thirdPartyId,
        amount,
        date,
        method,
        reference,
        invoiceIds: selected,
      });
      if (res?.error) setMsg(res.error);
      else { onClose(); router.refresh(); }
      onClose();
      router.refresh();
    } catch (err) {
      setMsg((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl p-6 my-8">
        <h2 className="text-lg font-semibold text-brand-brown mb-4">
          Registrar pago global
        </h2>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-sm font-medium text-brand-brown">Tercero</label>
              <select
                value={thirdPartyId}
                onChange={(e) => { setThirdPartyId(e.target.value); setSelected([]); }}
                required
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                defaultValue=""
              >
                <option value="" disabled>Selecciona…</option>
                {parties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-brand-brown">Monto a abonar</label>
              <Input type="number" step="0.01" min="0.01" value={amount || ""} onChange={(e) => setAmount(Number(e.target.value))} required />
            </div>
            <div>
              <label className="text-sm font-medium text-brand-brown">Fecha</label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-brand-brown">Método</label>
              <select value={method} onChange={(e) => setMethod(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
                <option>Transferencia</option>
                <option>Efectivo</option>
                <option>Nequi</option>
                <option>Daviplata</option>
                <option>PSE</option>
                <option>Cheque</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-brand-brown">Referencia (opcional)</label>
              <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Nro. transacción" />
            </div>
          </div>

          {thirdPartyId && (
            <div>
              <p className="text-sm font-medium text-brand-brown mb-2">
                Facturas pendientes (selecciona en el orden en que deseas abonar)
              </p>
              {partyInvoices.length === 0 ? (
                <p className="text-sm text-slate-500 italic">Este tercero no tiene facturas pendientes.</p>
              ) : (
                <div className="border border-brand-orange/20 rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-brand-cream/50 text-left sticky top-0">
                      <tr>
                        <th className="p-2 w-8"></th>
                        <th className="p-2">Factura</th>
                        <th className="p-2">Vencimiento</th>
                        <th className="p-2 text-right">Saldo</th>
                        <th className="p-2 text-right">Pago asignado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {partyInvoices.map((inv) => {
                        const isSel = selected.includes(inv.id);
                        const idx = selected.indexOf(inv.id);
                        const asignado = distribucion.find((d) => d.inv.id === inv.id)?.pago ?? 0;
                        return (
                          <tr key={inv.id} className={`border-t border-brand-orange/10 ${isSel ? "bg-brand-cream/30" : ""}`}>
                            <td className="p-2">
                              <input
                                type="checkbox"
                                checked={isSel}
                                onChange={() => toggleInvoice(inv.id)}
                              />
                            </td>
                            <td className="p-2 font-mono text-xs">
                              {isSel && <span className="bg-brand-red text-white rounded-full px-1.5 text-[10px] mr-1">{idx + 1}</span>}
                              {inv.number}
                            </td>
                            <td className="p-2">{new Date(inv.dueDate).toLocaleDateString("es-CO")}</td>
                            <td className="p-2 text-right">{formatCOP(inv.amount - inv.paidAmount)}</td>
                            <td className="p-2 text-right font-semibold text-emerald-700">
                              {asignado > 0 ? formatCOP(asignado) : "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              {selected.length > 0 && (
                <p className="text-xs text-slate-500 mt-2">
                  Total seleccionado: <strong>{formatCOP(saldoSeleccionado)}</strong> · Monto a abonar: <strong>{formatCOP(amount)}</strong>
                  {amount > saldoSeleccionado && <span className="text-red-600"> (excede el saldo)</span>}
                </p>
              )}
            </div>
          )}

          {msg && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{msg}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
            <Button
              type="submit"
              disabled={loading || !thirdPartyId || selected.length === 0 || amount <= 0}
              className="bg-brand-red hover:bg-brand-red/90 text-white"
            >
              {loading ? "Guardando..." : "Registrar pago"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function formatCOP(n: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);
}
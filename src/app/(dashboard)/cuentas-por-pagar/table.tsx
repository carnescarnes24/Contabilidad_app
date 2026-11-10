"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createPayable, deleteInvoice, registerPayment, updateInvoice, deletePayment } from "./actions";

type InvoiceRow = {
  id: string;
  number: string;
  thirdPartyId: string;
  thirdPartyName: string;
  issueDate: string;
  dueDate: string;
  amount: number;
  paidAmount: number;
  status: "PENDIENTE" | "PARCIAL" | "PAGADA" | "VENCIDA" | "ANULADA";
  notes: string | null;
  payments: { id: string; amount: number; date: string; method: string | null; reference: string | null }[]; // <-- NUEVO
};

type Party = { id: string; name: string };

type StatusFilter =
  | "TODAS"
  | "PENDIENTE"
  | "PARCIAL"
  | "VENCIDA"
  | "PAGADA"
  | "ANULADA";

export function PayablesTable({
  businessId,
  businessName,
  initial,
  parties,
  canEdit,
  defaults,
}: {
  businessId: string;
  businessName: string;
  initial: InvoiceRow[];
  parties: Party[];
  canEdit: boolean;
  defaults: { prefix: string; dueDays: number };
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("TODAS");
  const [onlyOverdue, setOnlyOverdue] = useState(false);

  const [newOpen, setNewOpen] = useState(false);
  const [payInvoice, setPayInvoice] = useState<InvoiceRow | null>(null);
  const [editInvoice, setEditInvoice] = useState<InvoiceRow | null>(null); // <-- NUEVO
  const [managePaymentsInvoice, setManagePaymentsInvoice] = useState<InvoiceRow | null>(null); // <-- NUEVO

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const rows = useMemo(() => {
    return initial.filter((i) => {
      if (filter !== "TODAS" && i.status !== filter) return false;
      if (onlyOverdue && i.status !== "VENCIDA") return false;
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (
        i.number.toLowerCase().includes(q) ||
        i.thirdPartyName.toLowerCase().includes(q)
      );
    });
  }, [initial, search, filter, onlyOverdue]);

  const totals = useMemo(() => {
    const pendiente = rows.reduce(
      (s, i) =>
        ["PAGADA", "ANULADA"].includes(i.status)
          ? s
          : s + (i.amount - i.paidAmount),
      0
    );
    const vencido = rows
      .filter((i) => i.status === "VENCIDA")
      .reduce((s, i) => s + (i.amount - i.paidAmount), 0);
    return { pendiente, vencido };
  }, [rows]);

  async function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    const fd = new FormData(e.currentTarget);
    try {
      await createPayable({
        thirdPartyId: fd.get("thirdPartyId"),
        number: fd.get("number"),
        issueDate: fd.get("issueDate"),
        dueDate: fd.get("dueDate"),
        amount: fd.get("amount"),
        notes: fd.get("notes") || undefined,
      });
      setNewOpen(false);
      router.refresh();
    } catch (err) {
      setMsg((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function onPay(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!payInvoice) return;
    setLoading(true);
    setMsg(null);
    const fd = new FormData(e.currentTarget);
    try {
      await registerPayment(payInvoice.id, {
        amount: fd.get("amount"),
        date: fd.get("date"),
        method: fd.get("method") || undefined,
        reference: fd.get("reference") || undefined,
      });
      setPayInvoice(null);
      router.refresh();
    } catch (err) {
      setMsg((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function onEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editInvoice) return;
    setLoading(true);
    setMsg(null);
    const fd = new FormData(e.currentTarget);
    try {
      await updateInvoice(editInvoice.id, {
        number: fd.get("number"),
        issueDate: fd.get("issueDate"),
        dueDate: fd.get("dueDate"),
        amount: fd.get("amount"),
        notes: fd.get("notes") || undefined,
      });
      setEditInvoice(null);
      router.refresh();
    } catch (err) {
      setMsg((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function onDeletePayment(paymentId: string, invoiceId: string) {
    if (!confirm("¿Eliminar este pago? El saldo de la factura se recalculará.")) return;
    try {
      await deletePayment(paymentId, invoiceId);
      setManagePaymentsInvoice(null); // Cierra el modal para refrescar los datos
      router.refresh();
    } catch (err) {
      alert((err as Error).message);
    }
  }

  async function onDelete(inv: InvoiceRow) {
    if (
      !confirm(
        `¿Anular la factura ${inv.number}? Esta acción no elimina los pagos registrados.`
      )
    )
      return;
    try {
      await deleteInvoice(inv.id);
      router.refresh();
    } catch (err) {
      alert((err as Error).message);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
        <div className="flex flex-wrap gap-2 items-center">
          <Input
            placeholder="Buscar por número o proveedor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-64 border-brand-orange/40"
          />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as StatusFilter)}
            className="border border-brand-orange/40 rounded-lg px-3 py-2 text-sm bg-white text-brand-brown"
          >
            <option value="TODAS">Todos los estados</option>
            <option value="PENDIENTE">Pendientes</option>
            <option value="PARCIAL">Parciales</option>
            <option value="VENCIDA">Vencidas</option>
            <option value="PAGADA">Pagadas</option>
            <option value="ANULADA">Anuladas</option>
          </select>
          <label className="text-sm text-brand-brown flex items-center gap-1">
            <input
              type="checkbox"
              checked={onlyOverdue}
              onChange={(e) => setOnlyOverdue(e.target.checked)}
            />
            Solo vencidas
          </label>
        </div>
        {canEdit && (
          <Button
            onClick={() => {
              setMsg(null);
              setNewOpen(true);
            }}
            className="bg-brand-red hover:bg-brand-red/90 text-white"
          >
            + Nueva factura
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border-2 border-brand-orange/20 p-3">
          <p className="text-xs text-slate-500">Saldo pendiente (filtro)</p>
          <p className="text-xl font-bold text-rose-600">
            {formatCOP(totals.pendiente)}
          </p>
        </div>
        <div className="bg-white rounded-xl border-2 border-red-200 p-3">
          <p className="text-xs text-slate-500">Vencido (filtro)</p>
          <p className="text-xl font-bold text-red-600">
            {formatCOP(totals.vencido)}
          </p>
        </div>
        <div className="bg-white rounded-xl border-2 border-brand-orange/20 p-3">
          <p className="text-xs text-slate-500">Facturas (filtro)</p>
          <p className="text-xl font-bold text-brand-brown">{rows.length}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border-2 border-brand-orange/20 overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-brand-cream/50 text-left text-brand-brown">
            <tr>
              <th className="p-3">Número</th>
              <th className="p-3">Proveedor</th>
              <th className="p-3">Vencimiento</th>
              <th className="p-3 text-right">Total</th>
              <th className="p-3 text-right">Pagado</th>
              <th className="p-3 text-right">Saldo</th>
              <th className="p-3">Estado</th>
              <th className="p-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((i) => {
              const saldo = i.amount - i.paidAmount;
              const days = daysUntil(i.dueDate);
              const canPay = saldo > 0.01 && i.status !== "ANULADA";
              return (
                <tr
                  key={i.id}
                  className="border-t border-brand-orange/10 hover:bg-brand-cream/20"
                >
                  <td className="p-3 font-mono text-xs">{i.number}</td>
                  <td className="p-3">
                    <Link
                      href={`/terceros/${i.thirdPartyId}`}
                      className="text-brand-brown hover:text-brand-red hover:underline"
                    >
                      {i.thirdPartyName}
                    </Link>
                  </td>
                  <td className="p-3">
                    {formatDate(i.dueDate)}
                    {saldo > 0.01 && days < 0 && (
                      <span className="text-xs text-red-600 ml-1">
                        ({Math.abs(days)}d)
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-right">{formatCOP(i.amount)}</td>
                  <td className="p-3 text-right text-slate-600">
                    {formatCOP(i.paidAmount)}
                  </td>
                  <td className="p-3 text-right font-semibold text-rose-700">
                    {formatCOP(saldo)}
                  </td>
                  <td className="p-3">
                    <StatusBadge status={i.status} />
                  </td>
                  <td className="p-3 text-right space-x-2 whitespace-nowrap">
                    {canEdit && (
                      <>
                        <button
                          onClick={() => setManagePaymentsInvoice(i)}
                          className="text-sm text-brand-brown hover:underline font-medium"
                        >
                          Ver Pagos
                        </button>
                        {canPay && (
                          <button
                            onClick={() => {
                              setMsg(null);
                              setPayInvoice(i);
                            }}
                            className="text-sm text-brand-red hover:underline font-medium"
                          >
                            Registrar pago
                          </button>
                        )}
                        {i.status !== "ANULADA" && (
                          <>
                            <button
                              onClick={() => {
                                setMsg(null);
                                setEditInvoice(i);
                              }}
                              className="text-sm text-slate-600 hover:underline"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => onDelete(i)}
                              className="text-sm text-slate-500 hover:underline"
                            >
                              Anular
                            </button>
                          </>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="p-6 text-center text-slate-500">
                  No hay facturas con los filtros actuales
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal nueva factura por pagar */}
      {newOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-brand-brown mb-1">
              Nueva factura por pagar
            </h2>
            <p className="text-sm text-slate-500 mb-3">
              Empresa:{" "}
              <span className="text-brand-red font-semibold">{businessName}</span>
            </p>
            <form onSubmit={onCreate} className="space-y-3">
              <div>
                <label className="text-sm font-medium text-brand-brown">
                  Proveedor
                </label>
                <select
                  name="thirdPartyId"
                  required
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  defaultValue=""
                >
                  <option value="" disabled>
                    Selecciona un proveedor…
                  </option>
                  {parties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-brand-brown">
                    Número
                  </label>
                  <Input
                    name="number"
                    required
                    placeholder={`Ej: ${defaults.prefix}0001`}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-brand-brown">
                    Monto
                  </label>
                  <Input
                    name="amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-brand-brown">
                    Emisión
                  </label>
                  <Input
                    name="issueDate"
                    type="date"
                    required
                    defaultValue={new Date().toISOString().slice(0, 10)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-brand-brown">
                    Vencimiento
                  </label>
                  <Input
                    name="dueDate"
                    type="date"
                    required
                    defaultValue={
                      new Date(Date.now() + defaults.dueDays * 86400000)
                        .toISOString()
                        .slice(0, 10)
                    }
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-brand-brown">
                  Notas (opcional)
                </label>
                <Input name="notes" placeholder="Observaciones" />
              </div>

              {msg && (
                <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">
                  {msg}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setNewOpen(false)}
                  disabled={loading}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-brand-red hover:bg-brand-red/90 text-white"
                >
                  {loading ? "Guardando..." : "Crear factura"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal registrar pago */}
      {payInvoice && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-brand-brown mb-1">
              Registrar pago
            </h2>
            <p className="text-sm text-slate-500 mb-4">
              Factura <span className="font-mono">{payInvoice.number}</span> ·{" "}
              {payInvoice.thirdPartyName}
            </p>
            <div className="bg-brand-cream/40 rounded-lg p-3 mb-4 text-sm">
              <div className="flex justify-between">
                <span className="text-brand-brown">Saldo pendiente</span>
                <span className="font-semibold text-rose-700">
                  {formatCOP(payInvoice.amount - payInvoice.paidAmount)}
                </span>
              </div>
            </div>
            <form onSubmit={onPay} className="space-y-3">
              <div>
                <label className="text-sm font-medium text-brand-brown">
                  Monto a pagar
                </label>
                <Input
                  name="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={payInvoice.amount - payInvoice.paidAmount}
                  required
                  defaultValue={(
                    payInvoice.amount - payInvoice.paidAmount
                  ).toFixed(2)}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-brand-brown">
                  Fecha
                </label>
                <Input
                  name="date"
                  type="date"
                  required
                  defaultValue={new Date().toISOString().slice(0, 10)}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-brand-brown">
                  Método
                </label>
                <select
                  name="method"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  defaultValue="Transferencia"
                >
                  <option>Efectivo</option>
                  <option>Transferencia</option>
                  <option>PSE</option>
                  <option>Cheque</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-brand-brown">
                  Referencia (opcional)
                </label>
                <Input name="reference" placeholder="Nro. transacción" />
              </div>

              {msg && (
                <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">
                  {msg}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPayInvoice(null)}
                  disabled={loading}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-brand-red hover:bg-brand-red/90 text-white"
                >
                  {loading ? "Guardando..." : "Registrar pago"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Factura */}
      {editInvoice && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
            <h2 className="text-lg font-semibold text-brand-brown mb-1">Editar Factura {editInvoice.number}</h2>
            <p className="text-sm text-slate-500 mb-3">Empresa: {businessName}</p>
            <form onSubmit={onEdit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-brand-brown">Número</label>
                  <Input name="number" defaultValue={editInvoice.number} required />
                </div>
                <div>
                  <label className="text-sm font-medium text-brand-brown">Monto</label>
                  <Input name="amount" type="number" step="0.01" min="0.01" defaultValue={editInvoice.amount} required disabled={editInvoice.paidAmount > 0} />
                  {editInvoice.paidAmount > 0 && <p className="text-[10px] text-red-500 mt-1">Bloqueado: la factura tiene pagos.</p>}
                </div>
                <div>
                  <label className="text-sm font-medium text-brand-brown">Emisión</label>
                  <Input name="issueDate" type="date" defaultValue={new Date(editInvoice.issueDate).toISOString().slice(0, 10)} required />
                </div>
                <div>
                  <label className="text-sm font-medium text-brand-brown">Vencimiento</label>
                  <Input name="dueDate" type="date" defaultValue={new Date(editInvoice.dueDate).toISOString().slice(0, 10)} required />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-brand-brown">Notas (opcional)</label>
                <Input name="notes" defaultValue={editInvoice.notes || ""} />
              </div>
              {msg && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{msg}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setEditInvoice(null)} disabled={loading}>Cancelar</Button>
                <Button type="submit" disabled={loading} className="bg-brand-red hover:bg-brand-red/90 text-white">{loading ? "Guardando..." : "Guardar Cambios"}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Gestión de Pagos */}
      {managePaymentsInvoice && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6">
            <h2 className="text-lg font-semibold text-brand-brown mb-1">Pagos de la Factura {managePaymentsInvoice.number}</h2>
            <p className="text-sm text-slate-500 mb-4">Total Factura: {formatCOP(managePaymentsInvoice.amount)}</p>
            
            {managePaymentsInvoice.payments.length === 0 ? (
              <p className="text-sm text-slate-500 py-4 text-center">No hay pagos registrados.</p>
            ) : (
              <div className="border border-brand-orange/20 rounded-lg overflow-hidden mb-4">
                <table className="w-full text-sm">
                  <thead className="bg-brand-cream/50 text-left">
                    <tr>
                      <th className="p-2">Fecha</th>
                      <th className="p-2">Método</th>
                      <th className="p-2">Referencia</th>
                      <th className="p-2 text-right">Monto</th>
                      <th className="p-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {managePaymentsInvoice.payments.map(p => (
                      <tr key={p.id} className="border-t border-brand-orange/10">
                        <td className="p-2">{formatDate(p.date)}</td>
                        <td className="p-2">{p.method || "-"}</td>
                        <td className="p-2 text-xs text-slate-500">{p.reference || "-"}</td>
                        <td className="p-2 text-right font-semibold text-rose-700">{formatCOP(p.amount)}</td>
                        <td className="p-2 text-right">
                          <button onClick={() => onDeletePayment(p.id, managePaymentsInvoice.id)} className="text-red-600 hover:underline text-xs">Eliminar</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setManagePaymentsInvoice(null)}>Cerrar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: InvoiceRow["status"] }) {
  const map: Record<string, string> = {
    PENDIENTE: "bg-amber-100 text-amber-800",
    PARCIAL: "bg-orange-100 text-orange-800",
    PAGADA: "bg-emerald-100 text-emerald-800",
    VENCIDA: "bg-red-100 text-red-800",
    ANULADA: "bg-slate-200 text-slate-600",
  };
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[status] ?? "bg-slate-100"}`}
    >
      {status}
    </span>
  );
}

function formatCOP(n: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function daysUntil(d: string) {
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
}
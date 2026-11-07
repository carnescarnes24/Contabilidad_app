import { prisma } from "@/lib/prisma";
import { getCurrentBusiness } from "@/lib/current-business";
import { notFound } from "next/navigation";
import Link from "next/link";
import { fmt, fmtDate, daysUntil } from "@/lib/format";

export default async function ThirdPartyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const business = await getCurrentBusiness();
  if (!business) return <p>Sin negocio activo</p>;

  const party = await prisma.thirdParty.findFirst({
    where: { id, businessId: business.id },
    include: {
      invoices: {
        orderBy: { dueDate: "desc" },
        include: { payments: { orderBy: { date: "desc" } } },
      },
    },
  });
  if (!party) notFound();

  const cobrar = party.invoices.filter((i) => i.type === "COBRAR");
  const pagar = party.invoices.filter((i) => i.type === "PAGAR");

  const saldoCobrar = cobrar
    .filter((i) => !["PAGADA", "ANULADA"].includes(i.status))
    .reduce((s, i) => s + Number(i.amount) - Number(i.paidAmount), 0);
  const saldoPagar = pagar
    .filter((i) => !["PAGADA", "ANULADA"].includes(i.status))
    .reduce((s, i) => s + Number(i.amount) - Number(i.paidAmount), 0);
  const neto = saldoCobrar - saldoPagar;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <Link
            href="/terceros"
            className="text-sm text-brand-red hover:underline"
          >
            ← Volver a terceros
          </Link>
          <h1 className="text-2xl font-bold text-brand-brown mt-1">
            {party.name}
          </h1>
          <p className="text-sm text-slate-500">
            {party.docType} {party.docNumber} · {party.type}
            {!party.active && " · Inactivo"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500">Saldo neto</p>
          <p
            className={`text-2xl font-bold ${
              neto > 0
                ? "text-emerald-600"
                : neto < 0
                  ? "text-rose-600"
                  : "text-slate-700"
            }`}
          >
            {fmt(neto)}
          </p>
        </div>
      </div>

      {/* Datos de contacto */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border-2 border-brand-orange/20 p-4">
          <p className="text-xs text-slate-500">Email</p>
          <p className="text-sm text-brand-brown mt-1">
            {party.email ?? "—"}
          </p>
        </div>
        <div className="bg-white rounded-xl border-2 border-brand-orange/20 p-4">
          <p className="text-xs text-slate-500">Teléfono</p>
          <p className="text-sm text-brand-brown mt-1">
            {party.phone ?? "—"}
          </p>
        </div>
        <div className="bg-white rounded-xl border-2 border-brand-orange/20 p-4">
          <p className="text-xs text-slate-500">Dirección</p>
          <p className="text-sm text-brand-brown mt-1">
            {party.address ?? "—"}
          </p>
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border-2 border-emerald-200 p-4">
          <p className="text-xs text-slate-500">Saldo por cobrar</p>
          <p className="text-xl font-bold text-emerald-600">
            {fmt(saldoCobrar)}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {cobrar.length} factura(s)
          </p>
        </div>
        <div className="bg-white rounded-xl border-2 border-rose-200 p-4">
          <p className="text-xs text-slate-500">Saldo por pagar</p>
          <p className="text-xl font-bold text-rose-600">{fmt(saldoPagar)}</p>
          <p className="text-xs text-slate-500 mt-1">
            {pagar.length} factura(s)
          </p>
        </div>
        <div className="bg-white rounded-xl border-2 border-brand-orange/20 p-4">
          <p className="text-xs text-slate-500">Total histórico</p>
          <p className="text-xl font-bold text-brand-brown">
            {fmt(
              party.invoices.reduce((s, i) => s + Number(i.amount), 0)
            )}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {party.invoices.length} factura(s)
          </p>
        </div>
      </div>

      {/* Facturas por cobrar */}
      <Section title="Facturas por cobrar" items={cobrar} type="COBRAR" />
      <Section title="Facturas por pagar" items={pagar} type="PAGAR" />
    </div>
  );
}

function Section({
  title,
  items,
  type,
}: {
  title: string;
  items: any[];
  type: "COBRAR" | "PAGAR";
}) {
  return (
    <div className="bg-white rounded-2xl border-2 border-brand-orange/20 overflow-hidden shadow-sm">
      <div className="px-5 py-3 border-b border-brand-orange/20">
        <h2 className="font-semibold text-brand-brown">{title}</h2>
      </div>
      {items.length === 0 ? (
        <p className="p-5 text-sm text-slate-500">Sin facturas registradas</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="bg-brand-cream/30 text-left text-brand-brown text-xs">
            <tr>
              <th className="p-3">Número</th>
              <th className="p-3">Emisión</th>
              <th className="p-3">Vencimiento</th>
              <th className="p-3 text-right">Total</th>
              <th className="p-3 text-right">Pagado</th>
              <th className="p-3 text-right">Saldo</th>
              <th className="p-3">Estado</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => {
              const saldo = Number(i.amount) - Number(i.paidAmount);
              const days = daysUntil(i.dueDate);
              return (
                <tr key={i.id} className="border-t border-brand-orange/10">
                  <td className="p-3 font-mono text-xs">{i.number}</td>
                  <td className="p-3">{fmtDate(i.issueDate)}</td>
                  <td className="p-3">
                    {fmtDate(i.dueDate)}
                    {saldo > 0 && days < 0 && (
                      <span className="text-xs text-red-600 ml-1">
                        ({Math.abs(days)}d)
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-right">{fmt(Number(i.amount))}</td>
                  <td className="p-3 text-right text-slate-600">
                    {fmt(Number(i.paidAmount))}
                  </td>
                  <td
                    className={`p-3 text-right font-semibold ${type === "COBRAR" ? "text-emerald-700" : "text-rose-700"}`}
                  >
                    {fmt(saldo)}
                  </td>
                  <td className="p-3">
                    <StatusBadge status={i.status} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
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
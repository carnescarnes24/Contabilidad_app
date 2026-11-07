import Link from "next/link";
import { getCurrentBusiness } from "@/lib/current-business";
import { prisma } from "@/lib/prisma";
import { fmt } from "@/lib/format";

export default async function InformesPage() {
  const business = await getCurrentBusiness();
  if (!business) return <p>Sin negocio activo</p>;

  const [cobrar, pagar] = await Promise.all([
    prisma.invoice.aggregate({
      where: { businessId: business.id, type: "COBRAR", status: { notIn: ["PAGADA", "ANULADA"] } },
      _sum: { amount: true, paidAmount: true },
    }),
    prisma.invoice.aggregate({
      where: { businessId: business.id, type: "PAGAR", status: { notIn: ["PAGADA", "ANULADA"] } },
      _sum: { amount: true, paidAmount: true },
    }),
  ]);

  const saldoCobrar = Number(cobrar._sum.amount ?? 0) - Number(cobrar._sum.paidAmount ?? 0);
  const saldoPagar = Number(pagar._sum.amount ?? 0) - Number(pagar._sum.paidAmount ?? 0);

  const reportes = [
    {
      href: "/informes/cuentas-por-cobrar",
      title: "Cuentas por cobrar",
      desc: "Detalle por cliente con aging y exportable a Excel",
      color: "border-emerald-200 bg-emerald-50/40",
      icon: "📈",
      amount: saldoCobrar,
      accent: "text-emerald-700",
    },
    {
      href: "/informes/cuentas-por-pagar",
      title: "Cuentas por pagar",
      desc: "Detalle por proveedor con aging y exportable a Excel",
      color: "border-rose-200 bg-rose-50/40",
      icon: "📉",
      amount: saldoPagar,
      accent: "text-rose-700",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-brown">Informes</h1>
        <p className="text-sm text-slate-500">
          Reportes financieros de <span className="text-brand-red font-medium">{business.name}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reportes.map((r) => (
          <Link
            key={r.href}
            href={r.href}
            className={`block rounded-2xl border-2 ${r.color} p-6 hover:shadow-md transition-shadow`}
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-3xl">{r.icon}</span>
                <h2 className="mt-2 text-lg font-semibold text-brand-brown">{r.title}</h2>
                <p className="text-sm text-slate-500 mt-1">{r.desc}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500">Saldo pendiente</p>
                <p className={`text-xl font-bold ${r.accent}`}>{fmt(r.amount)}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
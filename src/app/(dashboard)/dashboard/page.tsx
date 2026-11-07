import { getCurrentBusiness } from "@/lib/current-business";
import { getDashboardData } from "@/lib/dashboard";
import { fmt, fmtDate, daysUntil } from "@/lib/format";
import { MonthlyFlowChart, AgingChart } from "./_components/Charts";
import Link from "next/link";

function Kpi({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent: string;
}) {
  return (
    <div className="bg-white rounded-2xl border-2 border-brand-orange/20 p-5 shadow-sm hover:shadow-md transition-shadow">
      <p className="text-sm font-medium text-brand-brown/70">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${accent}`}>{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PENDIENTE: "bg-amber-100 text-amber-800",
    PARCIAL: "bg-orange-100 text-orange-800",
    VENCIDA: "bg-red-100 text-red-800",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[status] ?? "bg-slate-100 text-slate-700"}`}>
      {status}
    </span>
  );
}

export default async function DashboardPage() {
  const business = await getCurrentBusiness();
  if (!business) return <p className="text-slate-500">Sin negocio asignado</p>;

  const d = await getDashboardData(business.id);

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div>
        <h1 className="text-2xl font-bold text-brand-brown">
          Dashboard · <span className="text-brand-red">{business.name}</span>
        </h1>
        <p className="text-sm text-slate-500">
          Resumen financiero en tiempo real
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi
          label="Por cobrar"
          value={fmt(d.cobrar.saldo)}
          sub={`${d.cobrar.count} facturas activas`}
          accent="text-emerald-600"
        />
        <Kpi
          label="Por pagar"
          value={fmt(d.pagar.saldo)}
          sub={`${d.pagar.count} facturas activas`}
          accent="text-rose-600"
        />
        <Kpi
          label="Flujo neto"
          value={fmt(d.flujoNeto)}
          sub={d.flujoNeto >= 0 ? "Positivo ✓" : "Negativo ⚠"}
          accent={d.flujoNeto >= 0 ? "text-brand-brown" : "text-brand-red"}
        />
        <Kpi
          label="Vencidas +90d"
          value={fmt(d.agingCobrar.d90plus + d.agingPagar.d90plus)}
          sub="Riesgo alto"
          accent="text-brand-red"
        />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-2xl border-2 border-brand-orange/20 p-5 shadow-sm">
          <h2 className="font-semibold text-brand-brown mb-2">
            Flujo de caja · últimos 6 meses
          </h2>
          <MonthlyFlowChart data={d.monthlyFlow} />
        </div>
        <div className="bg-white rounded-2xl border-2 border-brand-orange/20 p-5 shadow-sm">
          <h2 className="font-semibold text-brand-brown mb-2">
            Aging por cobrar
          </h2>
          <AgingChart data={d.agingCobrar} />
        </div>
      </div>

      {/* Próximos vencimientos + Top terceros */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border-2 border-brand-orange/20 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-brand-brown">Próximos vencimientos</h2>
            <Link href="/cuentas-por-cobrar" className="text-xs text-brand-red hover:underline">
              Ver todo →
            </Link>
          </div>
          {d.nextDue.length === 0 ? (
            <p className="text-sm text-slate-500">Sin vencimientos próximos</p>
          ) : (
            <ul className="divide-y divide-brand-orange/10">
              {d.nextDue.map((i) => {
                const days = daysUntil(i.dueDate);
                return (
                  <li key={i.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate text-brand-brown">
                        {i.thirdParty}
                      </p>
                      <p className="text-xs text-slate-500">
                        {i.number} · {i.type === "COBRAR" ? "Cobrar" : "Pagar"} ·{" "}
                        {fmtDate(i.dueDate)}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold">{fmt(i.amount)}</p>
                      <p className={`text-xs font-medium ${days < 0 ? "text-red-600" : days <= 7 ? "text-amber-600" : "text-emerald-600"}`}>
                        {days < 0 ? `${Math.abs(days)}d vencida` : `en ${days}d`}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-2xl border-2 border-brand-orange/20 p-5 shadow-sm">
            <h2 className="font-semibold text-brand-brown mb-3">Top deudores</h2>
            <ul className="space-y-2">
              {d.topDebtors.length === 0 && (
                <p className="text-sm text-slate-500">Sin datos</p>
              )}
              {d.topDebtors.map((t, i) => (
                <li key={i} className="flex items-center justify-between text-sm">
                  <span className="truncate text-brand-brown">{t.name}</span>
                  <span className="font-semibold text-brand-red">{fmt(t.saldo)}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white rounded-2xl border-2 border-brand-orange/20 p-5 shadow-sm">
            <h2 className="font-semibold text-brand-brown mb-3">Top acreedores</h2>
            <ul className="space-y-2">
              {d.topCreditors.length === 0 && (
                <p className="text-sm text-slate-500">Sin datos</p>
              )}
              {d.topCreditors.map((t, i) => (
                <li key={i} className="flex items-center justify-between text-sm">
                  <span className="truncate text-brand-brown">{t.name}</span>
                  <span className="font-semibold text-brand-orange">{fmt(t.saldo)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Aging pagar resumido */}
      <div className="bg-white rounded-2xl border-2 border-brand-orange/20 p-5 shadow-sm">
        <h2 className="font-semibold text-brand-brown mb-3">Aging por pagar</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: "Corriente", value: d.agingPagar.corriente, color: "text-emerald-600" },
            { label: "1-30 días", value: d.agingPagar.d1_30, color: "text-amber-600" },
            { label: "31-60 días", value: d.agingPagar.d31_60, color: "text-orange-600" },
            { label: "61-90 días", value: d.agingPagar.d61_90, color: "text-rose-600" },
            { label: "+90 días", value: d.agingPagar.d90plus, color: "text-red-700" },
          ].map((b) => (
            <div key={b.label} className="text-center p-3 rounded-xl bg-brand-cream/40">
              <p className="text-xs text-brand-brown/70">{b.label}</p>
              <p className={`text-lg font-bold ${b.color}`}>{fmt(b.value)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
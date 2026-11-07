"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { exportToExcel } from "@/lib/excel";
import { fmt } from "@/lib/format";

type Row = {
  id: string;
  name: string;
  docType: string;
  docNumber: string;
  saldo: number;
  corriente: number;
  d1_30: number;
  d31_60: number;
  d61_90: number;
  d90plus: number;
};

export function CuentasPorCobrarReport({
  businessName,
  rows,
  totales,
}: {
  businessName: string;
  rows: Row[];
  totales: Omit<Row, "id" | "name" | "docType" | "docNumber">;
}) {
    async function onExport() {
    const columns = [
      { header: "Cliente", key: "name", width: 30 },
      { header: "Documento", key: "documento", width: 18 },
      { header: "Saldo", key: "saldo", width: 15 },
      { header: "Corriente", key: "corriente", width: 15 },
      { header: "1-30 días", key: "d1_30", width: 15 },
      { header: "31-60 días", key: "d31_60", width: 15 },
      { header: "61-90 días", key: "d61_90", width: 15 },
      { header: "+90 días", key: "d90plus", width: 15 },
    ];

    const data = rows.map((r) => ({
      name: r.name,
      documento: `${r.docType} ${r.docNumber}`,
      saldo: r.saldo,
      corriente: r.corriente,
      d1_30: r.d1_30,
      d31_60: r.d31_60,
      d61_90: r.d61_90,
      d90plus: r.d90plus,
    }));

    data.push({
      name: "TOTAL",
      documento: "",
      saldo: totales.saldo,
      corriente: totales.corriente,
      d1_30: totales.d1_30,
      d31_60: totales.d31_60,
      d61_90: totales.d61_90,
      d90plus: totales.d90plus,
    });

    await exportToExcel(
      "CxC_por_tercero",
      "Cuentas por cobrar",
      "Reporte de Cuentas por Cobrar (Aging)",
      businessName,
      columns,
      data
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div>
          <Link href="/informes" className="text-sm text-brand-red hover:underline">
            ← Volver a informes
          </Link>
          <h1 className="text-2xl font-bold text-brand-brown mt-1">
            Cuentas por cobrar por tercero
          </h1>
          <p className="text-sm text-slate-500">
            {businessName} · Aging analysis
          </p>
        </div>
        <Button
          onClick={onExport}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          ⬇ Exportar a Excel
        </Button>
      </div>

      {/* Tarjetas resumen */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card label="Saldo total" value={fmt(totales.saldo)} accent="text-brand-brown" />
        <Card label="Corriente" value={fmt(totales.corriente)} accent="text-emerald-600" />
        <Card label="1-30 días" value={fmt(totales.d1_30)} accent="text-amber-600" />
        <Card label="31-60 días" value={fmt(totales.d31_60)} accent="text-orange-600" />
        <Card label="+60 días" value={fmt(totales.d61_90 + totales.d90plus)} accent="text-red-600" />
      </div>

      <div className="bg-white rounded-2xl border-2 border-brand-orange/20 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-brand-cream/50 text-left text-brand-brown">
              <tr>
                <th className="p-3">Cliente</th>
                <th className="p-3">Documento</th>
                <th className="p-3 text-right">Saldo</th>
                <th className="p-3 text-right">Corriente</th>
                <th className="p-3 text-right">1-30</th>
                <th className="p-3 text-right">31-60</th>
                <th className="p-3 text-right">61-90</th>
                <th className="p-3 text-right">+90</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-brand-orange/10 hover:bg-brand-cream/20">
                  <td className="p-3">
                    <Link
                      href={`/terceros/${r.id}`}
                      className="font-medium text-brand-brown hover:text-brand-red hover:underline"
                    >
                      {r.name}
                    </Link>
                  </td>
                  <td className="p-3 font-mono text-xs">{r.docType} {r.docNumber}</td>
                  <td className="p-3 text-right font-semibold text-emerald-700">{fmt(r.saldo)}</td>
                  <td className="p-3 text-right">{r.corriente > 0 ? fmt(r.corriente) : "—"}</td>
                  <td className="p-3 text-right text-amber-700">{r.d1_30 > 0 ? fmt(r.d1_30) : "—"}</td>
                  <td className="p-3 text-right text-orange-700">{r.d31_60 > 0 ? fmt(r.d31_60) : "—"}</td>
                  <td className="p-3 text-right text-rose-700">{r.d61_90 > 0 ? fmt(r.d61_90) : "—"}</td>
                  <td className="p-3 text-right text-red-700">{r.d90plus > 0 ? fmt(r.d90plus) : "—"}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-slate-500">
                    No hay cuentas por cobrar pendientes
                  </td>
                </tr>
              )}
              {rows.length > 0 && (
                <tr className="border-t-2 border-brand-orange/30 bg-brand-cream/30 font-semibold">
                  <td className="p-3" colSpan={2}>TOTAL</td>
                  <td className="p-3 text-right text-emerald-700">{fmt(totales.saldo)}</td>
                  <td className="p-3 text-right">{fmt(totales.corriente)}</td>
                  <td className="p-3 text-right">{fmt(totales.d1_30)}</td>
                  <td className="p-3 text-right">{fmt(totales.d31_60)}</td>
                  <td className="p-3 text-right">{fmt(totales.d61_90)}</td>
                  <td className="p-3 text-right text-red-700">{fmt(totales.d90plus)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Card({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="bg-white rounded-xl border-2 border-brand-orange/20 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`text-lg font-bold ${accent}`}>{value}</p>
    </div>
  );
}
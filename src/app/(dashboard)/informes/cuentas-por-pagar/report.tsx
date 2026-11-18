"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { exportToExcel } from "@/lib/excel";
import { fmt, fmtDate } from "@/lib/format";

type DetalleRow = {
  id: string; number: string; thirdPartyName: string; docType: string; docNumber: string;
  issueDate: string; dueDate: string; amount: number; paidAmount: number; saldo: number; status: string;
  payments: { id: string; amount: number; date: string; method: string | null; reference: string | null }[];
};

type ResumenRow = {
  id: string; name: string; docType: string; docNumber: string; saldo: number; totalAbonado: number;
  corriente: number; d1_30: number; d31_60: number; d61_90: number; d90plus: number;
};

type Totales = {
  saldo: number; totalAbonado: number; corriente: number; d1_30: number; d31_60: number; d61_90: number; d90plus: number;
};

export function CuentasPorPagarReport({
  businessName, logoUrl, detallado, resumido, totalesResumido
}: {
  businessName: string; logoUrl: string; detallado: DetalleRow[]; resumido: ResumenRow[]; totalesResumido: Totales;
}) {
  const [view, setView] = useState<"resumido" | "detallado">("resumido");
  const [selectedParty, setSelectedParty] = useState<string>("");

  // Datos filtrados según el tercero seleccionado
  const filteredResumido = selectedParty
    ? resumido.filter((r) => r.id === selectedParty)
    : resumido;

  const filteredDetallado = selectedParty
    ? detallado.filter((d) => d.thirdPartyName === resumido.find(r => r.id === selectedParty)?.name)
    : detallado;

  const filteredTotales = selectedParty
    ? filteredResumido.reduce((acc, r) => ({
        saldo: acc.saldo + r.saldo,
        totalAbonado: acc.totalAbonado + r.totalAbonado,
        corriente: acc.corriente + r.corriente,
        d1_30: acc.d1_30 + r.d1_30,
        d31_60: acc.d31_60 + r.d31_60,
        d61_90: acc.d61_90 + r.d61_90,
        d90plus: acc.d90plus + r.d90plus,
      }), { saldo: 0, totalAbonado: 0, corriente: 0, d1_30: 0, d31_60: 0, d61_90: 0, d90plus: 0 })
    : totalesResumido;

  async function onExportResumido() {
    const columns = [
      { header: "Cliente", key: "name", width: 30 },
      { header: "Documento", key: "documento", width: 18 },
      { header: "Total Abonado", key: "totalAbonado", width: 18 },
      { header: "Saldo Pendiente", key: "saldo", width: 18 },
      { header: "Corriente", key: "corriente", width: 15 },
      { header: "1-30 días", key: "d1_30", width: 15 },
      { header: "31-60 días", key: "d31_60", width: 15 },
      { header: "61-90 días", key: "d61_90", width: 15 },
      { header: "+90 días", key: "d90plus", width: 15 },
    ];
    const data = filteredResumido.map(r => ({
      name: r.name, documento: `${r.docType} ${r.docNumber}`, 
      totalAbonado: r.totalAbonado,
      saldo: r.saldo,
      corriente: r.corriente, d1_30: r.d1_30, d31_60: r.d31_60, d61_90: r.d61_90, d90plus: r.d90plus,
    }));
    data.push({
      name: "TOTAL", documento: "", 
      totalAbonado: filteredTotales.totalAbonado,
      saldo: filteredTotales.saldo, corriente: filteredTotales.corriente,
      d1_30: filteredTotales.d1_30, d31_60: filteredTotales.d31_60, d61_90: filteredTotales.d61_90, d90plus: filteredTotales.d90plus,
    });
    await exportToExcel("CxC_Resumido", "CxC Resumido", "Reporte Resumido Cuentas por Pagar", businessName, columns, data, logoUrl);
  }

  async function onExportDetallado() {
    const columns = [
      { header: "Factura", key: "number", width: 15 },
      { header: "Cliente", key: "thirdPartyName", width: 30 },
      { header: "Emisión", key: "issueDate", width: 15 },
      { header: "Vencimiento", key: "dueDate", width: 15 },
      { header: "Total", key: "amount", width: 15 },
      { header: "Abonos", key: "abonosText", width: 40 },
      { header: "Total Abonado", key: "paidAmount", width: 15 },
      { header: "Saldo", key: "saldo", width: 15 },
      { header: "Estado", key: "status", width: 12 },
    ];
    
    const data = filteredDetallado.map(d => {
      const abonosText = d.payments.map(p => 
        `${fmtDate(p.date)}: ${fmt(p.amount)} (${p.method || 'N/A'})`
      ).join(" | ");

      return {
        ...d,
        issueDate: fmtDate(d.issueDate),
        dueDate: fmtDate(d.dueDate),
        abonosText: abonosText || "Sin abonos",
      };
    });
    await exportToExcel("CxC_Detallado", "CxC Detallado", "Reporte Detallado Cuentas por Pagar", businessName, columns, data, logoUrl);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div>
          <Link href="/informes" className="text-sm text-brand-red hover:underline">← Volver a informes</Link>
          <h1 className="text-2xl font-bold text-brand-brown mt-1">Cuentas por Pagar</h1>
          <p className="text-sm text-slate-500">{businessName}</p>
        </div>
        
        <div className="flex bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setView("resumido")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${view === "resumido" ? "bg-white text-brand-brown shadow-sm" : "text-slate-500 hover:text-brand-brown"}`}
          >
            Resumido (Aging)
          </button>
          <button
            onClick={() => setView("detallado")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${view === "detallado" ? "bg-white text-brand-brown shadow-sm" : "text-slate-500 hover:text-brand-brown"}`}
          >
            Detallado (Facturas)
          </button>
        </div>
      </div>

      {/* Selector de Tercero */}
      <div className="flex items-center gap-2 bg-white p-3 rounded-xl border-2 border-brand-orange/20 shadow-sm">
        <span className="text-sm font-medium text-brand-brown">Filtrar por cliente:</span>
        <select
          value={selectedParty}
          onChange={(e) => setSelectedParty(e.target.value)}
          className="border border-brand-orange/40 rounded-lg px-3 py-1.5 text-sm bg-white text-brand-brown"
        >
          <option value="">Todos los terceros</option>
          {resumido.map((r) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
      </div>

      {view === "resumido" ? (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={onExportResumido} className="bg-emerald-600 hover:bg-emerald-700 text-white">⬇ Exportar Resumido</Button>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Card label="Saldo total" value={fmt(filteredTotales.saldo)} accent="text-brand-brown" />
            <Card label="Total Abonado" value={fmt(filteredTotales.totalAbonado)} accent="text-emerald-600" />
            <Card label="Corriente" value={fmt(filteredTotales.corriente)} accent="text-emerald-600" />
            <Card label="1-30 días" value={fmt(filteredTotales.d1_30)} accent="text-amber-600" />
            <Card label="+30 días" value={fmt(filteredTotales.d31_60 + filteredTotales.d61_90 + filteredTotales.d90plus)} accent="text-red-600" />
          </div>

          <div className="bg-white rounded-2xl border-2 border-brand-orange/20 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-brand-cream/50 text-left text-brand-brown">
                  <tr>
                    <th className="p-3">Cliente</th>
                    <th className="p-3">Documento</th>
                    <th className="p-3 text-right">Total Abonado</th>
                    <th className="p-3 text-right">Saldo Pendiente</th>
                    <th className="p-3 text-right">Corriente</th>
                    <th className="p-3 text-right">1-30</th>
                    <th className="p-3 text-right">31-60</th>
                    <th className="p-3 text-right">61-90</th>
                    <th className="p-3 text-right">+90</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredResumido.map((r) => (
                    <tr key={r.id} className="border-t border-brand-orange/10 hover:bg-brand-cream/20">
                      <td className="p-3 font-medium text-brand-brown">{r.name}</td>
                      <td className="p-3 font-mono text-xs">{r.docType} {r.docNumber}</td>
                      <td className="p-3 text-right text-emerald-600 font-medium">{r.totalAbonado > 0 ? fmt(r.totalAbonado) : "—"}</td>
                      <td className="p-3 text-right font-semibold text-emerald-700">{fmt(r.saldo)}</td>
                      <td className="p-3 text-right">{r.corriente > 0 ? fmt(r.corriente) : "—"}</td>
                      <td className="p-3 text-right text-amber-700">{r.d1_30 > 0 ? fmt(r.d1_30) : "—"}</td>
                      <td className="p-3 text-right text-orange-700">{r.d31_60 > 0 ? fmt(r.d31_60) : "—"}</td>
                      <td className="p-3 text-right text-rose-700">{r.d61_90 > 0 ? fmt(r.d61_90) : "—"}</td>
                      <td className="p-3 text-right text-red-700">{r.d90plus > 0 ? fmt(r.d90plus) : "—"}</td>
                    </tr>
                  ))}
                  {filteredResumido.length === 0 && (
                    <tr>
                      <td colSpan={9} className="p-6 text-center text-slate-500">No hay cuentas por Pagar pendientes</td>
                    </tr>
                  )}
                  {filteredResumido.length > 0 && (
                    <tr className="border-t-2 border-brand-orange/30 bg-brand-cream/30 font-semibold">
                      <td className="p-3" colSpan={2}>TOTAL</td>
                      <td className="p-3 text-right text-emerald-600">{fmt(filteredTotales.totalAbonado)}</td>
                      <td className="p-3 text-right text-emerald-700">{fmt(filteredTotales.saldo)}</td>
                      <td className="p-3 text-right">{fmt(filteredTotales.corriente)}</td>
                      <td className="p-3 text-right">{fmt(filteredTotales.d1_30)}</td>
                      <td className="p-3 text-right">{fmt(filteredTotales.d31_60)}</td>
                      <td className="p-3 text-right">{fmt(filteredTotales.d61_90)}</td>
                      <td className="p-3 text-right text-red-700">{fmt(filteredTotales.d90plus)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={onExportDetallado} className="bg-emerald-600 hover:bg-emerald-700 text-white">⬇ Exportar Detallado</Button>
          </div>
          <div className="bg-white rounded-2xl border-2 border-brand-orange/20 overflow-hidden shadow-sm">
             <div className="overflow-x-auto">
               <table className="w-full text-sm">
                 <thead className="bg-brand-cream/50 text-left text-brand-brown">
                   <tr>
                     <th className="p-3">Factura</th>
                     <th className="p-3">Cliente</th>
                     <th className="p-3">Emisión</th>
                     <th className="p-3">Vencimiento</th>
                     <th className="p-3 text-right">Total</th>
                     <th className="p-3 text-right">Abonado</th>
                     <th className="p-3 text-right">Saldo</th>
                     <th className="p-3">Estado</th>
                   </tr>
                 </thead>
                 <tbody>
                   {filteredDetallado.map((d) => (
                     <tr key={d.id} className="border-t border-brand-orange/10 hover:bg-brand-cream/20">
                       <td className="p-3 font-mono text-xs">
                         {d.number}
                         {d.payments.length > 0 && (
                           <div className="text-[10px] text-slate-500 mt-1">
                             {d.payments.map((p) => (
                               <div key={p.id}>{fmtDate(p.date)}: {fmt(p.amount)}</div>
                             ))}
                           </div>
                         )}
                       </td>
                       <td className="p-3">{d.thirdPartyName}</td>
                       <td className="p-3">{fmtDate(d.issueDate)}</td>
                       <td className="p-3">{fmtDate(d.dueDate)}</td>
                       <td className="p-3 text-right">{fmt(d.amount)}</td>
                       <td className="p-3 text-right font-medium text-emerald-600">{d.paidAmount > 0 ? fmt(d.paidAmount) : "—"}</td>
                       <td className="p-3 text-right font-semibold text-emerald-700">{fmt(d.saldo)}</td>
                       <td className="p-3">
                         <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">{d.status}</span>
                       </td>
                     </tr>
                   ))}
                   {filteredDetallado.length === 0 && (
                     <tr><td colSpan={8} className="p-6 text-center text-slate-500">No hay facturas pendientes</td></tr>
                   )}
                 </tbody>
               </table>
             </div>
          </div>
        </div>
      )}
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
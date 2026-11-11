import { getCurrentBusiness } from "@/lib/current-business";
import { prisma } from "@/lib/prisma";
import { agingFromInvoices } from "@/lib/aging";
import { CuentasPorPagarReport } from "./report";

export const instant = false;

export default async function CuentasPorPagarReportPage() {
  const business = await getCurrentBusiness();
  if (!business) return <p>Sin negocio activo</p>;

  const [invoices, configs] = await Promise.all([
    prisma.invoice.findMany({
      where: {
        businessId: business.id,
        type: "PAGAR",
        status: { notIn: ["PAGADA", "ANULADA"] },
      },
      include: { 
        thirdParty: true,
        payments: { orderBy: { date: "desc" } } // <-- Traemos los pagos
      },
      orderBy: { dueDate: "asc" },
    }),
    prisma.appConfig.findMany({ where: { businessId: business.id } })
  ]);

  const configMap = configs.reduce((acc, curr) => {
    acc[curr.key] = curr.value;
    return acc;
  }, {} as Record<string, string>);

  const reportConfig = {
    tradeName: configMap["trade_name"] || business.name,
    logoUrl: configMap["logo_url"] || "",
  };

  // 1. Datos para el reporte detallado
  const detallado = invoices.map(inv => ({
    id: inv.id,
    number: inv.number,
    thirdPartyName: inv.thirdParty.name,
    docType: inv.thirdParty.docType,
    docNumber: inv.thirdParty.docNumber,
    issueDate: inv.issueDate.toISOString(),
    dueDate: inv.dueDate.toISOString(),
    amount: Number(inv.amount),
    paidAmount: Number(inv.paidAmount),
    saldo: Number(inv.amount) - Number(inv.paidAmount),
    status: inv.status,
    payments: inv.payments.map(p => ({ // <-- Abonos por factura
      id: p.id,
      amount: Number(p.amount),
      date: p.date.toISOString(),
      method: p.method,
      reference: p.reference
    }))
  }));

  // 2. Datos para el reporte resumido
  const map = new Map<string, any>();
  for (const inv of invoices) {
    const key = inv.thirdPartyId;
    if (!map.has(key)) {
      map.set(key, {
        id: inv.thirdPartyId,
        name: inv.thirdParty.name,
        docType: inv.thirdParty.docType,
        docNumber: inv.thirdParty.docNumber,
        invoices: [],
      });
    }
    map.get(key)!.invoices.push(inv);
  }

  const resumido = Array.from(map.values()).map((p: any) => {
    const saldo = p.invoices.reduce((s: number, i: any) => s + Number(i.amount) - Number(i.paidAmount), 0);
    const totalAbonado = p.invoices.reduce((s: number, i: any) => s + Number(i.paidAmount), 0); // <-- Total abonado
    const buckets = agingFromInvoices(p.invoices);
    return { 
      id: p.id, 
      name: p.name, 
      docType: p.docType, 
      docNumber: p.docNumber, 
      saldo, 
      totalAbonado, 
      ...buckets 
    };
  });
  resumido.sort((a: any, b: any) => b.saldo - a.saldo);

  // 3. Cálculo de totales
  const totalesResumido = resumido.reduce(
    (acc: any, r: any) => ({
      saldo: acc.saldo + r.saldo,
      totalAbonado: acc.totalAbonado + r.totalAbonado,
      corriente: acc.corriente + r.corriente,
      d1_30: acc.d1_30 + r.d1_30,
      d31_60: acc.d31_60 + r.d31_60,
      d61_90: acc.d61_90 + r.d61_90,
      d90plus: acc.d90plus + r.d90plus,
    }),
    { saldo: 0, totalAbonado: 0, corriente: 0, d1_30: 0, d31_60: 0, d61_90: 0, d90plus: 0 }
  );

  return (
    <CuentasPorPagarReport
      businessName={reportConfig.tradeName}
      logoUrl={reportConfig.logoUrl}
      detallado={detallado}
      resumido={resumido}
      totalesResumido={totalesResumido}
    />
  );
}
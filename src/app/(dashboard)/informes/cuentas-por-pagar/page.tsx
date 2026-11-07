import { getCurrentBusiness } from "@/lib/current-business";
import { prisma } from "@/lib/prisma";
import { agingFromInvoices } from "@/lib/aging";
import { CuentasPorPagarReport } from "./report";

export const instant = false;

export default async function CuentasPorPagarReportPage() {
  const business = await getCurrentBusiness();
  if (!business) return <p>Sin negocio activo</p>;

  const invoices = await prisma.invoice.findMany({
    where: {
      businessId: business.id,
      type: "PAGAR",
      status: { notIn: ["PAGADA", "ANULADA"] },
    },
    include: { thirdParty: true },
  });

  const map = new Map<string, {
    id: string;
    name: string;
    docType: string;
    docNumber: string;
    invoices: typeof invoices;
  }>();

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

  const rows = Array.from(map.values()).map((p) => {
    const saldo = p.invoices.reduce(
      (s, i) => s + Number(i.amount) - Number(i.paidAmount),
      0
    );
    const buckets = agingFromInvoices(p.invoices);
    return {
      id: p.id,
      name: p.name,
      docType: p.docType,
      docNumber: p.docNumber,
      saldo,
      ...buckets,
    };
  });

  rows.sort((a, b) => b.saldo - a.saldo);

  const totales = rows.reduce(
    (acc, r) => ({
      saldo: acc.saldo + r.saldo,
      corriente: acc.corriente + r.corriente,
      d1_30: acc.d1_30 + r.d1_30,
      d31_60: acc.d31_60 + r.d31_60,
      d61_90: acc.d61_90 + r.d61_90,
      d90plus: acc.d90plus + r.d90plus,
    }),
    { saldo: 0, corriente: 0, d1_30: 0, d31_60: 0, d61_90: 0, d90plus: 0 }
  );

  return (
    <CuentasPorPagarReport
      businessName={business.name}
      rows={rows}
      totales={totales}
    />
  );
}
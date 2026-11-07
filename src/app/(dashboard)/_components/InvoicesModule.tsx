// Firma que usarás tanto en /cuentas-por-cobrar como /cuentas-por-pagar
<InvoicesModule type="COBRAR" title="Cuentas por cobrar" />
<InvoicesModule type="PAGAR" title="Cuentas por pagar" />

import { prisma } from "@/lib/prisma";
import { getCurrentBusiness } from "@/lib/current-business";
import { NewInvoiceButton } from "./NewInvoiceButton";
import { PaymentDialog } from "./PaymentDialog";
import { fmt } from "@/lib/format";

export async function InvoicesModule({
  type,
  title,
}: {
  type: "COBRAR" | "PAGAR";
  title: string;
}) {
  const business = await getCurrentBusiness();
  if (!business) return <p>Sin negocio asignado</p>;

  const invoices = await prisma.invoice.findMany({
    where: { businessId: business.id, type, status: { not: "ANULADA" } },
    include: { thirdParty: true },
    orderBy: { dueDate: "asc" },
  });

  const total = invoices.reduce(
    (s, i) => s + Number(i.amount) - Number(i.paidAmount),
    0
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{title}</h1>
          <p className="text-sm text-slate-500">
            Saldo pendiente: <strong>{fmt(total)}</strong>
          </p>
        </div>
        <NewInvoiceButton type={type} />
      </div>
      <div className="bg-white border rounded">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left">
            <tr>
              <th className="p-3">Número</th>
              <th className="p-3">Tercero</th>
              <th className="p-3">Emisión</th>
              <th className="p-3">Vencimiento</th>
              <th className="p-3 text-right">Total</th>
              <th className="p-3 text-right">Saldo</th>
              <th className="p-3">Estado</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((i) => {
              const saldo = Number(i.amount) - Number(i.paidAmount);
              return (
                <tr key={i.id} className="border-t">
                  <td className="p-3 font-mono">{i.number}</td>
                  <td className="p-3">{i.thirdParty.name}</td>
                  <td className="p-3">{i.issueDate.toLocaleDateString("es-CO")}</td>
                  <td className="p-3">{i.dueDate.toLocaleDateString("es-CO")}</td>
                  <td className="p-3 text-right">{fmt(Number(i.amount))}</td>
                  <td className="p-3 text-right font-semibold">{fmt(saldo)}</td>
                  <td className="p-3">
                    <span className="text-xs px-2 py-1 rounded bg-slate-100">
                      {i.status}
                    </span>
                  </td>
                  <td className="p-3">
                    {saldo > 0 && (
                      <PaymentDialog invoiceId={i.id} max={saldo} />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
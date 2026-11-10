import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentBusiness } from "@/lib/current-business";
import { ReceivablesTable } from "./table";

export const instant = false;

export default async function ReceivablesPage() {
  const session = await auth();
  if (!session) return null;
  const business = await getCurrentBusiness();
  if (!business) return <p className="text-slate-500">Sin negocio asignado</p>;

  const [invoices, parties, configs] = await Promise.all([
    prisma.invoice.findMany({
      where: { businessId: business.id, type: "COBRAR" },
      include: { 
        thirdParty: { select: { id: true, name: true } },
        payments: { orderBy: { date: "desc" } } // <-- NUEVO: Incluir pagos
      },
      orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
    }),
    prisma.thirdParty.findMany({
      where: {
        businessId: business.id,
        active: true,
        type: { in: ["CLIENTE", "AMBOS"] },
      },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.appConfig.findMany({ where: { businessId: business.id } }),
  ]);

  const configMap = configs.reduce((acc, curr) => {
    acc[curr.key] = curr.value;
    return acc;
  }, {} as Record<string, string>);

  const defaults = {
    prefix: configMap["invoice_prefix"] ?? "FV-",
    dueDays: Number(configMap["default_due_days"] ?? 30),
  };

  const rows = invoices.map((i) => ({
    id: i.id,
    number: i.number,
    thirdPartyId: i.thirdParty.id,
    thirdPartyName: i.thirdParty.name,
    issueDate: i.issueDate.toISOString(),
    dueDate: i.dueDate.toISOString(),
    amount: Number(i.amount),
    paidAmount: Number(i.paidAmount),
    status: i.status,
    notes: i.notes,
    payments: i.payments.map(p => ({ // <-- NUEVO: Mapear pagos
      id: p.id,
      amount: Number(p.amount),
      date: p.date.toISOString(),
      method: p.method,
      reference: p.reference,
    })),
  }));

  const canEdit = (session.user as any).role !== "VIEWER";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-brand-brown">Cuentas por cobrar</h1>
        <p className="text-sm text-slate-500">
          Facturas pendientes de <span className="text-brand-red font-medium">{business.name}</span>.
          Cada empresa maneja sus propios clientes y facturas.
        </p>
      </div>
      <ReceivablesTable
        key={business.id}
        businessId={business.id}
        businessName={business.name}
        initial={rows}
        parties={parties}
        canEdit={canEdit}
        defaults={defaults}
      />
    </div>
  );
}
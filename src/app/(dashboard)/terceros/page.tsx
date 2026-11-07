import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentBusiness } from "@/lib/current-business";
import { ThirdPartiesTable } from "./table";

export default async function ThirdPartiesPage() {
  const session = await auth();
  if (!session) return null;
  const business = await getCurrentBusiness();
  if (!business) return <p className="text-slate-500">Sin negocio asignado</p>;

  const parties = await prisma.thirdParty.findMany({
    where: { businessId: business.id },
    orderBy: { name: "asc" },
    include: {
      invoices: {
        where: { status: { notIn: ["PAGADA", "ANULADA"] } },
        select: { type: true, amount: true, paidAmount: true },
      },
    },
  });

  const rows = parties.map((p) => {
    const saldoCobrar = p.invoices
      .filter((i) => i.type === "COBRAR")
      .reduce((s, i) => s + Number(i.amount) - Number(i.paidAmount), 0);
    const saldoPagar = p.invoices
      .filter((i) => i.type === "PAGAR")
      .reduce((s, i) => s + Number(i.amount) - Number(i.paidAmount), 0);
    return {
      id: p.id,
      type: p.type,
      docType: p.docType,
      docNumber: p.docNumber,
      name: p.name,
      email: p.email,
      phone: p.phone,
      address: p.address,
      active: p.active,
      invoicesCount: p.invoices.length,
      saldoCobrar,
      saldoPagar,
    };
  });

  const canEdit = (session.user as any).role !== "VIEWER";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-brand-brown">Terceros</h1>
        <p className="text-sm text-slate-500">
          Clientes y proveedores de {business.name}
        </p>
      </div>
      <ThirdPartiesTable initial={rows} canEdit={canEdit} />
    </div>
  );
}
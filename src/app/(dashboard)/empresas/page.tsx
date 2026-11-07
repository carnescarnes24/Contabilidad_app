import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { BusinessesTable } from "./table";

export default async function BusinessesPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if ((session.user as any).role !== "ADMIN") {
    return (
      <div className="text-brand-brown">
        Solo administradores pueden acceder a este módulo.
      </div>
    );
  }

  const businesses = await prisma.business.findMany({
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { invoices: true, thirdParties: true } } },
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-brand-brown">Empresas</h1>
        <p className="text-sm text-slate-500">
          Gestiona los negocios que administras en el sistema
        </p>
      </div>
      <BusinessesTable
        initial={businesses.map((b) => ({
          id: b.id,
          name: b.name,
          nit: b.nit,
          active: b.active,
          invoiceCount: b._count.invoices,
          thirdPartyCount: b._count.thirdParties,
          createdAt: b.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
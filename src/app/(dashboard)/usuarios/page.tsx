import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { UsersTable } from "./table";
import { redirect } from "next/navigation";

export const instant = false;

export default async function UsersPage() {
  const session = await auth();
  if (!session) redirect("/login");
  
  if ((session.user as any).role !== "ADMIN") {
    return <p className="text-brand-red font-medium">Acceso denegado. Solo administradores.</p>;
  }

  const [users, businesses] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "asc" },
      include: { businesses: { select: { businessId: true } } },
    }),
    prisma.business.findMany({
      where: { active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const rows = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    active: u.active,
    businessIds: u.businesses.map((b) => b.businessId),
  }));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-brand-brown">Gestión de Usuarios</h1>
        <p className="text-sm text-slate-500">
          Administra accesos, roles y empresas asignadas
        </p>
      </div>
      <UsersTable
        initial={rows}
        businesses={businesses}
        currentUserId={(session.user as any).id}
      />
    </div>
  );
}
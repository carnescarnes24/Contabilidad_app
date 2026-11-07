import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentBusiness } from "@/lib/current-business";
import { BusinessSwitcher } from "./_components/BusinessSwitcher";
import { UserMenu } from "./_components/UserMenu";

export const instant = false;

const nav = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/terceros", label: "Terceros" },
  { href: "/cuentas-por-cobrar", label: "Cuentas por cobrar" },
  { href: "/cuentas-por-pagar", label: "Cuentas por pagar" },
  { href: "/informes", label: "Informes" },
  { href: "/empresas", label: "Empresas", adminOnly: true },
  { href: "/configuracion", label: "Configuración" },
  { href: "/usuarios", label: "Usuarios", adminOnly: true },
];

export default async function DashboardLayout({
  children,
}: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  const role = (session.user as any).role as string;
  const userBusinesses = (session.user as any).businesses as string[];
  const businesses = await prisma.business.findMany({
    where: { id: { in: userBusinesses } },
    select: { id: true, name: true },
  });
  const current = await getCurrentBusiness();

  return (
    <div className="min-h-screen flex bg-[#fdfaf3]">
      <aside className="w-60 bg-white border-r-2 border-brand-orange/30 p-4 hidden md:flex md:flex-col">
        <h2 className="font-bold text-lg text-brand-red mb-6 flex items-center gap-2">
          <span>🥩</span> CxC / CxP
        </h2>
        <nav className="space-y-1 flex-1">
          {nav
            .filter((n) => !n.adminOnly || role === "ADMIN")
            .map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="block px-3 py-2 rounded-lg text-sm text-brand-brown hover:bg-brand-cream hover:text-brand-red transition-colors"
              >
                {n.label}
              </Link>
            ))}
        </nav>
      </aside>
      <div className="flex-1 flex flex-col">
        <header className="bg-white border-b-2 border-brand-gold/40 px-6 py-2.5 flex items-center justify-between shadow-sm">
          <BusinessSwitcher
            businesses={businesses}
            current={current?.id ?? businesses[0]?.id ?? ""}
          />
          <UserMenu
            name={session.user?.name ?? "Usuario"}
            email={session.user?.email ?? ""}
            role={role}
          />
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
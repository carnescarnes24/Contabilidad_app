import { getCurrentBusiness } from "@/lib/current-business";
import { prisma } from "@/lib/prisma";
import { ConfigForm } from "./form";
import { auth } from "@/auth";

export const instant = false;

export default async function ConfigPage() {
  const session = await auth();
  if (!session) return null;
  
  const business = await getCurrentBusiness();
  if (!business) return <p>Sin negocio activo</p>;

  const configs = await prisma.appConfig.findMany({
    where: { businessId: business.id },
  });

  const configMap = configs.reduce((acc, curr) => {
    acc[curr.key] = curr.value;
    return acc;
  }, {} as Record<string, string>);

  const canEdit = (session.user as any).role === "ADMIN";

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-brand-brown">Configuración</h1>
        <p className="text-sm text-slate-500">
          Ajustes operativos y de apariencia para <span className="text-brand-red font-medium">{business.name}</span>
        </p>
      </div>

      <ConfigForm
        key={business.id}
        initialData={{
          invoicePrefix: configMap["invoice_prefix"] ?? "FV-",
          payablePrefix: configMap["payable_prefix"] ?? "FP-",
          dueDays: configMap["default_due_days"] ?? "30",
          alertDays: configMap["alert_days_before"] ?? "7",
          alertEmail: configMap["alert_email"] ?? "",
          enableEmailAlerts: configMap["enable_email_alerts"] === "true",
          tradeName: configMap["trade_name"] ?? business.name,
          logoUrl: configMap["logo_url"] ?? "",
        }}
        canEdit={canEdit}
      />
    </div>
  );
}
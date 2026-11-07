"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentBusiness } from "@/lib/current-business";
import { revalidatePath } from "next/cache";
import { z } from "zod";

async function requireAdmin() {
  const session = await auth();
  if (!session) throw new Error("No autenticado");
  if ((session.user as any).role !== "ADMIN") {
    throw new Error("Solo administradores pueden cambiar la configuración");
  }
  return session;
}

const configSchema = z.object({
  // Facturación
  invoicePrefix: z.string().min(1),
  payablePrefix: z.string().min(1),
  dueDays: z.coerce.number().min(1).max(365),
  alertDays: z.coerce.number().min(1).max(90),
  
  // Notificaciones
  alertEmail: z.string().email().optional().or(z.literal("")),
  enableEmailAlerts: z.string().optional(), // "true" o "false"

  // Apariencia
  tradeName: z.string().optional(),
  logoUrl: z.string().url().optional().or(z.literal("")),
});

export async function saveBusinessConfig(input: unknown) {
  await requireAdmin();
  const business = await getCurrentBusiness();
  if (!business) throw new Error("Sin negocio activo");

  const data = configSchema.parse(input);

  const configs = [
    { key: "invoice_prefix", value: data.invoicePrefix },
    { key: "payable_prefix", value: data.payablePrefix },
    { key: "default_due_days", value: data.dueDays.toString() },
    { key: "alert_days_before", value: data.alertDays.toString() },
    { key: "alert_email", value: data.alertEmail || "" },
    { key: "enable_email_alerts", value: data.enableEmailAlerts === "on" ? "true" : "false" },
    { key: "trade_name", value: data.tradeName || "" },
    { key: "logo_url", value: data.logoUrl || "" },
  ];

  // Transacción para guardar todo de golpe
  await prisma.$transaction(
    configs.map((cfg) =>
      prisma.appConfig.upsert({
        where: { businessId_key: { businessId: business.id, key: cfg.key } },
        update: { value: cfg.value },
        create: { businessId: business.id, key: cfg.key, value: cfg.value },
      })
    )
  );

  revalidatePath("/configuracion");
  revalidatePath("/dashboard");
}
"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const businessSchema = z.object({
  name: z.string().min(2, "Mínimo 2 caracteres"),
  nit: z.string().optional().or(z.literal("")),
});

async function requireAdmin() {
  const session = await auth();
  if (!session) throw new Error("No autenticado");
  if ((session.user as any).role !== "ADMIN") {
    throw new Error("Solo administradores pueden gestionar empresas");
  }
  return session;
}

export async function createBusiness(input: unknown) {
  const session = await requireAdmin();
  const data = businessSchema.parse(input);

  const business = await prisma.business.create({
    data: {
      name: data.name,
      nit: data.nit || null,
    },
  });

  // Asociar automáticamente al usuario creador
  await prisma.userBusiness.create({
    data: {
      userId: (session.user as any).id,
      businessId: business.id,
    },
  });

  revalidatePath("/empresas");
  revalidatePath("/dashboard");
  return business;
}

export async function updateBusiness(id: string, input: unknown) {
  await requireAdmin();
  const data = businessSchema.parse(input);
  await prisma.business.update({
    where: { id },
    data: { name: data.name, nit: data.nit || null },
  });
  revalidatePath("/empresas");
  revalidatePath("/dashboard");
}

export async function toggleBusiness(id: string) {
  await requireAdmin();
  const b = await prisma.business.findUnique({ where: { id } });
  if (!b) throw new Error("Empresa no encontrada");
  await prisma.business.update({
    where: { id },
    data: { active: !b.active },
  });
  revalidatePath("/empresas");
}
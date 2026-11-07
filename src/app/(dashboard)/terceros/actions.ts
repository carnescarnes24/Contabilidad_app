"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentBusiness } from "@/lib/current-business";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const schema = z.object({
  type: z.enum(["CLIENTE", "PROVEEDOR", "AMBOS"]),
  docType: z.string().min(1),
  docNumber: z.string().min(3),
  name: z.string().min(2),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
});

async function requireSession() {
  const session = await auth();
  if (!session) throw new Error("No autenticado");
  if ((session.user as any).role === "VIEWER") {
    throw new Error("No tienes permisos para modificar terceros");
  }
  return session;
}

export async function createThirdParty(input: unknown) {
  await requireSession();
  const business = await getCurrentBusiness();
  if (!business) throw new Error("Sin negocio activo");
  const data = schema.parse(input);

  const exists = await prisma.thirdParty.findFirst({
    where: { businessId: business.id, docNumber: data.docNumber },
  });
  if (exists) throw new Error("Ya existe un tercero con ese documento");

  await prisma.thirdParty.create({
    data: {
      ...data,
      email: data.email || null,
      phone: data.phone || null,
      address: data.address || null,
      businessId: business.id,
    },
  });

  revalidatePath("/terceros");
  revalidatePath("/dashboard");
}

export async function updateThirdParty(id: string, input: unknown) {
  await requireSession();
  const business = await getCurrentBusiness();
  if (!business) throw new Error("Sin negocio activo");
  const data = schema.parse(input);

  const exists = await prisma.thirdParty.findFirst({
    where: {
      businessId: business.id,
      docNumber: data.docNumber,
      NOT: { id },
    },
  });
  if (exists) throw new Error("Ya existe otro tercero con ese documento");

  await prisma.thirdParty.update({
    where: { id },
    data: {
      ...data,
      email: data.email || null,
      phone: data.phone || null,
      address: data.address || null,
    },
  });

  revalidatePath("/terceros");
  revalidatePath(`/terceros/${id}`);
}

export async function toggleThirdParty(id: string) {
  await requireSession();
  const party = await prisma.thirdParty.findUnique({ where: { id } });
  if (!party) throw new Error("Tercero no encontrado");

  await prisma.thirdParty.update({
    where: { id },
    data: { active: !party.active },
  });

  revalidatePath("/terceros");
}

export async function deleteThirdParty(id: string) {
  await requireSession();
  const business = await getCurrentBusiness();
  if (!business) throw new Error("Sin negocio activo");

  const party = await prisma.thirdParty.findFirst({
    where: { id, businessId: business.id },
    include: { _count: { select: { invoices: true } } },
  });
  if (!party) throw new Error("Tercero no encontrado");

  if (party._count.invoices > 0) {
    throw new Error(
      `No se puede eliminar: tiene ${party._count.invoices} factura(s) asociada(s). Desactívalo en su lugar.`
    );
  }

  await prisma.thirdParty.delete({ where: { id } });
  revalidatePath("/terceros");
}
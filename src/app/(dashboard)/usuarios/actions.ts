"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import bcrypt from "bcryptjs";

async function requireAdmin() {
  const session = await auth();
  if (!session) throw new Error("No autenticado");
  if ((session.user as any).role !== "ADMIN") {
    throw new Error("Solo administradores pueden gestionar usuarios");
  }
  return session;
}

const userSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6).optional().or(z.literal("")),
  role: z.enum(["ADMIN", "ACCOUNTANT", "VIEWER"]),
  businesses: z.array(z.string()),
});

export async function createUser(input: unknown) {
  await requireAdmin();
  const data = userSchema.parse(input);

  if (!data.password) throw new Error("La contraseña es requerida para nuevos usuarios");

  const exists = await prisma.user.findUnique({ where: { email: data.email } });
  if (exists) throw new Error("El correo ya está registrado");

  const hash = await bcrypt.hash(data.password, 10);

  await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      password: hash,
      role: data.role,
      businesses: {
        create: data.businesses.map((id) => ({ businessId: id })),
      },
    },
  });

  revalidatePath("/usuarios");
}

export async function updateUser(id: string, input: unknown) {
  await requireAdmin();
  const data = userSchema.parse(input);

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new Error("Usuario no encontrado");

  const updateData: any = {
    name: data.name,
    email: data.email,
    role: data.role,
  };

  if (data.password) {
    updateData.password = await bcrypt.hash(data.password, 10);
  }

  // Actualizar usuario y reasignar empresas (borrar anteriores y crear nuevas)
  await prisma.$transaction([
    prisma.user.update({
      where: { id },
      data: updateData,
    }),
    prisma.userBusiness.deleteMany({ where: { userId: id } }),
    prisma.userBusiness.createMany({
      data: data.businesses.map((bid) => ({ userId: id, businessId: bid })),
    }),
  ]);

  revalidatePath("/usuarios");
}

export async function toggleUserActive(id: string) {
  const session = await requireAdmin();
  
  if ((session.user as any).id === id) {
    throw new Error("No puedes desactivar tu propio usuario");
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new Error("Usuario no encontrado");

  await prisma.user.update({
    where: { id },
    data: { active: !user.active },
  });

  revalidatePath("/usuarios");
}
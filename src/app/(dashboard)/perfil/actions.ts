"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { revalidatePath } from "next/cache";

const profileSchema = z.object({
  name: z.string().min(2, "Mínimo 2 caracteres"),
  email: z.string().email("Email inválido"),
});

export async function updateProfile(input: unknown) {
  const session = await auth();
  if (!session) throw new Error("No autenticado");
  const data = profileSchema.parse(input);

  const exists = await prisma.user.findFirst({
    where: { email: data.email, NOT: { id: (session.user as any).id } },
  });
  if (exists) throw new Error("Ese email ya está en uso");

  await prisma.user.update({
    where: { id: (session.user as any).id },
    data,
  });
  revalidatePath("/perfil");
}

const passSchema = z
  .object({
    currentPassword: z.string().min(1, "Requerida"),
    newPassword: z.string().min(6, "Mínimo 6 caracteres"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

export async function changePassword(input: unknown) {
  const session = await auth();
  if (!session) throw new Error("No autenticado");
  const data = passSchema.parse(input);

  const user = await prisma.user.findUnique({
    where: { id: (session.user as any).id },
  });
  if (!user) throw new Error("Usuario no encontrado");

  const ok = await bcrypt.compare(data.currentPassword, user.password);
  if (!ok) throw new Error("Contraseña actual incorrecta");

  const hash = await bcrypt.hash(data.newPassword, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hash },
  });
}
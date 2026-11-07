import { cookies } from "next/headers";
import { auth } from "@/auth";
import { prisma } from "./prisma";

export async function getCurrentBusiness() {
  const session = await auth();
  if (!session) return null;

  const userBusinesses = (session.user as any).businesses as string[];
  const cookieStore = await cookies();
  const cookieId = cookieStore.get("businessId")?.value;

  const active =
    cookieId && userBusinesses.includes(cookieId)
      ? cookieId
      : userBusinesses[0];

  return prisma.business.findUnique({ where: { id: active } });
}
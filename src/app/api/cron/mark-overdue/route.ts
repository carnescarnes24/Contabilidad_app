import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const result = await prisma.invoice.updateMany({
    where: {
      status: { in: ["PENDIENTE", "PARCIAL"] },
      dueDate: { lt: new Date() },
    },
    data: { status: "VENCIDA" },
  });
  return NextResponse.json({ updated: result.count });
}
"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentBusiness } from "@/lib/current-business";
import { revalidatePath } from "next/cache";
import { z } from "zod";

async function requireSession() {
  const session = await auth();
  if (!session) throw new Error("No autenticado");
  if ((session.user as any).role === "VIEWER") {
    throw new Error("No tienes permisos para modificar facturas");
  }
  return session;
}

const invoiceSchema = z.object({
  thirdPartyId: z.string().min(1, "Selecciona un proveedor"),
  number: z.string().min(1, "Número requerido"),
  issueDate: z.coerce.date(),
  dueDate: z.coerce.date(),
  amount: z.coerce.number().positive("El monto debe ser mayor a 0"),
  notes: z.string().optional(),
});

export async function createPayable(input: unknown) {
  await requireSession();
  const business = await getCurrentBusiness();
  if (!business) throw new Error("Sin negocio activo");
  const data = invoiceSchema.parse(input);

  // Validar que el tercero es proveedor del negocio activo
  const party = await prisma.thirdParty.findFirst({
    where: {
      id: data.thirdPartyId,
      businessId: business.id,
      active: true,
      type: { in: ["PROVEEDOR", "AMBOS"] },
    },
  });
  if (!party) {
    throw new Error(
      "El proveedor seleccionado no pertenece a la empresa activa. Cambia de negocio o crea el proveedor en la empresa correcta."
    );
  }

  const exists = await prisma.invoice.findFirst({
    where: {
      businessId: business.id,
      type: "PAGAR",
      number: data.number,
    },
  });
  if (exists) throw new Error("Ya existe una factura por pagar con ese número");

  await prisma.invoice.create({
    data: {
      businessId: business.id,
      thirdPartyId: data.thirdPartyId,
      type: "PAGAR",
      number: data.number,
      issueDate: data.issueDate,
      dueDate: data.dueDate,
      amount: data.amount,
      notes: data.notes || null,
      status: data.dueDate < new Date() ? "VENCIDA" : "PENDIENTE",
    },
  });

  revalidatePath("/cuentas-por-pagar");
  revalidatePath("/dashboard");
  revalidatePath("/terceros");
}

export async function deleteInvoice(id: string) {
  await requireSession();
  const business = await getCurrentBusiness();
  if (!business) throw new Error("Sin negocio activo");

  const inv = await prisma.invoice.findFirst({
    where: { id, businessId: business.id, type: "PAGAR" },
    include: { _count: { select: { payments: true } } },
  });
  if (!inv) throw new Error("Factura no encontrada");

  if (inv._count.payments > 0) {
    throw new Error(
      "No se puede anular: la factura tiene pagos registrados."
    );
  }

  await prisma.invoice.update({
    where: { id },
    data: { status: "ANULADA" },
  });

  revalidatePath("/cuentas-por-pagar");
  revalidatePath("/dashboard");
}

const paymentSchema = z.object({
  amount: z.coerce.number().positive("El monto debe ser mayor a 0"),
  date: z.coerce.date(),
  method: z.string().optional(),
  reference: z.string().optional(),
});

export async function registerPayment(invoiceId: string, input: unknown) {
  const session = await requireSession();
  const business = await getCurrentBusiness();
  if (!business) throw new Error("Sin negocio activo");
  const data = paymentSchema.parse(input);

  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, businessId: business.id, type: "PAGAR" },
  });
  if (!invoice) throw new Error("Factura no encontrada");

  const saldo = Number(invoice.amount) - Number(invoice.paidAmount);
  if (data.amount > saldo + 0.01) {
    throw new Error(
      `El pago (${data.amount}) excede el saldo pendiente (${saldo})`
    );
  }

  const newPaid = Number(invoice.paidAmount) + data.amount;
  const isFullyPaid = Math.abs(newPaid - Number(invoice.amount)) < 0.01;
  const newStatus = isFullyPaid
    ? "PAGADA"
    : invoice.dueDate < new Date()
      ? "VENCIDA"
      : "PARCIAL";

  await prisma.$transaction([
    prisma.payment.create({
      data: {
        invoiceId,
        amount: data.amount,
        date: data.date,
        method: data.method || null,
        reference: data.reference || null,
        createdBy: (session.user as any).id,
      },
    }),
    prisma.invoice.update({
      where: { id: invoiceId },
      data: { paidAmount: newPaid, status: newStatus },
    }),
  ]);

  revalidatePath("/cuentas-por-pagar");
  revalidatePath("/dashboard");
  revalidatePath("/terceros");
}
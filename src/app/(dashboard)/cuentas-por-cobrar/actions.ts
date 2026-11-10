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
  thirdPartyId: z.string().min(1, "Selecciona un tercero"),
  number: z.string().min(1, "Número requerido"),
  issueDate: z.coerce.date(),
  dueDate: z.coerce.date(),
  amount: z.coerce.number().positive("El monto debe ser mayor a 0"),
  notes: z.string().optional(),
});

export async function createReceivable(input: unknown) {
  await requireSession();
  const business = await getCurrentBusiness();
  if (!business) throw new Error("Sin negocio activo");
  const data = invoiceSchema.parse(input);

  const exists = await prisma.invoice.findFirst({
    where: {
      businessId: business.id,
      type: "COBRAR",
      number: data.number,
    },
  });
  if (exists) throw new Error("Ya existe una factura con ese número");

  await prisma.invoice.create({
    data: {
      businessId: business.id,
      thirdPartyId: data.thirdPartyId,
      type: "COBRAR",
      number: data.number,
      issueDate: data.issueDate,
      dueDate: data.dueDate,
      amount: data.amount,
      notes: data.notes || null,
      status: data.dueDate < new Date() ? "VENCIDA" : "PENDIENTE",
    },
  });

  revalidatePath("/cuentas-por-cobrar");
  revalidatePath("/dashboard");
  revalidatePath("/terceros");
}

// --- NUEVO: Editar factura ---
const editSchema = z.object({
  number: z.string().min(1, "Número requerido"),
  issueDate: z.coerce.date(),
  dueDate: z.coerce.date(),
  amount: z.coerce.number().positive("El monto debe ser mayor a 0"),
  notes: z.string().optional(),
});

export async function updateInvoice(id: string, input: unknown) {
  await requireSession();
  const business = await getCurrentBusiness();
  if (!business) throw new Error("Sin negocio activo");
  
  const data = editSchema.parse(input);

  const invoice = await prisma.invoice.findFirst({
    where: { id, businessId: business.id, type: "COBRAR" },
    include: { _count: { select: { payments: true } } }
  });
  
  if (!invoice) throw new Error("Factura no encontrada");
  if (invoice._count.payments > 0 && Number(invoice.amount) !== data.amount) {
    throw new Error("No se puede cambiar el monto de una factura que ya tiene pagos registrados.");
  }

  // Verificar que el nuevo número no exista
  const exists = await prisma.invoice.findFirst({
    where: { businessId: business.id, type: "COBRAR", number: data.number, NOT: { id } },
  });
  if (exists) throw new Error("Ya existe otra factura con ese número");

  // Recalcular estado
  let newStatus = invoice.status;
  if (Number(invoice.paidAmount) >= data.amount) {
    newStatus = "PAGADA";
  } else if (Number(invoice.paidAmount) > 0) {
    newStatus = "PARCIAL";
  } else if (data.dueDate < new Date()) {
    newStatus = "VENCIDA";
  } else {
    newStatus = "PENDIENTE";
  }

  await prisma.invoice.update({
    where: { id },
    data: {
      number: data.number,
      issueDate: data.issueDate,
      dueDate: data.dueDate,
      amount: data.amount,
      notes: data.notes || null,
      status: newStatus
    },
  });

  revalidatePath("/cuentas-por-cobrar");
  revalidatePath("/dashboard");
}

export async function deleteInvoice(id: string) {
  await requireSession();
  const business = await getCurrentBusiness();
  if (!business) throw new Error("Sin negocio activo");

  const inv = await prisma.invoice.findFirst({
    where: { id, businessId: business.id, type: "COBRAR" },
    include: { _count: { select: { payments: true } } },
  });
  if (!inv) throw new Error("Factura no encontrada");

  if (inv._count.payments > 0) {
    throw new Error(
      "No se puede eliminar: la factura tiene pagos registrados. Anúlala en su lugar."
    );
  }

  await prisma.invoice.update({
    where: { id },
    data: { status: "ANULADA" },
  });

  revalidatePath("/cuentas-por-cobrar");
  revalidatePath("/dashboard");
}

const paymentSchema = z.object({
  amount: z.coerce.number().positive("El monto debe ser mayor a 0"),
  date: z.coerce.date(),
  method: z.string().optional(),
  reference: z.string().optional(),
});

export async function registerPayment(
  invoiceId: string,
  input: unknown
) {
  const session = await requireSession();
  const business = await getCurrentBusiness();
  if (!business) throw new Error("Sin negocio activo");
  const data = paymentSchema.parse(input);

  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, businessId: business.id, type: "COBRAR" },
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
      data: {
        paidAmount: newPaid,
        status: newStatus,
      },
    }),
  ]);

  revalidatePath("/cuentas-por-cobrar");
  revalidatePath("/dashboard");
  revalidatePath("/terceros");
}

// --- NUEVO: Eliminar un pago individual ---
export async function deletePayment(paymentId: string, invoiceId: string) {
  await requireSession();
  const business = await getCurrentBusiness();
  if (!business) throw new Error("Sin negocio activo");

  const payment = await prisma.payment.findFirst({
    where: { id: paymentId, invoiceId, invoice: { businessId: business.id, type: "COBRAR" } },
  });
  if (!payment) throw new Error("Pago no encontrado");

  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice) throw new Error("Factura no encontrada");

  const newPaid = Number(invoice.paidAmount) - Number(payment.amount);
  
  let newStatus = invoice.status;
  if (newPaid <= 0.01) {
    newStatus = invoice.dueDate < new Date() ? "VENCIDA" : "PENDIENTE";
  } else if (newPaid < Number(invoice.amount)) {
    newStatus = "PARCIAL";
  }

  await prisma.$transaction([
    prisma.payment.delete({ where: { id: paymentId } }),
    prisma.invoice.update({
      where: { id: invoiceId },
      data: { paidAmount: Math.max(0, newPaid), status: newStatus },
    }),
  ]);

  revalidatePath("/cuentas-por-cobrar");
  revalidatePath("/dashboard");
}
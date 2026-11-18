"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentBusiness } from "@/lib/current-business";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const parseSafeDate = (dateObj: Date) => {
  const isoStr = dateObj.toISOString().split('T')[0];
  return new Date(`${isoStr}T12:00:00`);
};

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
  try {
    await requireSession();
    const business = await getCurrentBusiness();
    if (!business) return { error: "Sin negocio activo" };
    
    const data = invoiceSchema.parse(input);

    const exists = await prisma.invoice.findFirst({
      where: { businessId: business.id, type: "COBRAR", number: data.number },
    });
    if (exists) return { error: "Ya existe una factura con ese número" };

    const safeIssueDate = parseSafeDate(data.issueDate);
    const safeDueDate = parseSafeDate(data.dueDate);

    await prisma.invoice.create({
      data: {
        businessId: business.id,
        thirdPartyId: data.thirdPartyId,
        type: "COBRAR",
        number: data.number,
        issueDate: safeIssueDate,
        dueDate: safeDueDate,
        amount: data.amount,
        notes: data.notes || null,
        status: safeDueDate < new Date() ? "VENCIDA" : "PENDIENTE",
      },
    });

    revalidatePath("/cuentas-por-cobrar");
    revalidatePath("/dashboard");
    revalidatePath("/terceros");
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Error al crear la factura" };
  }
}

const editSchema = z.object({
  number: z.string().min(1, "Número requerido"),
  issueDate: z.coerce.date(),
  dueDate: z.coerce.date(),
  amount: z.coerce.number().positive("El monto debe ser mayor a 0"),
  notes: z.string().optional(),
});

export async function updateInvoice(id: string, input: unknown) {
  try {
    await requireSession();
    const business = await getCurrentBusiness();
    if (!business) return { error: "Sin negocio activo" };
    
    const data = editSchema.parse(input);

    const invoice = await prisma.invoice.findFirst({
      where: { id, businessId: business.id, type: "COBRAR" },
      include: { _count: { select: { payments: true } } }
    });
    
    if (!invoice) return { error: "Factura no encontrada" };
    if (invoice._count.payments > 0 && Number(invoice.amount) !== data.amount) {
      return { error: "No se puede cambiar el monto de una factura que ya tiene pagos registrados." };
    }

    const exists = await prisma.invoice.findFirst({
      where: { businessId: business.id, type: "COBRAR", number: data.number, NOT: { id } },
    });
    if (exists) return { error: "Ya existe otra factura con ese número" };

    const safeIssueDate = parseSafeDate(data.issueDate);
    const safeDueDate = parseSafeDate(data.dueDate);

    let newStatus = invoice.status;
    if (Number(invoice.paidAmount) >= data.amount) {
      newStatus = "PAGADA";
    } else if (Number(invoice.paidAmount) > 0) {
      newStatus = "PARCIAL";
    } else if (safeDueDate < new Date()) {
      newStatus = "VENCIDA";
    } else {
      newStatus = "PENDIENTE";
    }

    await prisma.invoice.update({
      where: { id },
      data: {
        number: data.number,
        issueDate: safeIssueDate,
        dueDate: safeDueDate,
        amount: data.amount,
        notes: data.notes || null,
        status: newStatus
      },
    });

    revalidatePath("/cuentas-por-cobrar");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Error al actualizar la factura" };
  }
}

export async function deleteInvoice(id: string) {
  try {
    await requireSession();
    const business = await getCurrentBusiness();
    if (!business) return { error: "Sin negocio activo" };

    const inv = await prisma.invoice.findFirst({
      where: { id, businessId: business.id, type: "COBRAR" },
      include: { _count: { select: { payments: true } } },
    });
    if (!inv) return { error: "Factura no encontrada" };

    if (inv._count.payments > 0) {
      return { error: "No se puede eliminar: la factura tiene pagos registrados. Anúlala en su lugar." };
    }

    await prisma.invoice.update({
      where: { id },
      data: { status: "ANULADA" },
    });

    revalidatePath("/cuentas-por-cobrar");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Error al eliminar la factura" };
  }
}

const paymentSchema = z.object({
  amount: z.coerce.number().positive("El monto debe ser mayor a 0"),
  date: z.coerce.date(),
  method: z.string().optional(),
  reference: z.string().optional(),
});

export async function registerPayment(invoiceId: string, input: unknown) {
  try {
    const session = await requireSession();
    const business = await getCurrentBusiness();
    if (!business) return { error: "Sin negocio activo" };
    
    const data = paymentSchema.parse(input);

    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, businessId: business.id, type: "COBRAR" },
    });
    if (!invoice) return { error: "Factura no encontrada" };

    const saldo = Number(invoice.amount) - Number(invoice.paidAmount);
    if (data.amount > saldo + 0.01) {
      return { error: `El pago (${data.amount}) excede el saldo pendiente (${saldo})` };
    }

    const newPaid = Number(invoice.paidAmount) + data.amount;
    const isFullyPaid = Math.abs(newPaid - Number(invoice.amount)) < 0.01;
    const newStatus = isFullyPaid ? "PAGADA" : invoice.dueDate < new Date() ? "VENCIDA" : "PARCIAL";

    await prisma.payment.create({
      data: {
        invoiceId,
        amount: data.amount,
        date: parseSafeDate(data.date),
        method: data.method || null,
        reference: data.reference || null,
        createdBy: (session.user as any).id,
      },
    });

    await prisma.invoice.update({
      where: { id: invoiceId },
      data: { paidAmount: newPaid, status: newStatus },
    });

    revalidatePath("/cuentas-por-cobrar");
    revalidatePath("/dashboard");
    revalidatePath("/terceros");
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Error al registrar el pago" };
  }
}

export async function deletePayment(paymentId: string, invoiceId: string) {
  try {
    await requireSession();
    const business = await getCurrentBusiness();
    if (!business) return { error: "Sin negocio activo" };

    const payment = await prisma.payment.findFirst({
      where: { id: paymentId, invoiceId, invoice: { businessId: business.id, type: "COBRAR" } },
    });
    if (!payment) return { error: "Pago no encontrado" };

    const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) return { error: "Factura no encontrada" };

    const newPaid = Number(invoice.paidAmount) - Number(payment.amount);
    
    let newStatus = invoice.status;
    if (newPaid <= 0.01) {
      newStatus = invoice.dueDate < new Date() ? "VENCIDA" : "PENDIENTE";
    } else if (newPaid < Number(invoice.amount)) {
      newStatus = "PARCIAL";
    }

    await prisma.payment.delete({ where: { id: paymentId } });
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: { paidAmount: Math.max(0, newPaid), status: newStatus },
    });

    revalidatePath("/cuentas-por-cobrar");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Error al eliminar el pago" };
  }
}

// --- Pago Global (Distribución automática) ---
export async function registerBulkPayment(input: {
  thirdPartyId: string;
  amount: number;
  date: string;
  method?: string;
  reference?: string;
  invoiceIds: string[];
}) {
  try {
    const session = await requireSession();
    const business = await getCurrentBusiness();
    if (!business) return { error: "Sin negocio activo" };

    const { thirdPartyId, amount, date, method, reference, invoiceIds } = input;
    if (invoiceIds.length === 0) return { error: "Selecciona al menos una factura" };

    const invoices = await prisma.invoice.findMany({
      where: {
        id: { in: invoiceIds },
        businessId: business.id,
        type: "COBRAR",
        thirdPartyId,
      },
    });

    const saldoTotal = invoices.reduce((s, i) => s + (Number(i.amount) - Number(i.paidAmount)), 0);
    if (amount > saldoTotal + 0.01) {
      return { error: `El monto (${amount}) excede el saldo de las facturas seleccionadas (${saldoTotal})` };
    }

    let remaining = amount;
    const paymentDate = new Date(`${date}T12:00:00`);

    // Hacemos las operaciones de forma secuencial para evitar problemas con el Pooler de Supabase
    for (const invId of invoiceIds) {
      if (remaining <= 0.01) break;
      const inv = invoices.find((i) => i.id === invId);
      if (!inv) continue;

      const saldoFactura = Number(inv.amount) - Number(inv.paidAmount);
      const pagoFactura = Math.min(remaining, saldoFactura);
      remaining -= pagoFactura;

      const newPaid = Number(inv.paidAmount) + pagoFactura;
      const isFullyPaid = Math.abs(newPaid - Number(inv.amount)) < 0.01;
      const newStatus = isFullyPaid ? "PAGADA" : inv.dueDate < new Date() ? "VENCIDA" : "PARCIAL";

      await prisma.payment.create({
        data: {
          invoiceId: invId,
          amount: pagoFactura,
          date: paymentDate,
          method: method || null,
          reference: reference || null,
          createdBy: (session.user as any).id,
        },
      });

      await prisma.invoice.update({
        where: { id: invId },
        data: { paidAmount: newPaid, status: newStatus },
      });
    }

    revalidatePath("/cuentas-por-cobrar");
    revalidatePath("/dashboard");
    revalidatePath("/terceros");
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Error al registrar el pago global" };
  }
}
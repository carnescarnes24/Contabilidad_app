import { prisma } from "./prisma";

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;

export async function getDashboardData(businessId: string) {
  const now = new Date();
  const in30Days = new Date(Date.now() + 30 * 86400000);

  const [
    allInvoices,
    nextDue,
    topDebtors,
    topCreditors,
    monthlyFlow,
  ] = await Promise.all([
    prisma.invoice.findMany({
      where: { businessId, status: { notIn: ["PAGADA", "ANULADA"] } },
      select: {
        type: true,
        amount: true,
        paidAmount: true,
        dueDate: true,
      },
    }),
    prisma.invoice.findMany({
      where: {
        businessId,
        status: { in: ["PENDIENTE", "PARCIAL", "VENCIDA"] },
        dueDate: { lte: in30Days },
      },
      include: { thirdParty: { select: { name: true } } },
      orderBy: { dueDate: "asc" },
      take: 8,
    }),
    prisma.invoice.groupBy({
      by: ["thirdPartyId"],
      where: {
        businessId,
        type: "COBRAR",
        status: { in: ["PENDIENTE", "PARCIAL", "VENCIDA"] },
      },
      _sum: { amount: true, paidAmount: true },
      orderBy: { _sum: { amount: "desc" } },
      take: 5,
    }),
    prisma.invoice.groupBy({
      by: ["thirdPartyId"],
      where: {
        businessId,
        type: "PAGAR",
        status: { in: ["PENDIENTE", "PARCIAL", "VENCIDA"] },
      },
      _sum: { amount: true, paidAmount: true },
      orderBy: { _sum: { amount: "desc" } },
      take: 5,
    }),
    prisma.payment.findMany({
      where: {
        invoice: { businessId },
        date: { gte: new Date(Date.now() - 180 * 86400000) },
      },
      include: { invoice: { select: { type: true } } },
    }),
  ]);

  // KPIs por cobrar / pagar
  const calc = (type: "COBRAR" | "PAGAR") => {
    const rows = allInvoices.filter((i) => i.type === type);
    const total = rows.reduce((s, i) => s + Number(i.amount), 0);
    const paid = rows.reduce((s, i) => s + Number(i.paidAmount), 0);
    return { total, paid, saldo: total - paid, count: rows.length };
  };
  const cobrar = calc("COBRAR");
  const pagar = calc("PAGAR");

  // Aging (por vencer / vencidas)
  const aging = (type: "COBRAR" | "PAGAR") => {
    const buckets = {
      corriente: 0,
      d1_30: 0,
      d31_60: 0,
      d61_90: 0,
      d90plus: 0,
    };
    for (const i of allInvoices.filter((x) => x.type === type)) {
      const saldo = Number(i.amount) - Number(i.paidAmount);
      const days = Math.floor(
        (now.getTime() - new Date(i.dueDate).getTime()) / 86400000
      );
      if (days <= 0) buckets.corriente += saldo;
      else if (days <= 30) buckets.d1_30 += saldo;
      else if (days <= 60) buckets.d31_60 += saldo;
      else if (days <= 90) buckets.d61_90 += saldo;
      else buckets.d90plus += saldo;
    }
    return buckets;
  };

  // Resolver nombres de top deudores/acreedores
  const ids = [
    ...topDebtors.map((t) => t.thirdPartyId),
    ...topCreditors.map((t) => t.thirdPartyId),
  ];
  const parties = await prisma.thirdParty.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true },
  });
  const nameOf = (id: string) =>
    parties.find((p) => p.id === id)?.name ?? "—";

  // Flujo mensual últimos 6 meses
  const months: { key: string; label: string; cobros: number; pagos: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const label = d.toLocaleDateString("es-CO", { month: "short" });
    const rows = monthlyFlow.filter((p) => {
      const pd = new Date(p.date);
      return pd.getFullYear() === d.getFullYear() && pd.getMonth() === d.getMonth();
    });
    const cobros = rows
      .filter((p) => p.invoice.type === "COBRAR")
      .reduce((s, p) => s + Number(p.amount), 0);
    const pagos = rows
      .filter((p) => p.invoice.type === "PAGAR")
      .reduce((s, p) => s + Number(p.amount), 0);
    months.push({ key, label, cobros, pagos });
  }

  return {
    cobrar,
    pagar,
    flujoNeto: cobrar.saldo - pagar.saldo,
    agingCobrar: aging("COBRAR"),
    agingPagar: aging("PAGAR"),
    nextDue: nextDue.map((i) => ({
      id: i.id,
      number: i.number,
      type: i.type,
      thirdParty: i.thirdParty.name,
      amount: Number(i.amount) - Number(i.paidAmount),
      dueDate: i.dueDate,
      status: i.status,
    })),
    topDebtors: topDebtors.map((t) => ({
      name: nameOf(t.thirdPartyId),
      saldo: Number(t._sum.amount ?? 0) - Number(t._sum.paidAmount ?? 0),
    })),
    topCreditors: topCreditors.map((t) => ({
      name: nameOf(t.thirdPartyId),
      saldo: Number(t._sum.amount ?? 0) - Number(t._sum.paidAmount ?? 0),
    })),
    monthlyFlow: months,
  };
}
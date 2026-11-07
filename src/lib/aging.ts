export type AgingBuckets = {
  corriente: number;
  d1_30: number;
  d31_60: number;
  d61_90: number;
  d90plus: number;
};

export function agingFromInvoices(invoices: { dueDate: Date; amount: any; paidAmount: any }[]) {
  const today = new Date();
  const buckets: AgingBuckets = {
    corriente: 0,
    d1_30: 0,
    d31_60: 0,
    d61_90: 0,
    d90plus: 0,
  };

  for (const i of invoices) {
    const saldo = Number(i.amount) - Number(i.paidAmount);
    if (saldo <= 0.01) continue;
    const days = Math.floor((today.getTime() - new Date(i.dueDate).getTime()) / 86400000);
    if (days <= 0) buckets.corriente += saldo;
    else if (days <= 30) buckets.d1_30 += saldo;
    else if (days <= 60) buckets.d31_60 += saldo;
    else if (days <= 90) buckets.d61_90 += saldo;
    else buckets.d90plus += saldo;
  }
  return buckets;
}
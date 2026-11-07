"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { fmt, fmtShort } from "@/lib/format";

const COLORS = ["#FEAE0D", "#F29E4C", "#B05328", "#CD0508", "#7a0204"];

export function MonthlyFlowChart({
  data,
}: {
  data: { label: string; cobros: number; pagos: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0e6d2" />
        <XAxis dataKey="label" stroke="#B05328" fontSize={12} />
        <YAxis stroke="#B05328" fontSize={12} tickFormatter={fmtShort} />
        <Tooltip
          formatter={(v: number) => fmt(v)}
          contentStyle={{
            background: "#fff",
            border: "1px solid #F29E4C",
            borderRadius: 8,
          }}
        />
        <Legend wrapperStyle={{ fontSize: 13 }} />
        <Bar dataKey="cobros" name="Cobros" fill="#FEAE0D" radius={[6, 6, 0, 0]} />
        <Bar dataKey="pagos" name="Pagos" fill="#CD0508" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function AgingChart({
  data,
}: {
  data: { corriente: number; d1_30: number; d31_60: number; d61_90: number; d90plus: number };
}) {
  const chartData = [
    { name: "Corriente", value: data.corriente },
    { name: "1-30 días", value: data.d1_30 },
    { name: "31-60 días", value: data.d31_60 },
    { name: "61-90 días", value: data.d61_90 },
    { name: "+90 días", value: data.d90plus },
  ];
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={chartData}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={90}
          paddingAngle={2}
        >
          {chartData.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(v: number) => fmt(v)}
          contentStyle={{
            background: "#fff",
            border: "1px solid #F29E4C",
            borderRadius: 8,
          }}
        />
        <Legend
          verticalAlign="bottom"
          iconType="circle"
          wrapperStyle={{ fontSize: 12 }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

function ringkas(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} jt`;
  if (n >= 1_000) return `${Math.round(n / 1_000)} rb`;
  return String(n);
}

export function GrafikPendapatan({ data }: { data: { label: string; total: number }[] }) {
  return (
    <div className="h-64 w-full" role="img" aria-label="Grafik pendapatan 7 hari terakhir">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="isiPendapatan" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6f7b4b" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#6f7b4b" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#dcd8c9" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#6b6b63" }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={ringkas} tick={{ fontSize: 12, fill: "#6b6b63" }} axisLine={false} tickLine={false} width={48} />
          <Tooltip
            formatter={(v) => ["Rp " + Number(v).toLocaleString("id-ID"), "Pendapatan"]}
            contentStyle={{ borderRadius: 12, borderColor: "#dcd8c9", fontSize: 13 }}
          />
          <Area type="monotone" dataKey="total" stroke="#57623a" strokeWidth={2} fill="url(#isiPendapatan)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

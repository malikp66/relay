"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const axis = { fontSize: 11, fill: "var(--muted-foreground)" };

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border bg-popover px-3 py-2 text-[12px] shadow-[var(--shadow-pop)]">
      <p className="mb-1 font-medium">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-2 text-muted-foreground">
          <span className="size-2 rounded-full" style={{ background: p.color }} />
          <span className="flex-1">{p.name}</span>
          <span className="tabular font-semibold text-foreground">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

/** Area chart dibuat vs selesai — garis tipis, isi gradasi lembut, animasi singkat. */
export function ThroughputChart({ data }: { data: { day: string; created: number; finished: number }[] }) {
  const rows = data.map((d) => ({ ...d, label: new Date(`${d.day}T12:00:00`).toLocaleDateString("id-ID", { day: "numeric", month: "short" }) }));
  return (
    <div className="h-52 sm:h-60">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={rows} margin={{ left: -28, right: 4, top: 6, bottom: 0 }}>
          <defs>
            <linearGradient id="g-finished" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563eb" stopOpacity={0.22} />
              <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 4" vertical={false} />
          <XAxis dataKey="label" tick={axis} tickLine={false} axisLine={false} minTickGap={28} tickMargin={8} />
          <YAxis tick={axis} tickLine={false} axisLine={false} allowDecimals={false} width={48} />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: "var(--border)", strokeWidth: 1 }} />
          <Area type="monotone" dataKey="created" name="Dibuat" stroke="#a1a1aa" strokeWidth={1.5} strokeDasharray="4 3" fill="transparent" dot={false} activeDot={{ r: 3 }} animationDuration={500} animationEasing="ease-out" />
          <Area type="monotone" dataKey="finished" name="Selesai" stroke="#2563eb" strokeWidth={2} fill="url(#g-finished)" dot={false} activeDot={{ r: 3.5 }} animationDuration={500} animationEasing="ease-out" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

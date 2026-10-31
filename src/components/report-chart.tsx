"use client";

import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import type { ChartSpec } from "@/lib/reports";

const AXIS = "#55605b";
const GRID = "#e6e9e5";

const rupee = (v: number) => `${v < 0 ? "−" : ""}₹${Math.abs(v).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
/** Compact Indian units for axis ticks: ₹12K, ₹1.2L, ₹3.4Cr. */
const compact = (v: number) => {
  const a = Math.abs(v), s = v < 0 ? "−" : "";
  if (a >= 1e7) return `${s}₹${+(a / 1e7).toFixed(1)}Cr`;
  if (a >= 1e5) return `${s}₹${+(a / 1e5).toFixed(1)}L`;
  if (a >= 1e3) return `${s}₹${+(a / 1e3).toFixed(0)}K`;
  return `${s}₹${a}`;
};

const tooltipProps = {
  formatter: (v: number | string) => rupee(Number(v)),
  contentStyle: { borderRadius: 8, border: "1px solid #dde1dc", fontSize: 13 },
  cursor: { fill: "rgba(23,32,28,0.06)" },
};

export function ReportChart({ spec }: { spec: ChartSpec }) {
  if (spec.data.length === 0) return <p className="py-8 text-center text-sm text-muted">No data for these filters.</p>;
  const multi = spec.series.length > 1;

  if (spec.kind === "donut") {
    const total = spec.data.reduce((a, d) => a + Number(d.amount), 0);
    return (
      <div className="flex flex-col items-center gap-4 sm:flex-row">
        <div className="h-56 w-56 shrink-0">
          <ResponsiveContainer>
            <PieChart>
              <Pie data={spec.data} dataKey="amount" nameKey={spec.xKey} innerRadius="58%" outerRadius="100%" paddingAngle={1} stroke="#fff" strokeWidth={2} isAnimationActive={false}>
                {spec.data.map((d, i) => <Cell key={i} fill={String(d.fill)} />)}
              </Pie>
              <Tooltip {...tooltipProps} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <ul className="w-full flex-1 divide-y divide-line-soft text-sm">
          {spec.data.map((d, i) => (
            <li key={i} className="flex items-center gap-2 py-2">
              <span className="size-3 shrink-0 rounded-sm" style={{ background: String(d.fill) }} aria-hidden="true" />
              <span className="flex-1">{d[spec.xKey]}</span>
              <span className="num font-medium">{rupee(Number(d.amount))}</span>
              <span className="num w-12 text-right text-muted">{total ? Math.round((Number(d.amount) / total) * 100) : 0}%</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (spec.kind === "line") {
    return (
      <div className="h-72">
        <ResponsiveContainer>
          <LineChart data={spec.data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey={spec.xKey} tick={{ fill: AXIS, fontSize: 12 }} tickLine={false} axisLine={{ stroke: GRID }} minTickGap={16} />
            <YAxis tickFormatter={compact} tick={{ fill: AXIS, fontSize: 12 }} tickLine={false} axisLine={false} width={56} />
            <Tooltip {...tooltipProps} cursor={{ stroke: AXIS, strokeDasharray: "3 3" }} />
            {multi && <Legend iconType="plainline" wrapperStyle={{ fontSize: 12 }} />}
            {spec.series.map((s) => (
              <Line key={s.key} dataKey={s.key} name={s.label} stroke={s.color} strokeWidth={2} dot={spec.data.length <= 31 ? { r: 3 } : false} activeDot={{ r: 5 }} isAnimationActive={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (spec.kind === "stacked") {
    return (
      <div className="h-80">
        <ResponsiveContainer>
          <BarChart data={spec.data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey={spec.xKey} tick={{ fill: AXIS, fontSize: 12 }} tickLine={false} axisLine={{ stroke: GRID }} minTickGap={8} />
            <YAxis tickFormatter={compact} tick={{ fill: AXIS, fontSize: 12 }} tickLine={false} axisLine={false} width={56} />
            <Tooltip {...tooltipProps} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {spec.series.map((s, i) => (
              <Bar key={s.key} dataKey={s.key} name={s.label} stackId="a" fill={s.color} stroke="#fff" strokeWidth={1} radius={i === spec.series.length - 1 ? [4, 4, 0, 0] : 0} isAnimationActive={false} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // Horizontal bars: one row per category, so long names stay readable on a phone.
  const rowH = multi ? 44 : 32;
  const longest = Math.max(...spec.data.map((d) => String(d[spec.xKey]).length));
  return (
    <div style={{ height: spec.data.length * rowH + (multi ? 72 : 40) }}>
      <ResponsiveContainer>
        <BarChart data={spec.data} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 0 }} barGap={2} barCategoryGap={multi ? 8 : 6}>
          <CartesianGrid stroke={GRID} horizontal={false} />
          <XAxis type="number" tickFormatter={compact} tick={{ fill: AXIS, fontSize: 12 }} tickLine={false} axisLine={false} />
          <YAxis type="category" dataKey={spec.xKey} tick={{ fill: "#17201c", fontSize: 12 }} tickLine={false} axisLine={false} width={Math.min(170, Math.max(72, Math.ceil(longest * 7.6) + 14))} />
          <Tooltip {...tooltipProps} />
          {multi && <Legend wrapperStyle={{ fontSize: 12 }} />}
          {spec.series.map((s) => (
            <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} radius={[0, 4, 4, 0]} maxBarSize={18} isAnimationActive={false} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

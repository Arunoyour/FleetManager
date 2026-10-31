import { dailyBalance } from "./balance";
import { fmtShort, inr } from "./format";
import type { TripRow } from "./trips";

export type ReportKey = "earning" | "expense" | "vehicle" | "trip" | "type" | "balance" | "driver";
export type FilterKey = "vehicle" | "driver" | "type";

export const REPORTS: { key: ReportKey; n: number; label: string; filters: FilterKey[]; groupable: boolean }[] = [
  { key: "earning", n: 11, label: "Earning View", filters: ["vehicle", "driver"], groupable: true },
  { key: "expense", n: 12, label: "Expense View", filters: ["vehicle", "driver", "type"], groupable: true },
  { key: "vehicle", n: 13, label: "Vehicle Expense & Earning", filters: ["vehicle", "driver"], groupable: false },
  { key: "trip", n: 14, label: "Trip Expense & Earning", filters: ["vehicle", "driver"], groupable: false },
  { key: "type", n: 15, label: "Expense Type Report", filters: ["vehicle", "type", "driver"], groupable: false },
  { key: "balance", n: 16, label: "Balance Report", filters: ["vehicle", "driver"], groupable: true },
  { key: "driver", n: 17, label: "Driver Expenses", filters: ["vehicle"], groupable: false },
];

/** Series colours from the validated reference palette. Earned and expenses keep one colour everywhere. */
export const COLORS = { earned: "#2a78d6", expenses: "#eb6834", net: "#1baf7a", categorical: ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4"], other: "#8a8d8b" };

export type Cell = { v: string; num?: boolean; neg?: boolean };
export type ChartSeries = { key: string; label: string; color: string };
export type ChartSpec = {
  kind: "line" | "bar" | "stacked" | "donut";
  title: string;
  /** Horizontal bars read better for long category names. */
  horizontal?: boolean;
  xKey: string;
  data: Record<string, string | number>[];
  series: ChartSeries[];
};
export type Report = {
  key: ReportKey;
  title: string;
  columns: { label: string; num?: boolean }[];
  rows: { cells: Cell[]; href?: string }[];
  total: Cell[];
  kpis: { label: string; value: string }[];
  chart: ChartSpec;
};

export type ReportParams = {
  key: ReportKey;
  from: string;
  to: string;
  group: "day" | "month";
  typeId?: string;
  /** Query string with the current date/vehicle/driver filters, for drill-down links. */
  drillQuery: string;
};

const money = (p: number): Cell => ({ v: inr(p), num: true, neg: p < 0 });
const count = (n: number): Cell => ({ v: String(n), num: true });
const text = (v: string): Cell => ({ v });
const rupees = (p: number) => Math.round(p) / 100;
const sum = <T,>(xs: T[], f: (x: T) => number) => xs.reduce((a, x) => a + f(x), 0);
const pct = (part: number, whole: number) => (whole ? `${Math.round((part / whole) * 100)}%` : "—");

function groupBy<T>(xs: T[], key: (x: T) => string) {
  const m = new Map<string, T[]>();
  for (const x of xs) {
    const k = key(x);
    const list = m.get(k);
    if (list) list.push(x);
    else m.set(k, [x]);
  }
  return m;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const periodKey = (d: string, g: "day" | "month") => (g === "month" ? d.slice(0, 7) : d);
const periodLabel = (k: string) => (k.length === 7 ? `${MONTHS[Number(k.slice(5, 7)) - 1]} ${k.slice(0, 4)}` : fmtShort(k));

/**
 * Builds one report. `trips` must already be filtered by vehicle/driver; for "balance"
 * it must also include trips whose credit was paid inside the range.
 */
export function buildReport(trips: TripRow[], p: ReportParams): Report {
  const def = REPORTS.find((r) => r.key === p.key)!;
  const title = `${def.n} · ${def.label}`;
  const inRange = trips.filter((t) => t.date >= p.from && t.date <= p.to);
  const typeOk = (typeId: string) => !p.typeId || typeId === p.typeId;
  const expOf = (t: TripRow) => sum(t.expenses.filter((e) => typeOk(e.typeId)), (e) => e.amount);
  const q = p.drillQuery ? `&${p.drillQuery}` : "";

  if (p.key === "earning") {
    const groups = [...groupBy(inRange, (t) => periodKey(t.date, p.group))].sort((a, b) => b[0].localeCompare(a[0]));
    const rows = groups.map(([k, ts]) => {
      const earned = sum(ts, (t) => t.earned);
      const received = sum(ts, (t) => (!t.isCredit || t.paidOn ? t.earned : 0));
      return { k, n: ts.length, earned, received, pending: earned - received };
    });
    const T = { n: sum(rows, (r) => r.n), earned: sum(rows, (r) => r.earned), received: sum(rows, (r) => r.received), pending: sum(rows, (r) => r.pending) };
    return {
      key: p.key, title,
      columns: [{ label: p.group === "month" ? "Month" : "Date" }, { label: "Trips", num: true }, { label: "Earned", num: true }, { label: "Received", num: true }, { label: "Credit pending", num: true }],
      rows: rows.map((r) => ({ cells: [text(periodLabel(r.k)), count(r.n), money(r.earned), money(r.received), money(r.pending)] })),
      total: [text("Total"), count(T.n), money(T.earned), money(T.received), money(T.pending)],
      kpis: [{ label: "Earned", value: inr(T.earned) }, { label: "Credit pending", value: inr(T.pending) }],
      chart: { kind: "line", title: `Earnings by ${p.group}`, xKey: "period", series: [{ key: "earned", label: "Earned", color: COLORS.earned }], data: [...rows].reverse().map((r) => ({ period: periodLabel(r.k), earned: rupees(r.earned) })) },
    };
  }

  if (p.key === "expense") {
    const groups = [...groupBy(inRange, (t) => periodKey(t.date, p.group))].sort((a, b) => b[0].localeCompare(a[0]));
    const typeTotals = new Map<string, number>();
    for (const t of inRange) for (const e of t.expenses) if (typeOk(e.typeId)) typeTotals.set(e.typeName, (typeTotals.get(e.typeName) ?? 0) + e.amount);
    const topTypes = [...typeTotals].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([n]) => n);
    const hasOther = typeTotals.size > topTypes.length;
    const rows = groups
      .map(([k, ts]) => {
        const by = new Map<string, number>();
        for (const t of ts) for (const e of t.expenses) if (typeOk(e.typeId)) by.set(e.typeName, (by.get(e.typeName) ?? 0) + e.amount);
        const top = [...by].sort((a, b) => b[1] - a[1])[0];
        return { k, total: sum(ts, expOf), top: top ? top[0] : "—", by };
      })
      .filter((r) => r.total > 0);
    const T = sum(rows, (r) => r.total);
    const series: ChartSeries[] = topTypes.map((n, i) => ({ key: `t${i}`, label: n, color: COLORS.categorical[i] }));
    if (hasOther) series.push({ key: "other", label: "Other", color: COLORS.other });
    return {
      key: p.key, title,
      columns: [{ label: p.group === "month" ? "Month" : "Date" }, { label: "Expenses", num: true }, { label: "Top expense type" }],
      rows: rows.map((r) => ({ cells: [text(periodLabel(r.k)), money(r.total), text(r.top)] })),
      total: [text("Total"), money(T), text("")],
      kpis: [{ label: "Expenses", value: inr(T) }, { label: "Largest type", value: topTypes[0] ?? "—" }],
      chart: {
        kind: "stacked", title: `Expenses by type per ${p.group}`, xKey: "period", series,
        data: [...rows].reverse().map((r) => {
          const row: Record<string, string | number> = { period: periodLabel(r.k) };
          let other = 0;
          for (const [n, a] of r.by) {
            const i = topTypes.indexOf(n);
            if (i >= 0) row[`t${i}`] = rupees(a);
            else other += a;
          }
          if (hasOther) row.other = rupees(other);
          return row;
        }),
      },
    };
  }

  if (p.key === "vehicle") {
    const rows = [...groupBy(inRange, (t) => t.vehicleId)]
      .map(([id, ts]) => {
        const earned = sum(ts, (t) => t.earned), exp = sum(ts, (t) => t.expenseTotal);
        return { id, label: ts[0].vehicleNumber, n: ts.length, earned, exp, profit: earned - exp };
      })
      .sort((a, b) => b.profit - a.profit);
    const T = { n: sum(rows, (r) => r.n), earned: sum(rows, (r) => r.earned), exp: sum(rows, (r) => r.exp) };
    return {
      key: p.key, title,
      columns: [{ label: "Vehicle" }, { label: "Trips", num: true }, { label: "Earned", num: true }, { label: "Expenses", num: true }, { label: "Profit", num: true }, { label: "Profit %", num: true }],
      rows: rows.map((r) => ({ href: `/trips?vehicle=${r.id}${q}`, cells: [text(r.label), count(r.n), money(r.earned), money(r.exp), money(r.profit), { v: pct(r.profit, r.earned), num: true }] })),
      total: [text("Total"), count(T.n), money(T.earned), money(T.exp), money(T.earned - T.exp), { v: pct(T.earned - T.exp, T.earned), num: true }],
      kpis: [{ label: "Trip profit", value: inr(T.earned - T.exp) }, { label: "Vehicles with trips", value: String(rows.length) }],
      chart: {
        kind: "bar", horizontal: true, title: "Earned vs expenses per vehicle, sorted by profit", xKey: "vehicle",
        series: [{ key: "earned", label: "Earned", color: COLORS.earned }, { key: "expenses", label: "Expenses", color: COLORS.expenses }],
        data: rows.map((r) => ({ vehicle: r.label, earned: rupees(r.earned), expenses: rupees(r.exp) })),
      },
    };
  }

  if (p.key === "trip") {
    const rows = inRange.map((t) => ({ t, profit: t.earned - t.expenseTotal }));
    const T = { earned: sum(rows, (r) => r.t.earned), exp: sum(rows, (r) => r.t.expenseTotal) };
    const ranked = [...rows].sort((a, b) => b.profit - a.profit);
    const chartRows = ranked.length > 20 ? [...ranked.slice(0, 10), ...ranked.slice(-10)] : ranked;
    return {
      key: p.key, title,
      columns: [{ label: "Date" }, { label: "Trip" }, { label: "Vehicle" }, { label: "Driver" }, { label: "Earned", num: true }, { label: "Expenses", num: true }, { label: "Profit", num: true }],
      rows: rows.map((r) => ({ href: `/trips/${r.t.id}`, cells: [text(fmtShort(r.t.date)), text(r.t.name + (r.t.isCredit && !r.t.paidOn ? " (credit)" : "")), text(r.t.vehicleNumber), text(r.t.driverName), money(r.t.earned), money(r.t.expenseTotal), money(r.profit)] })),
      total: [text("Total"), text(`${rows.length} trips`), text(""), text(""), money(T.earned), money(T.exp), money(T.earned - T.exp)],
      kpis: [{ label: "Trips", value: String(rows.length) }, { label: "Average profit per trip", value: inr(rows.length ? Math.round((T.earned - T.exp) / rows.length) : 0) }],
      chart: {
        kind: "bar", horizontal: true, title: ranked.length > 20 ? "Top 10 and bottom 10 trips by profit" : "Profit per trip, highest first", xKey: "trip",
        series: [{ key: "profit", label: "Profit", color: COLORS.net }],
        data: chartRows.map((r) => ({ trip: `${fmtShort(r.t.date)} · ${r.t.name}`, profit: rupees(r.profit) })),
      },
    };
  }

  if (p.key === "type") {
    const m = new Map<string, { name: string; amount: number; entries: number }>();
    for (const t of inRange)
      for (const e of t.expenses) {
        if (!typeOk(e.typeId)) continue;
        const v = m.get(e.typeId) ?? { name: e.typeName, amount: 0, entries: 0 };
        v.amount += e.amount;
        v.entries += 1;
        m.set(e.typeId, v);
      }
    const rows = [...m].map(([id, v]) => ({ id, ...v })).sort((a, b) => b.amount - a.amount);
    const T = sum(rows, (r) => r.amount);
    const top = rows.slice(0, 5);
    const rest = rows.slice(5);
    const chartData = top.map((r, i) => ({ type: r.name, amount: rupees(r.amount), fill: COLORS.categorical[i] }));
    if (rest.length) chartData.push({ type: "Other", amount: rupees(sum(rest, (r) => r.amount)), fill: COLORS.other });
    return {
      key: p.key, title,
      columns: [{ label: "Expense type" }, { label: "Amount", num: true }, { label: "% of total", num: true }, { label: "Entries", num: true }],
      rows: rows.map((r) => ({ href: `/trips?type=${r.id}${q}`, cells: [text(r.name), money(r.amount), { v: T ? `${((r.amount / T) * 100).toFixed(1)}%` : "—", num: true }, count(r.entries)] })),
      total: [text("Total"), money(T), { v: T ? "100%" : "—", num: true }, count(sum(rows, (r) => r.entries))],
      kpis: [{ label: "Total expenses", value: inr(T) }, { label: "Largest type", value: rows[0]?.name ?? "—" }],
      chart: { kind: "donut", title: "Share of expenses by type", xKey: "type", series: [{ key: "amount", label: "Amount", color: COLORS.expenses }], data: chartData },
    };
  }

  if (p.key === "balance") {
    const { days } = dailyBalance(trips, p.from, p.to);
    const groups = [...groupBy(days, (d) => periodKey(d.date, p.group))].sort((a, b) => b[0].localeCompare(a[0]));
    const rows = groups.map(([k, ds]) => ({ k, cash: sum(ds, (d) => d.cash), recv: sum(ds, (d) => d.creditReceived), exp: sum(ds, (d) => d.expenses), bal: sum(ds, (d) => d.balance) }));
    const T = { cash: sum(rows, (r) => r.cash), recv: sum(rows, (r) => r.recv), exp: sum(rows, (r) => r.exp), bal: sum(rows, (r) => r.bal) };
    let running = 0;
    const chartData = [...rows].reverse().map((r) => {
      running += r.bal;
      return { period: periodLabel(r.k), balance: rupees(r.bal), running: rupees(running) };
    });
    return {
      key: p.key, title,
      columns: [{ label: p.group === "month" ? "Month" : "Date" }, { label: "Cash earned", num: true }, { label: "Credit received", num: true }, { label: "Expenses", num: true }, { label: "Balance", num: true }],
      rows: rows.map((r) => ({ cells: [text(periodLabel(r.k)), money(r.cash), money(r.recv), money(r.exp), money(r.bal)] })),
      total: [text("Total"), money(T.cash), money(T.recv), money(T.exp), money(T.bal)],
      kpis: [{ label: "Period balance", value: inr(T.bal) }, { label: "Credit received", value: inr(T.recv) }],
      chart: {
        kind: "line", title: `Balance per ${p.group} with running total`, xKey: "period",
        series: [{ key: "balance", label: `Balance per ${p.group}`, color: COLORS.net }, { key: "running", label: "Running total", color: COLORS.earned }],
        data: chartData,
      },
    };
  }

  // driver
  const rows = [...groupBy(inRange, (t) => t.driverId)]
    .map(([id, ts]) => {
      const exp = sum(ts, (t) => t.expenseTotal);
      return { id, name: ts[0].driverName, n: ts.length, earned: sum(ts, (t) => t.earned), exp, per: Math.round(exp / ts.length) };
    })
    .sort((a, b) => b.exp - a.exp);
  const T = { n: sum(rows, (r) => r.n), earned: sum(rows, (r) => r.earned), exp: sum(rows, (r) => r.exp) };
  return {
    key: "driver", title,
    columns: [{ label: "Driver" }, { label: "Trips", num: true }, { label: "Earned", num: true }, { label: "Expenses", num: true }, { label: "Expense per trip", num: true }],
    rows: rows.map((r) => ({ href: `/trips?driver=${r.id}${q}`, cells: [text(r.name), count(r.n), money(r.earned), money(r.exp), money(r.per)] })),
    total: [text("Total"), count(T.n), money(T.earned), money(T.exp), money(T.n ? Math.round(T.exp / T.n) : 0)],
    kpis: [{ label: "Driver expenses", value: inr(T.exp) }, { label: "Highest", value: rows[0]?.name ?? "—" }],
    chart: {
      kind: "bar", horizontal: true, title: "Expenses per driver, highest first", xKey: "driver",
      series: [{ key: "expenses", label: "Expenses", color: COLORS.expenses }],
      data: rows.map((r) => ({ driver: r.name, expenses: rupees(r.exp) })),
    },
  };
}

import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { allOptions } from "@/lib/trips";
import { REPORTS } from "@/lib/reports";
import { reportFromParams } from "@/lib/report-data";
import { fmtDate, todayISO } from "@/lib/format";
import { query, type SearchParams } from "@/lib/params";
import { PageBody, PageHeader } from "@/components/page";
import { AutoFilterForm, DateFilter, SelectFilter } from "@/components/filters";
import { ReportChart } from "@/components/report-chart";
import { PrintButton } from "./print-button";
import { filterSummary } from "@/lib/filter-summary";
import { Icon } from "@/components/icon";

export const metadata: Metadata = { title: "Reports" };

export default async function Reports({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireUser();
  const sp = await searchParams;
  const [{ report, def, f, vehicleId, driverId, typeId, group, view }, { vehicles, drivers, types }] = await Promise.all([reportFromParams(sp), allOptions()]);
  const base = { r: def.key, from: f.from, to: f.to, vehicle: vehicleId, driver: driverId, type: typeId, g: def.groupable && group === "month" ? "month" : undefined };
  const viewHref = (v: string) => `/reports?${query({ ...base, view: v === "chart" ? "chart" : undefined })}`;

  return (
    <>
      <PageHeader title="Reports" back={{ href: "/more", label: "More" }} />
      <PageBody wide>
        <AutoFilterForm
          className="grid grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-6"
          summary={`${def.n} · ${def.label} · ${filterSummary({ from: f.from, to: f.to, picks: [[vehicleId, vehicles, "number"], [driverId, drivers, "name"], [typeId, types, "name"]], extra: [def.groupable && group === "month" ? "by month" : undefined] })}`}
        >
          <label className="label col-span-2 text-xs">
            Report
            <select name="r" defaultValue={def.key} className="field h-11 text-[15px] font-semibold">
              {REPORTS.map((r) => (
                <option key={r.key} value={r.key}>{r.n} · {r.label}</option>
              ))}
            </select>
          </label>
          <input type="hidden" name="view" value={view === "chart" ? "chart" : ""} />
          <DateFilter name="from" label="From" value={f.from} max={f.to} />
          <DateFilter name="to" label="To" value={f.to} min={f.from} max={todayISO()} />
          {def.filters.includes("vehicle") && <SelectFilter name="vehicle" label="Vehicle" value={vehicleId} allLabel="All vehicles" options={vehicles.map((v) => ({ id: v.id, label: v.number }))} />}
          {def.filters.includes("driver") && <SelectFilter name="driver" label="Driver" value={driverId} allLabel="All drivers" options={drivers.map((d) => ({ id: d.id, label: d.name }))} />}
          {def.filters.includes("type") && <SelectFilter name="type" label="Expense type" value={typeId} allLabel="All types" options={types.map((t) => ({ id: t.id, label: t.name }))} />}
          {def.groupable && (
            <label className="label text-xs">
              Group by
              <select name="g" defaultValue={group} className="field h-11 text-[15px]">
                <option value="day">Day</option>
                <option value="month">Month</option>
              </select>
            </label>
          )}
        </AutoFilterForm>

        <div className="no-print flex flex-wrap items-center gap-2">
          <nav aria-label="View" className="grid flex-1 grid-cols-2 gap-1 rounded-xl bg-[#e3e6e1] p-1 sm:max-w-xs">
            {(["table", "chart"] as const).map((v) => (
              <Link key={v} href={viewHref(v)} scroll={false} aria-current={view === v ? "page" : undefined} className={`flex min-h-10 items-center justify-center rounded-lg text-sm font-semibold capitalize ${view === v ? "bg-surface text-ink shadow-sm" : "text-muted"}`}>
                {v}
              </Link>
            ))}
          </nav>
          <a href={`/reports/export?${query(base)}`} className="btn-secondary h-12">
            <Icon name="download" /> Excel
          </a>
          <PrintButton />
        </div>

        <div>
          <h2 className="text-lg font-semibold">{report.title}</h2>
          <p className="text-sm text-muted">{fmtDate(f.from)} to {fmtDate(f.to)}</p>
        </div>

        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {report.kpis.map((k) => (
            <div key={k.label} className="card p-3">
              <div className="text-xs text-muted">{k.label}</div>
              <div className="num mt-0.5 truncate text-lg font-semibold">{k.value}</div>
            </div>
          ))}
        </div>

        {view === "chart" ? (
          <figure className="card m-0 flex flex-col gap-3 p-4">
            <figcaption className="font-semibold">{report.chart.title}</figcaption>
            <ReportChart spec={report.chart} />
          </figure>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full min-w-max text-sm">
              <thead>
                <tr className="border-b border-line bg-[#f7f8f6] text-xs text-[#4b5551]">
                  {report.columns.map((c, i) => (
                    <th key={i} scope="col" className={`px-3 py-2.5 font-semibold whitespace-nowrap ${c.num ? "text-right" : "text-left"} ${i === 0 ? "sticky left-0 bg-[#f7f8f6]" : ""}`}>
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line-soft">
                {report.rows.length === 0 && (
                  <tr><td colSpan={report.columns.length} className="px-3 py-6 text-center text-muted">No data for these filters.</td></tr>
                )}
                {report.rows.map((r, ri) => (
                  <tr key={ri} className="hover:bg-ground">
                    {r.cells.map((c, i) => (
                      <td key={i} className={`px-3 py-2.5 whitespace-nowrap ${c.num ? "num text-right" : ""} ${c.neg ? "text-bad" : ""} ${i === 0 ? "sticky left-0 bg-surface font-medium" : ""}`}>
                        {i === 0 && r.href ? <Link href={r.href} className="text-brand hover:underline">{c.v}</Link> : c.v}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
              {report.rows.length > 0 && (
                <tfoot>
                  <tr className="border-t border-line bg-[#f7f8f6] font-semibold">
                    {report.total.map((c, i) => (
                      <td key={i} className={`px-3 py-2.5 whitespace-nowrap ${c.num ? "num text-right" : ""} ${c.neg ? "text-bad" : ""} ${i === 0 ? "sticky left-0 bg-[#f7f8f6]" : ""}`}>{c.v}</td>
                    ))}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
        {view === "table" && report.rows.some((r) => r.href) && <p className="no-print text-xs text-muted">Tap a name in the first column to see its trips.</p>}
      </PageBody>
    </>
  );
}

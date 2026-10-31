import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { allOptions, loadTrips } from "@/lib/trips";
import { dailyBalance, type BalanceEntry } from "@/lib/balance";
import { fmtShort, inr, todayISO } from "@/lib/format";
import { parseFilters, type SearchParams } from "@/lib/params";
import { EmptyState, PageBody, PageHeader } from "@/components/page";
import { AutoFilterForm, DateFilter, SelectFilter } from "@/components/filters";
import { Icon } from "@/components/icon";
import { filterSummary } from "@/lib/filter-summary";
import { ExpandAll } from "./expand-all";

export const metadata: Metadata = { title: "Daily Balance" };

export default async function Balance({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireUser();
  const f = parseFilters(await searchParams);
  const today = todayISO();
  const [{ vehicles, drivers }, trips, pending] = await Promise.all([
    allOptions(),
    loadTrips({ from: f.from, to: f.to, vehicleId: f.vehicle, driverId: f.driver, includePaidInRange: true }),
    loadTrips({ credit: "pending", vehicleId: f.vehicle, driverId: f.driver }),
  ]);
  const { days, totals } = dailyBalance(trips, f.from, f.to);
  const outstanding = pending.reduce((a, t) => a + t.earned, 0);

  return (
    <>
      <PageHeader title="Daily Balance" />
      <PageBody>
        <AutoFilterForm className="grid grid-cols-2 gap-2 md:grid-cols-4" summary={filterSummary({ from: f.from, to: f.to, picks: [[f.vehicle, vehicles, "number"], [f.driver, drivers, "name"]] })}>
          <DateFilter name="from" label="From" value={f.from} max={f.to} />
          <DateFilter name="to" label="To" value={f.to} min={f.from} max={today} />
          <SelectFilter name="vehicle" label="Vehicle" value={f.vehicle} allLabel="All vehicles" options={vehicles.map((v) => ({ id: v.id, label: v.number }))} />
          <SelectFilter name="driver" label="Driver" value={f.driver} allLabel="All drivers" options={drivers.map((d) => ({ id: d.id, label: d.name }))} />
        </AutoFilterForm>

        <section aria-label="Period totals" className="flex flex-col gap-3 rounded-xl bg-ink p-4 text-white">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-[#c9d1cc]">Period balance</span>
            <span className="num text-2xl font-semibold">{inr(totals.balance)}</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs text-[#c9d1cc]">
            <div>Cash earned<div className="num text-sm font-medium text-white">{inr(totals.cash)}</div></div>
            <div>Credit received<div className="num text-sm font-medium text-white">{inr(totals.creditReceived)}</div></div>
            <div>Expenses<div className="num text-sm font-medium text-white">{inr(totals.expenses)}</div></div>
          </div>
          <div className="text-xs text-[#f1c27d]">Credit outstanding (not in balance): {inr(outstanding)}</div>
        </section>

        {days.length === 0 ? (
          <EmptyState>No trips or credit payments in this period.</EmptyState>
        ) : (
          <>
            <ExpandAll target="balance-days" />
            <div id="balance-days" className="flex flex-col gap-2">
              {days.map((d, i) => (
                <details key={d.date} open={i === 0} className="card overflow-hidden">
                  <summary className="flex min-h-14 cursor-pointer items-center gap-3 px-4 py-3">
                    <Icon name="chevronRight" className="chevron size-4 shrink-0 text-muted transition-transform" />
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{fmtShort(d.date)}{d.date === today ? " · Today" : ""}</span>
                      <span className="block text-xs text-muted">
                        {d.trips} {d.trips === 1 ? "trip" : "trips"} · Earned {inr(d.cash)}
                        {d.creditReceived ? ` + credit ${inr(d.creditReceived)}` : ""} · Exp {inr(d.expenses)}
                      </span>
                    </span>
                    <span className={`num shrink-0 font-semibold ${d.balance < 0 ? "text-bad" : ""}`}>{inr(d.balance)}</span>
                  </summary>
                  <ul className="divide-y divide-line-soft border-t border-line bg-[#fafbf9]">
                    {d.entries.map((e) => (
                      <li key={e.key}>
                        <Entry e={e} />
                      </li>
                    ))}
                  </ul>
                </details>
              ))}
            </div>
          </>
        )}
      </PageBody>
    </>
  );
}

function Entry({ e }: { e: BalanceEntry }) {
  const t = e.trip;
  const tag =
    e.kind === "pending" ? { text: "Credit – pending", cls: "bg-credit-soft text-credit" }
    : e.kind === "paidLater" ? { text: `Credit – paid ${fmtShort(t.paidOn!)}`, cls: "bg-brand-soft text-brand" }
    : e.kind === "received" ? { text: `Credit received · trip ${fmtShort(t.date)}`, cls: "bg-good-soft text-good" }
    : null;
  const note =
    e.kind === "pending" ? `Earning of ${inr(t.earned)} counts on the day it is marked paid.`
    : e.kind === "paidLater" ? `Earning of ${inr(t.earned)} counted on ${fmtShort(t.paidOn!)}.`
    : e.kind === "received" ? `Expenses were counted on ${fmtShort(t.date)}.`
    : null;
  return (
    <details>
      <summary className="flex cursor-pointer items-start gap-2 py-2.5 pr-4 pl-7">
        <Icon name="chevronRight" className="chevron mt-0.5 size-3.5 shrink-0 text-muted transition-transform" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{t.name}</span>
          <span className="block text-xs text-muted">{t.vehicleNumber} · {t.driverName}</span>
          {tag && <span className={`chip mt-1 ${tag.cls}`}>{tag.text}</span>}
        </span>
        <span className="shrink-0 text-right">
          <span className={`num block text-sm font-semibold ${e.balance < 0 ? "text-bad" : ""}`}>{inr(e.balance)}</span>
          <span className="num block text-[11px] text-muted">+{inr(e.earned)} / −{inr(e.expenses)}</span>
        </span>
      </summary>
      <div className="flex flex-col gap-1 pr-4 pb-3 pl-12 text-[13px]">
        <div className="flex justify-between"><span className="text-muted">Earning counted this day</span><span className="num">{inr(e.earned)}</span></div>
        {e.kind !== "received" &&
          t.expenses.map((x) => (
            <div key={x.id} className="flex justify-between gap-3"><span className="text-muted">{x.typeName}{x.note ? ` · ${x.note}` : ""}</span><span className="num">−{inr(x.amount)}</span></div>
          ))}
        {note && <p className="mt-1 text-xs text-muted">{note}</p>}
        <Link href={`/trips/${t.id}`} className="mt-1 self-start text-xs font-semibold text-brand hover:underline">Open trip</Link>
      </div>
    </details>
  );
}

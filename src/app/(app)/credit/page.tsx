import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { allOptions, loadTrips } from "@/lib/trips";
import { daysBetween, fmtDate, fmtShort, inr, todayISO } from "@/lib/format";
import { type SearchParams } from "@/lib/params";
import { EmptyState, PageBody, PageHeader } from "@/components/page";
import { AutoFilterForm, DateFilter, SelectFilter } from "@/components/filters";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { filterSummary } from "@/lib/filter-summary";
import { markPaid, undoPaid } from "./actions";

export const metadata: Metadata = { title: "Credit Management" };

export default async function Credit({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireUser();
  const sp = await searchParams;
  const get = (k: string) => (typeof sp[k] === "string" && sp[k] ? (sp[k] as string) : undefined);
  const tab = get("tab") === "paid" ? "paid" : "pending";
  const vehicle = get("vehicle"), driver = get("driver"), from = get("from"), to = get("to");
  const today = todayISO();

  const [{ vehicles, drivers }, pendingAll, paidAll] = await Promise.all([
    allOptions(),
    loadTrips({ credit: "pending", vehicleId: vehicle, driverId: driver }),
    loadTrips({ credit: "paid", vehicleId: vehicle, driverId: driver }),
  ]);
  const inRange = (d: string) => (!from || d >= from) && (!to || d <= to);
  const pending = pendingAll.filter((t) => inRange(t.date)).sort((a, b) => a.date.localeCompare(b.date));
  const paid = paidAll.filter((t) => inRange(t.paidOn!)).sort((a, b) => b.paidOn!.localeCompare(a.paidOn!));
  const outstanding = pending.reduce((a, t) => a + t.earned, 0);
  const tabHref = (t: string) => `/credit?${new URLSearchParams({ ...(vehicle && { vehicle }), ...(driver && { driver }), tab: t })}`;

  return (
    <>
      <PageHeader title="Credit Management" />
      <PageBody>
        <nav aria-label="Credit status" className="grid grid-cols-2 gap-1 rounded-xl bg-[#e3e6e1] p-1">
          {(["pending", "paid"] as const).map((t) => (
            <Link
              key={t}
              href={tabHref(t)}
              aria-current={tab === t ? "page" : undefined}
              className={`flex min-h-10 items-center justify-center rounded-lg text-sm font-semibold ${tab === t ? "bg-surface text-ink shadow-sm" : "text-muted"}`}
            >
              {t === "pending" ? `Pending (${pending.length})` : `Paid (${paid.length})`}
            </Link>
          ))}
        </nav>

        <AutoFilterForm className="grid grid-cols-2 gap-2 md:grid-cols-4" summary={filterSummary({ from, to, picks: [[vehicle, vehicles, "number"], [driver, drivers, "name"]] })}>
          <input type="hidden" name="tab" value={tab} />
          <SelectFilter name="vehicle" label="Vehicle" value={vehicle} allLabel="All vehicles" options={vehicles.map((v) => ({ id: v.id, label: v.number }))} />
          <SelectFilter name="driver" label="Driver" value={driver} allLabel="All drivers" options={drivers.map((d) => ({ id: d.id, label: d.name }))} />
          <DateFilter name="from" label={tab === "paid" ? "Paid from" : "Trip from"} value={from ?? ""} />
          <DateFilter name="to" label={tab === "paid" ? "Paid to" : "Trip to"} value={to ?? ""} max={today} />
        </AutoFilterForm>

        {tab === "pending" ? (
          <>
            <div className="flex items-baseline justify-between rounded-xl border border-credit-line bg-credit-soft px-4 py-3 text-credit">
              <span className="text-sm">Total outstanding · {pending.length} trips</span>
              <span className="num text-2xl font-semibold">{inr(outstanding)}</span>
            </div>
            {pending.length === 0 ? (
              <EmptyState>No pending credits.</EmptyState>
            ) : (
              <ul className="grid gap-2 md:grid-cols-2">
                {pending.map((t) => {
                  const days = daysBetween(t.date, today);
                  return (
                    <li key={t.id} className="card flex flex-col gap-3 p-4">
                      <div className="flex justify-between gap-3">
                        <Link href={`/trips/${t.id}`} className="min-w-0 hover:underline">
                          <span className="block truncate font-semibold">{t.name}</span>
                          <span className="block text-xs text-muted">{fmtShort(t.date)} · {t.vehicleNumber} · {t.driverName}</span>
                        </Link>
                        <span className="shrink-0 text-right">
                          <span className="num block text-lg font-semibold">{inr(t.earned)}</span>
                          <span className="block text-xs text-credit">{days === 0 ? "Today" : `${days} ${days === 1 ? "day" : "days"} pending`}</span>
                        </span>
                      </div>
                      <ConfirmDialog
                        trigger="Mark as Paid"
                        triggerClassName="btn h-11 border border-brand text-brand hover:bg-brand-soft"
                        title="Mark as paid?"
                        confirmLabel="Mark as Paid"
                        hidden={{ id: t.id }}
                        action={markPaid}
                      >
                        <p className="text-sm text-muted">
                          {t.name} · {t.vehicleNumber} · full amount <strong className="text-ink">{inr(t.earned)}</strong>. The earning counts in Daily Balance on the paid date.
                        </p>
                        <label className="label">
                          Paid date
                          <input type="date" name="paidOn" defaultValue={today} min={t.date} max={today} required className="field" />
                        </label>
                      </ConfirmDialog>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        ) : paid.length === 0 ? (
          <EmptyState>No paid credits for these filters.</EmptyState>
        ) : (
          <ul className="card divide-y divide-line-soft">
            {paid.map((t) => (
              <li key={t.id} className="flex items-center gap-3 px-4 py-3">
                <Link href={`/trips/${t.id}`} className="min-w-0 flex-1 hover:underline">
                  <span className="block truncate font-semibold">{t.name}</span>
                  <span className="block text-xs text-muted">Trip {fmtShort(t.date)} · {t.vehicleNumber} · {t.driverName}</span>
                  <span className="block text-xs font-medium text-good">Paid {fmtDate(t.paidOn!)}</span>
                </Link>
                <span className="flex shrink-0 flex-col items-end gap-1.5">
                  <span className="num font-semibold">{inr(t.earned)}</span>
                  <ConfirmDialog
                    trigger="Undo"
                    triggerLabel={`Undo payment for ${t.name}`}
                    triggerClassName="btn-secondary"
                    title="Undo payment?"
                    confirmLabel="Undo"
                    hidden={{ id: t.id }}
                    action={undoPaid}
                  >
                    <p className="text-sm text-muted">
                      {t.name} ({inr(t.earned)}) goes back to Pending and is removed from the balance of {fmtDate(t.paidOn!)}.
                    </p>
                  </ConfirmDialog>
                </span>
              </li>
            ))}
          </ul>
        )}
      </PageBody>
    </>
  );
}

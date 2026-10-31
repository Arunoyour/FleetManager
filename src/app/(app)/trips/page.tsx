import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { allOptions, loadTrips } from "@/lib/trips";
import { fmtShort, inr } from "@/lib/format";
import { parseFilters, type SearchParams } from "@/lib/params";
import { EmptyState, Notice, PageBody, PageHeader } from "@/components/page";
import { AutoFilterForm, DateFilter, SelectFilter } from "@/components/filters";
import { Icon } from "@/components/icon";
import { filterSummary } from "@/lib/filter-summary";
import { CreditTag } from "@/components/tags";

export const metadata: Metadata = { title: "Trips" };

const STATUS = [
  { id: "cash", label: "Cash" },
  { id: "credit", label: "Credit (all)" },
  { id: "pending", label: "Credit – pending" },
  { id: "paid", label: "Credit – paid" },
];

export default async function Trips({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireUser();
  const f = parseFilters(await searchParams);
  const status = STATUS.some((s) => s.id === f.get("status")) ? (f.get("status") as "cash" | "credit" | "pending" | "paid") : undefined;
  const [{ vehicles, drivers, types }, trips] = await Promise.all([
    allOptions(),
    loadTrips({ from: f.from, to: f.to, vehicleId: f.vehicle, driverId: f.driver, typeId: f.type, credit: status }),
  ]);
  const earned = trips.reduce((a, t) => a + t.earned, 0);
  const exp = trips.reduce((a, t) => a + t.expenseTotal, 0);

  return (
    <>
      <PageHeader title="Trips" actions={<Link href="/trips/new" className="btn-primary max-md:hidden"><Icon name="add" /> Add Trip</Link>} />
      <PageBody>
        {f.msg && <Notice>{f.msg}</Notice>}
        <AutoFilterForm
          className="grid grid-cols-2 gap-2 md:grid-cols-6"
          summary={filterSummary({ from: f.from, to: f.to, picks: [[f.vehicle, vehicles, "number"], [f.driver, drivers, "name"], [f.type, types, "name"]], extra: [STATUS.find((s) => s.id === status)?.label] })}
        >
          <DateFilter name="from" label="From" value={f.from} max={f.to} />
          <DateFilter name="to" label="To" value={f.to} min={f.from} />
          <SelectFilter name="vehicle" label="Vehicle" value={f.vehicle} allLabel="All vehicles" options={vehicles.map((v) => ({ id: v.id, label: v.number }))} />
          <SelectFilter name="driver" label="Driver" value={f.driver} allLabel="All drivers" options={drivers.map((d) => ({ id: d.id, label: d.name }))} />
          <SelectFilter name="status" label="Credit status" value={status} allLabel="All trips" options={STATUS} />
          <SelectFilter name="type" label="Has expense type" value={f.type} allLabel="Any expense" options={types.map((t) => ({ id: t.id, label: t.name }))} />
        </AutoFilterForm>

        <div className="card grid grid-cols-3 gap-2 p-3 text-sm">
          <div><div className="text-xs text-muted">{trips.length} trips · earned</div><div className="num font-semibold">{inr(earned)}</div></div>
          <div><div className="text-xs text-muted">Expenses</div><div className="num font-semibold">{inr(exp)}</div></div>
          <div><div className="text-xs text-muted">Trip balance</div><div className={`num font-semibold ${earned - exp < 0 ? "text-bad" : ""}`}>{inr(earned - exp)}</div></div>
        </div>

        {trips.length === 0 ? (
          <EmptyState>No trips match these filters.</EmptyState>
        ) : (
          <ul className="card divide-y divide-line-soft">
            {trips.map((t) => {
              const bal = t.earned - t.expenseTotal;
              return (
                <li key={t.id}>
                  <Link href={`/trips/${t.id}`} className="flex items-start gap-3 px-4 py-3 hover:bg-ground">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{t.name}</span>
                      <span className="block text-xs text-muted">{fmtShort(t.date)} · {t.vehicleNumber} · {t.driverName}</span>
                      <CreditTag trip={t} className="mt-1" />
                    </span>
                    <span className="shrink-0 text-right">
                      <span className={`num block font-semibold ${bal < 0 ? "text-bad" : ""}`}>{inr(bal)}</span>
                      <span className="num block text-xs text-muted">+{inr(t.earned)} / −{inr(t.expenseTotal)}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </PageBody>
    </>
  );
}

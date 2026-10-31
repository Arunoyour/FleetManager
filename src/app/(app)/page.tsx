import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { loadTrips } from "@/lib/trips";
import { dailyBalance } from "@/lib/balance";
import { daysBetween, firstOfMonthISO, fmtShort, inr, todayISO } from "@/lib/format";
import { Notice, PageBody, PageHeader } from "@/components/page";
import { Icon } from "@/components/icon";

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  await requireUser();
  const { msg } = await searchParams;
  const today = todayISO();
  const from = firstOfMonthISO(today);
  const [monthTrips, pending] = await Promise.all([
    loadTrips({ from, to: today, includePaidInRange: true }),
    loadTrips({ credit: "pending" }),
  ]);
  const inMonth = monthTrips.filter((t) => t.date >= from);
  const earned = inMonth.reduce((a, t) => a + t.earned, 0);
  const expenses = inMonth.reduce((a, t) => a + t.expenseTotal, 0);
  const outstanding = pending.reduce((a, t) => a + t.earned, 0);
  const todayBal = dailyBalance(monthTrips, today, today).totals.balance;
  const todayTrips = inMonth.filter((t) => t.date === today).length;

  const byVehicle = new Map<string, { number: string; profit: number }>();
  for (const t of inMonth) {
    const v = byVehicle.get(t.vehicleId) ?? { number: t.vehicleNumber, profit: 0 };
    v.profit += t.earned - t.expenseTotal;
    byVehicle.set(t.vehicleId, v);
  }
  const top = [...byVehicle].sort((a, b) => b[1].profit - a[1].profit).slice(0, 5);
  const oldest = [...pending].sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3);
  const monthName = new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${from}T00:00:00Z`));

  return (
    <>
      <PageHeader title="Dashboard" />
      <PageBody>
        {msg && <Notice>{msg}</Notice>}
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 md:gap-3">
          <Link href="/trips/new" className="btn-primary col-span-2 h-14 text-base md:col-span-1 md:h-12">
            <Icon name="add" /> Add Trip
          </Link>
          <Link href="/balance" className="btn-secondary h-12 text-base">Daily Balance</Link>
          <Link href="/credit" className="btn-secondary h-12 text-base">Credit</Link>
        </div>

        <section aria-labelledby="month" className="flex flex-col gap-2">
          <h2 id="month" className="text-sm font-semibold text-muted">{monthName}</h2>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            <Stat label="Earned" value={inr(earned)} />
            <Stat label="Expenses" value={inr(expenses)} />
            <Stat label="Trip profit" value={inr(earned - expenses)} tone={earned - expenses < 0 ? "bad" : "good"} />
            <Link href="/credit" className="rounded-xl border border-credit-line bg-credit-soft p-3 text-credit">
              <div className="text-xs">Credit outstanding</div>
              <div className="num mt-1 text-xl font-semibold">{inr(outstanding)}</div>
            </Link>
          </div>
        </section>

        <Link href="/balance" className="card flex items-center justify-between p-4">
          <span>
            <span className="block text-xs text-muted">Today, {fmtShort(today)}</span>
            <span className="mt-0.5 block font-medium">{todayTrips} {todayTrips === 1 ? "trip" : "trips"} added</span>
          </span>
          <span className="text-right">
            <span className="block text-xs text-muted">Day balance</span>
            <span className={`num block text-lg font-semibold ${todayBal < 0 ? "text-bad" : ""}`}>{inr(todayBal)}</span>
          </span>
        </Link>

        <div className="grid gap-4 md:grid-cols-2">
          <section aria-labelledby="top" className="flex flex-col gap-2">
            <h2 id="top" className="text-sm font-semibold text-muted">Top vehicles by profit this month</h2>
            <div className="card divide-y divide-line-soft">
              {top.length === 0 && <p className="px-4 py-4 text-sm text-muted">No trips this month yet.</p>}
              {top.map(([id, v]) => (
                <Link key={id} href={`/trips?vehicle=${id}&from=${from}&to=${today}`} className="flex min-h-12 items-center justify-between px-4 py-2 hover:bg-ground">
                  <span className="font-medium">{v.number}</span>
                  <span className={`num font-semibold ${v.profit < 0 ? "text-bad" : ""}`}>{inr(v.profit)}</span>
                </Link>
              ))}
            </div>
          </section>
          <section aria-labelledby="oldest" className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h2 id="oldest" className="text-sm font-semibold text-muted">Oldest pending credits</h2>
              <Link href="/credit" className="btn-ghost -my-2">View all</Link>
            </div>
            <div className="card divide-y divide-line-soft">
              {oldest.length === 0 && <p className="px-4 py-4 text-sm text-muted">No pending credits.</p>}
              {oldest.map((t) => (
                <Link key={t.id} href={`/trips/${t.id}`} className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-ground">
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{t.name}</span>
                    <span className="block text-xs text-muted">{fmtShort(t.date)} · {t.vehicleNumber}</span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="num block font-semibold">{inr(t.earned)}</span>
                    <span className="block text-xs text-credit">{daysBetween(t.date, today)} days pending</span>
                  </span>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </PageBody>
    </>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" }) {
  return (
    <div className="card p-3">
      <div className="text-xs text-muted">{label}</div>
      <div className={`num mt-1 text-xl font-semibold ${tone === "good" ? "text-good" : tone === "bad" ? "text-bad" : ""}`}>{value}</div>
    </div>
  );
}

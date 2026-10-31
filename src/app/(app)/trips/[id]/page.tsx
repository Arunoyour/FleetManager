import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { loadTrip } from "@/lib/trips";
import { fmtDate, inr } from "@/lib/format";
import { Notice, PageBody, PageHeader } from "@/components/page";
import { CreditTag } from "@/components/tags";
import { Icon } from "@/components/icon";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { deleteTrip } from "../actions";

export const metadata: Metadata = { title: "Trip" };

export default async function TripDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ msg?: string }> }) {
  await requireUser();
  const [{ id }, { msg }] = await Promise.all([params, searchParams]);
  const t = await loadTrip(id);
  if (!t) notFound();
  const bal = t.earned - t.expenseTotal;

  return (
    <>
      <PageHeader title="Trip" back={{ href: "/trips", label: "Trips" }} />
      <PageBody>
        {msg && <Notice>{msg}</Notice>}
        <div className="grid gap-4 md:grid-cols-[1fr_320px]">
          <section className="card flex flex-col gap-4 p-4">
            <div>
              <h2 className="text-lg font-semibold">{t.name}</h2>
              <p className="text-sm text-muted">{fmtDate(t.date)}</p>
              <CreditTag trip={t} className="mt-2" />
            </div>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-xs text-muted">Vehicle</dt><dd className="font-medium">{t.vehicleNumber}</dd></div>
              <div><dt className="text-xs text-muted">Driver</dt><dd className="font-medium">{t.driverName}</dd></div>
              <div><dt className="text-xs text-muted">Amount earned</dt><dd className="num font-medium">{inr(t.earned)}</dd></div>
              <div><dt className="text-xs text-muted">Payment</dt><dd className="font-medium">{!t.isCredit ? "Cash" : t.paidOn ? `Credit, paid ${fmtDate(t.paidOn)}` : "Credit, not paid yet"}</dd></div>
            </dl>
            <div>
              <h3 className="mb-2 text-sm font-semibold">Expenses</h3>
              {t.expenses.length === 0 ? (
                <p className="text-sm text-muted">No expenses recorded.</p>
              ) : (
                <ul className="divide-y divide-line-soft rounded-lg border border-line-soft">
                  {t.expenses.map((e) => (
                    <li key={e.id} className="flex justify-between gap-3 px-3 py-2 text-sm">
                      <span>
                        {e.typeName}
                        {e.note && <span className="block text-xs text-muted">{e.note}</span>}
                      </span>
                      <span className="num">{inr(e.amount)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
          <aside className="flex flex-col gap-3">
            <div className="card grid grid-cols-3 gap-2 p-3 md:grid-cols-1">
              <div><div className="text-xs text-muted">Earned</div><div className="num font-semibold">{inr(t.earned)}</div></div>
              <div><div className="text-xs text-muted">Expenses</div><div className="num font-semibold">{inr(t.expenseTotal)}</div></div>
              <div><div className="text-xs text-muted">Trip balance</div><div className={`num font-semibold ${bal < 0 ? "text-bad" : ""}`}>{inr(bal)}</div></div>
            </div>
            <Link href={`/trips/${t.id}/edit`} className="btn-primary h-12 text-base">
              <Icon name="edit" /> Edit trip
            </Link>
            <ConfirmDialog
              trigger="Delete trip"
              triggerClassName="btn-danger h-12 text-base"
              title="Delete this trip?"
              confirmLabel="Delete"
              danger
              hidden={{ id: t.id }}
              action={deleteTrip}
            >
              <p className="text-sm text-muted">
                {t.name} ({t.vehicleNumber}, {fmtDate(t.date)}) will be removed from all screens and reports.
              </p>
            </ConfirmDialog>
          </aside>
        </div>
      </PageBody>
    </>
  );
}

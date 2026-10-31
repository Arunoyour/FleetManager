"use client";

import Link from "next/link";
import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { saveTrip, type TripFormState } from "@/app/(app)/trips/actions";
import { inr, toPaise } from "@/lib/format";
import { Icon } from "./icon";

type Option = { id: string; label: string };
type ExpenseInput = { key: number; typeId: string; amount: string; note: string };

export type TripFormProps = {
  trip?: { id: string; date: string; name: string; vehicleId: string; driverId: string; earned: string; isCredit: boolean; paid: boolean; expenses: { typeId: string; amount: string; note: string }[] };
  vehicle?: Option;
  vehicles: Option[];
  drivers: Option[];
  types: Option[];
  today: string;
};

let nextKey = 1;

export function TripForm({ trip, vehicle, vehicles, drivers, types, today }: TripFormProps) {
  const [state, action, pending] = useActionState<TripFormState, FormData>(saveTrip, null);
  const [earned, setEarned] = useState(trip?.earned ?? "");
  const [isCredit, setIsCredit] = useState(trip?.isCredit ?? false);
  const [rows, setRows] = useState<ExpenseInput[]>(() =>
    trip ? trip.expenses.map((e) => ({ key: nextKey++, ...e })) : [{ key: nextKey++, typeId: types.find((t) => t.label === "Diesel")?.id ?? "", amount: "", note: "" }],
  );
  const errorRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (state?.error) errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [state]);
  const paid = trip?.paid ?? false;
  const totalExp = rows.reduce((a, r) => a + (toPaise(r.amount) ?? 0), 0);
  const earnedP = toPaise(earned) ?? 0;
  const update = (key: number, patch: Partial<ExpenseInput>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        // Submit manually so React does not reset the fields when the server returns an error.
        e.preventDefault();
        const fd = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter);
        startTransition(() => action(fd));
      }}
    >
      {trip && <input type="hidden" name="id" value={trip.id} />}

      {vehicle ? (
        <div className="flex items-center justify-between rounded-xl bg-brand-soft px-4 py-2.5">
          <span>
            <span className="block text-xs text-brand-dark">Vehicle</span>
            <span className="block text-base font-semibold text-brand-dark">{vehicle.label}</span>
          </span>
          <input type="hidden" name="vehicleId" value={vehicle.id} />
          <Link href="/trips/new" className="btn-ghost">Change</Link>
        </div>
      ) : (
        <label className="label">
          Vehicle
          <select name="vehicleId" className="field" defaultValue={trip?.vehicleId} required>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>{v.label}</option>
            ))}
          </select>
        </label>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <label className="label">
          Trip Date
          <input type="date" name="date" className="field" defaultValue={trip?.date ?? today} max={today} required />
        </label>
        <label className="label">
          Driver
          <select name="driverId" className="field" defaultValue={trip?.driverId ?? ""} required>
            <option value="" disabled>Choose a driver</option>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>{d.label}</option>
            ))}
          </select>
        </label>
      </div>

      <label className="label">
        Trip Name
        <input type="text" name="name" className="field" defaultValue={trip?.name} placeholder="e.g. Kochi – Trichy" maxLength={100} required autoComplete="off" />
      </label>

      <label className="label">
        Amount Earned (₹)
        <input
          type="text"
          inputMode="decimal"
          name="earned"
          className="field num"
          value={earned}
          onChange={(e) => setEarned(e.target.value)}
          placeholder="0"
          pattern="\d+(\.\d{1,2})?"
          readOnly={paid}
          required
        />
        {paid && <span className="text-xs font-normal text-muted">Locked: this credit trip is marked paid. Undo it in Credit Management to change the amount.</span>}
      </label>

      <label className={`flex min-h-12 items-center gap-3 rounded-lg border px-3 py-2 text-sm ${isCredit ? "border-credit-line bg-credit-soft" : "border-field bg-surface"} ${paid ? "opacity-70" : "cursor-pointer"}`}>
        <input type="checkbox" name="isCredit" checked={isCredit} onChange={(e) => setIsCredit(e.target.checked)} disabled={paid} className="size-5 accent-brand" />
        {paid && <input type="hidden" name="isCredit" value="on" />}
        <span>
          <span className="font-semibold">Credit</span> · amount not received yet
        </span>
      </label>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-semibold">Expenses</legend>
        {rows.map((r, i) => (
          <div key={r.key} className="card flex flex-col gap-2 p-2 md:flex-row md:items-center md:border-0 md:bg-transparent md:p-0">
            <div className="flex gap-2 md:contents">
              <select name="expenseType" aria-label={`Expense ${i + 1} type`} className="field min-w-0 flex-1" value={r.typeId} onChange={(e) => update(r.key, { typeId: e.target.value })}>
                <option value="">Type</option>
                {types.map((t) => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
              <input
                name="expenseAmount"
                aria-label={`Expense ${i + 1} amount in rupees`}
                inputMode="decimal"
                className="field num w-28 shrink-0 md:w-36"
                placeholder="₹"
                value={r.amount}
                onChange={(e) => update(r.key, { amount: e.target.value })}
              />
              <button type="button" onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))} aria-label={`Remove expense ${i + 1}`} className="btn-secondary size-12 shrink-0 px-0 text-muted md:order-last">
                <Icon name="close" />
              </button>
            </div>
            <input name="expenseNote" aria-label={`Expense ${i + 1} note`} className="field md:flex-1" placeholder="Note (optional)" value={r.note} onChange={(e) => update(r.key, { note: e.target.value })} />
          </div>
        ))}
        <button type="button" onClick={() => setRows((rs) => [...rs, { key: nextKey++, typeId: "", amount: "", note: "" }])} className="btn min-h-12 border border-dashed border-field text-brand hover:bg-brand-soft">
          <Icon name="add" /> Add expense
        </button>
      </fieldset>

      <div className="card grid grid-cols-3 gap-2 p-3">
        <Summary label="Earned" value={inr(earnedP)} />
        <Summary label="Expenses" value={inr(totalExp)} />
        <Summary label="Trip balance" value={inr(earnedP - totalExp)} />
      </div>

      {state?.error && (
        <p ref={errorRef} role="alert" className="scroll-mb-40 rounded-lg bg-bad-soft px-3 py-2.5 text-sm font-medium text-bad">
          {state.error}
        </p>
      )}

      <div className="sticky bottom-[calc(5rem+env(safe-area-inset-bottom))] -mx-4 flex gap-2 border-t border-line bg-ground/95 px-4 py-3 backdrop-blur md:static md:mx-0 md:border-0 md:bg-transparent md:p-0">
        <button type="submit" name="next" value="list" disabled={pending} className="btn-primary h-12 flex-1 text-base">
          {pending ? "Saving…" : trip ? "Save changes" : "Save Trip"}
        </button>
        {!trip && (
          <button type="submit" name="next" value="another" disabled={pending} className="btn-secondary h-12 text-base">
            Save &amp; add another
          </button>
        )}
      </div>
    </form>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted">{label}</div>
      <div className="num text-[15px] font-semibold">{value}</div>
    </div>
  );
}

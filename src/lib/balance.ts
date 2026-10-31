import type { TripRow } from "./trips";

export type EntryKind = "cash" | "pending" | "paidLater" | "received";

export type BalanceEntry = {
  key: string;
  kind: EntryKind;
  trip: TripRow;
  /** Earning that counts on this day (paise). */
  earned: number;
  /** Expenses that count on this day (paise). */
  expenses: number;
  balance: number;
};

export type BalanceDay = {
  date: string;
  trips: number;
  cash: number;
  creditReceived: number;
  expenses: number;
  balance: number;
  entries: BalanceEntry[];
};

/**
 * Cash-basis daily balance (decision "Option A"):
 * - cash trip: earning and expenses on the trip date
 * - credit trip: expenses on the trip date, earning on the date it was marked paid
 */
export function dailyBalance(trips: TripRow[], from: string, to: string) {
  const days = new Map<string, BalanceDay>();
  const day = (d: string) => {
    let v = days.get(d);
    if (!v) days.set(d, (v = { date: d, trips: 0, cash: 0, creditReceived: 0, expenses: 0, balance: 0, entries: [] }));
    return v;
  };
  const inRange = (d: string) => d >= from && d <= to;

  for (const t of trips) {
    if (inRange(t.date)) {
      const kind: EntryKind = !t.isCredit ? "cash" : t.paidOn ? "paidLater" : "pending";
      const earned = kind === "cash" ? t.earned : 0;
      const d = day(t.date);
      d.trips += 1;
      d.cash += earned;
      d.expenses += t.expenseTotal;
      d.entries.push({ key: `${t.id}:${kind}`, kind, trip: t, earned, expenses: t.expenseTotal, balance: earned - t.expenseTotal });
    }
    if (t.isCredit && t.paidOn && inRange(t.paidOn)) {
      const d = day(t.paidOn);
      d.creditReceived += t.earned;
      d.entries.push({ key: `${t.id}:received`, kind: "received", trip: t, earned: t.earned, expenses: 0, balance: t.earned });
    }
  }

  const list = [...days.values()].sort((a, b) => b.date.localeCompare(a.date));
  for (const d of list) {
    d.balance = d.cash + d.creditReceived - d.expenses;
    d.entries.sort((a, b) => Number(a.kind === "received") - Number(b.kind === "received"));
  }
  const totals = list.reduce(
    (a, d) => ({ cash: a.cash + d.cash, creditReceived: a.creditReceived + d.creditReceived, expenses: a.expenses + d.expenses, balance: a.balance + d.balance }),
    { cash: 0, creditReceived: 0, expenses: 0, balance: 0 },
  );
  return { days: list, totals };
}

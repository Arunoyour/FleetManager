import { firstOfMonthISO, isISODate, todayISO } from "./format";

export type SearchParams = Record<string, string | string[] | undefined>;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;

/** Common list/report filters with the current month as the default range. */
export function parseFilters(sp: SearchParams) {
  const today = todayISO();
  let from = one(sp.from);
  let to = one(sp.to);
  if (!isISODate(from)) from = firstOfMonthISO(today);
  if (!isISODate(to)) to = today;
  if (from > to) [from, to] = [to, from];
  return {
    from,
    to,
    vehicle: one(sp.vehicle),
    driver: one(sp.driver),
    type: one(sp.type),
    msg: one(sp.msg),
    get: (k: string) => one(sp[k]),
  };
}

export function query(params: Record<string, string | undefined>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) p.set(k, v);
  return p.toString();
}

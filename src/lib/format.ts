const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Formats paise as Indian rupees, e.g. 12500000 -> "₹1,25,000". */
export function inr(paise: number): string {
  const rupees = paise / 100;
  const sign = rupees < 0 ? "−" : "";
  const abs = Math.abs(rupees);
  const digits = Number.isInteger(abs) ? 0 : 2;
  return `${sign}₹${abs.toLocaleString("en-IN", { minimumFractionDigits: digits, maximumFractionDigits: 2 })}`;
}

/** Parses a rupee amount typed by the user into integer paise. Returns null when invalid. */
export function toPaise(input: FormDataEntryValue | string | null | undefined): number | null {
  if (input === null || input === undefined) return null;
  const s = String(input).trim().replace(/,/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  return Math.round(Number(s) * 100);
}

export function paiseToInput(paise: number): string {
  return paise % 100 === 0 ? String(paise / 100) : (paise / 100).toFixed(2);
}

/** Today's date in India as YYYY-MM-DD. */
export function todayISO(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
}

export function firstOfMonthISO(iso = todayISO()): string {
  return iso.slice(0, 8) + "01";
}

export function isISODate(s: unknown): s is string {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
}

/** A @db.Date value as YYYY-MM-DD. */
export function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function dateFromISO(s: string): Date {
  return new Date(`${s}T00:00:00.000Z`);
}

/** "2026-10-31" -> "31-Oct-2026" (spec format DD-MMM-YYYY). */
export function fmtDate(s: string): string {
  return `${s.slice(8)}-${MONTHS[Number(s.slice(5, 7)) - 1]}-${s.slice(0, 4)}`;
}

/** "2026-10-31" -> "31 Oct". */
export function fmtShort(s: string): string {
  return `${Number(s.slice(8))} ${MONTHS[Number(s.slice(5, 7)) - 1]}`;
}

export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);
}

export function normaliseVehicleNumber(s: string): string {
  return s.toUpperCase().replace(/[\s-]/g, "");
}

import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { dateFromISO, iso } from "./format";

export type TripExpenseRow = { id: string; typeId: string; typeName: string; amount: number; note: string | null };

export type TripRow = {
  id: string;
  date: string;
  name: string;
  vehicleId: string;
  vehicleNumber: string;
  driverId: string;
  driverName: string;
  earned: number;
  isCredit: boolean;
  paidOn: string | null;
  expenses: TripExpenseRow[];
  expenseTotal: number;
};

export type TripFilter = {
  from?: string;
  to?: string;
  vehicleId?: string;
  driverId?: string;
  /** Only trips with at least one expense of this type. */
  typeId?: string;
  credit?: "pending" | "paid" | "cash" | "credit";
  /** Also include trips whose credit was paid inside [from, to] (for cash-basis balances). */
  includePaidInRange?: boolean;
};

const include = {
  vehicle: { select: { number: true } },
  driver: { select: { name: true } },
  expenses: { include: { expenseType: { select: { name: true } } }, orderBy: { id: "asc" } },
} satisfies Prisma.TripInclude;

type TripWithRelations = Prisma.TripGetPayload<{ include: typeof include }>;

function toRow(t: TripWithRelations): TripRow {
  const expenses = t.expenses.map((e) => ({ id: e.id, typeId: e.expenseTypeId, typeName: e.expenseType.name, amount: e.amountPaise, note: e.note }));
  return {
    id: t.id,
    date: iso(t.tripDate),
    name: t.name,
    vehicleId: t.vehicleId,
    vehicleNumber: t.vehicle.number,
    driverId: t.driverId,
    driverName: t.driver.name,
    earned: t.amountEarnedPaise,
    isCredit: t.isCredit,
    paidOn: t.creditPaidOn ? iso(t.creditPaidOn) : null,
    expenses,
    expenseTotal: expenses.reduce((a, e) => a + e.amount, 0),
  };
}

export async function loadTrips(f: TripFilter = {}): Promise<TripRow[]> {
  const dateRange: Prisma.DateTimeFilter = {};
  if (f.from) dateRange.gte = dateFromISO(f.from);
  if (f.to) dateRange.lte = dateFromISO(f.to);
  const hasRange = f.from || f.to;

  const where: Prisma.TripWhereInput = { isDeleted: false };
  if (f.vehicleId) where.vehicleId = f.vehicleId;
  if (f.driverId) where.driverId = f.driverId;
  if (f.typeId) where.expenses = { some: { expenseTypeId: f.typeId } };
  if (f.credit === "pending") Object.assign(where, { isCredit: true, creditPaidOn: null });
  if (f.credit === "paid") Object.assign(where, { isCredit: true, creditPaidOn: { not: null } });
  if (f.credit === "cash") where.isCredit = false;
  if (f.credit === "credit") where.isCredit = true;
  if (hasRange) {
    where.OR = f.includePaidInRange ? [{ tripDate: dateRange }, { creditPaidOn: dateRange }] : [{ tripDate: dateRange }];
  }

  const trips = await db.trip.findMany({ where, include, orderBy: [{ tripDate: "desc" }, { createdAt: "desc" }] });
  return trips.map(toRow);
}

export async function loadTrip(id: string): Promise<TripRow | null> {
  const t = await db.trip.findFirst({ where: { id, isDeleted: false }, include });
  return t ? toRow(t) : null;
}

export async function activeOptions() {
  const [vehicles, drivers, types] = await Promise.all([
    db.vehicle.findMany({ where: { isActive: true }, orderBy: { number: "asc" } }),
    db.driver.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    db.expenseType.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);
  return { vehicles, drivers, types };
}

export async function allOptions() {
  const [vehicles, drivers, types] = await Promise.all([
    db.vehicle.findMany({ orderBy: [{ isActive: "desc" }, { number: "asc" }] }),
    db.driver.findMany({ orderBy: [{ isActive: "desc" }, { name: "asc" }] }),
    db.expenseType.findMany({ orderBy: [{ isActive: "desc" }, { name: "asc" }] }),
  ]);
  return { vehicles, drivers, types };
}

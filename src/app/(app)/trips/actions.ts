"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { dateFromISO, isISODate, iso, todayISO, toPaise } from "@/lib/format";

export type TripFormState = { error: string } | null;

export async function saveTrip(_prev: TripFormState, fd: FormData): Promise<TripFormState> {
  await requireUser();
  const id = String(fd.get("id") ?? "") || null;
  const date = String(fd.get("date") ?? "");
  const name = String(fd.get("name") ?? "").trim();
  const vehicleId = String(fd.get("vehicleId") ?? "");
  const driverId = String(fd.get("driverId") ?? "");
  const earned = toPaise(fd.get("earned"));
  const isCredit = fd.get("isCredit") === "on";

  if (!isISODate(date)) return { error: "Enter a valid trip date." };
  if (date > todayISO()) return { error: "Trip date cannot be in the future." };
  if (!name) return { error: "Enter a trip name." };
  if (name.length > 100) return { error: "Trip name can be at most 100 characters." };
  if (earned === null) return { error: "Enter the amount earned (0 or more, up to 2 decimals)." };

  const types = fd.getAll("expenseType").map(String);
  const amounts = fd.getAll("expenseAmount").map(String);
  const notes = fd.getAll("expenseNote").map(String);
  const expenses: { expenseTypeId: string; amountPaise: number; note: string | null }[] = [];
  for (let i = 0; i < types.length; i++) {
    if (!types[i] && !amounts[i]?.trim()) continue;
    const amt = toPaise(amounts[i]);
    if (!types[i]) return { error: `Choose an expense type for expense ${i + 1}.` };
    if (amt === null || amt <= 0) return { error: `Expense ${i + 1}: amount must be more than 0.` };
    expenses.push({ expenseTypeId: types[i], amountPaise: amt, note: notes[i]?.trim() || null });
  }

  const [vehicle, driver] = await Promise.all([db.vehicle.findUnique({ where: { id: vehicleId } }), db.driver.findUnique({ where: { id: driverId } })]);
  const existing = id ? await db.trip.findFirst({ where: { id, isDeleted: false } }) : null;
  if (id && !existing) return { error: "This trip no longer exists." };
  // Inactive masters stay valid on trips that already use them.
  if (!vehicle || (!vehicle.isActive && existing?.vehicleId !== vehicleId)) return { error: "Choose an active vehicle." };
  if (!driver || (!driver.isActive && existing?.driverId !== driverId)) return { error: "Choose an active driver." };
  if (expenses.length) {
    const known = await db.expenseType.findMany({ where: { id: { in: expenses.map((e) => e.expenseTypeId) } } });
    if (known.length !== new Set(expenses.map((e) => e.expenseTypeId)).size) return { error: "One of the expense types no longer exists." };
  }

  if (existing?.creditPaidOn) {
    if (existing.amountEarnedPaise !== earned || !isCredit)
      return { error: "This credit trip is already marked paid. Undo the payment in Credit Management before changing the amount or the credit tick." };
    if (date > iso(existing.creditPaidOn)) return { error: "Trip date cannot be after the date it was paid." };
  }

  const data = { tripDate: dateFromISO(date), name, vehicleId, driverId, amountEarnedPaise: earned, isCredit, creditPaidOn: isCredit ? existing?.creditPaidOn ?? null : null };
  let tripId = id;
  if (existing) {
    await db.$transaction([db.tripExpense.deleteMany({ where: { tripId: existing.id } }), db.trip.update({ where: { id: existing.id }, data: { ...data, expenses: { create: expenses } } })]);
  } else {
    tripId = (await db.trip.create({ data: { ...data, expenses: { create: expenses } } })).id;
  }
  revalidatePath("/", "layout");
  const msg = existing ? "Trip updated." : `Trip saved: ${name} (${vehicle.number})${isCredit ? ", marked as credit" : ""}.`;
  if (fd.get("next") === "another") redirect(`/trips/new/${vehicleId}?msg=${encodeURIComponent(msg)}`);
  redirect(existing ? `/trips/${tripId}?msg=${encodeURIComponent(msg)}` : `/trips?vehicle=${vehicleId}&msg=${encodeURIComponent(msg)}`);
}

export async function deleteTrip(_prev: unknown, fd: FormData): Promise<{ error?: string }> {
  await requireUser();
  const id = String(fd.get("id") ?? "");
  const trip = await db.trip.findFirst({ where: { id, isDeleted: false } });
  if (trip) await db.trip.update({ where: { id }, data: { isDeleted: true } });
  revalidatePath("/", "layout");
  redirect(`/trips?msg=${encodeURIComponent(trip ? `Deleted trip ${trip.name}.` : "Trip was already deleted.")}`);
}

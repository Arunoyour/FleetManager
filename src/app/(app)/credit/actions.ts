"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { dateFromISO, isISODate, iso, todayISO } from "@/lib/format";
import type { ActionResult } from "@/components/confirm-dialog";

export async function markPaid(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  await requireUser();
  const id = String(fd.get("id") ?? "");
  const paidOn = String(fd.get("paidOn") ?? "");
  const trip = await db.trip.findFirst({ where: { id, isDeleted: false, isCredit: true } });
  if (!trip) return { error: "This credit trip no longer exists." };
  if (trip.creditPaidOn) return { error: "This trip is already marked paid." };
  if (!isISODate(paidOn)) return { error: "Choose the paid date." };
  if (paidOn < iso(trip.tripDate) || paidOn > todayISO()) return { error: "Paid date must be between the trip date and today." };
  await db.trip.update({ where: { id }, data: { creditPaidOn: dateFromISO(paidOn) } });
  revalidatePath("/", "layout");
  return { done: true };
}

export async function undoPaid(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  await requireUser();
  const id = String(fd.get("id") ?? "");
  const trip = await db.trip.findFirst({ where: { id, isDeleted: false, isCredit: true } });
  if (!trip?.creditPaidOn) return { error: "This trip is not marked paid." };
  await db.trip.update({ where: { id }, data: { creditPaidOn: null } });
  revalidatePath("/", "layout");
  return { done: true };
}

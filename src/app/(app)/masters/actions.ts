"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { findUserByPin, hashPin, isValidPin, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { normaliseVehicleNumber } from "@/lib/format";

export type MasterFormState = { error: string } | null;
export type MasterKind = "vehicles" | "drivers" | "expense-types" | "pins";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const done = (kind: MasterKind, msg: string): never => {
  revalidatePath("/", "layout");
  redirect(`/masters/${kind}?msg=${encodeURIComponent(msg)}`);
};
const isUniqueError = (e: unknown) => e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";

export async function saveVehicle(_p: MasterFormState, fd: FormData): Promise<MasterFormState> {
  await requireUser();
  const id = str(fd, "id");
  const number = normaliseVehicleNumber(str(fd, "number"));
  const name = str(fd, "name");
  const type = str(fd, "type");
  const notes = str(fd, "notes");
  if (!number) return { error: "Enter the vehicle number." };
  if (!/^[A-Z0-9]{4,15}$/.test(number)) return { error: "Vehicle number should be 4–15 letters and digits, e.g. KL07AB1234." };
  if (name.length > 50) return { error: "Name can be at most 50 characters." };
  const data = { number, name: name || null, type: type || null, notes: notes || null };
  try {
    if (id) await db.vehicle.update({ where: { id }, data });
    else await db.vehicle.create({ data });
  } catch (e) {
    if (isUniqueError(e)) return { error: `${number} already exists.` };
    throw e;
  }
  return done("vehicles", id ? `${number} updated.` : `${number} added.`);
}

export async function saveDriver(_p: MasterFormState, fd: FormData): Promise<MasterFormState> {
  await requireUser();
  const id = str(fd, "id");
  const name = str(fd, "name");
  const mobile = str(fd, "mobile").replace(/\s/g, "");
  const notes = str(fd, "notes");
  if (!name) return { error: "Enter the driver name." };
  if (name.length > 60) return { error: "Name can be at most 60 characters." };
  if (mobile && !/^\d{10}$/.test(mobile)) return { error: "Mobile number must be 10 digits." };
  const data = { name, mobile: mobile || null, notes: notes || null };
  try {
    if (id) await db.driver.update({ where: { id }, data });
    else await db.driver.create({ data });
  } catch (e) {
    if (isUniqueError(e)) return { error: "This mobile number is already used by another driver." };
    throw e;
  }
  return done("drivers", id ? `${name} updated.` : `${name} added.`);
}

export async function saveExpenseType(_p: MasterFormState, fd: FormData): Promise<MasterFormState> {
  await requireUser();
  const id = str(fd, "id");
  const name = str(fd, "name");
  if (!name) return { error: "Enter the expense type name." };
  if (name.length > 40) return { error: "Name can be at most 40 characters." };
  const data = { name, nameKey: name.toLowerCase() };
  try {
    if (id) await db.expenseType.update({ where: { id }, data });
    else await db.expenseType.create({ data });
  } catch (e) {
    if (isUniqueError(e)) return { error: `${name} already exists.` };
    throw e;
  }
  return done("expense-types", id ? `${name} updated.` : `${name} added.`);
}

export async function savePin(_p: MasterFormState, fd: FormData): Promise<MasterFormState> {
  await requireUser();
  const id = str(fd, "id");
  const name = str(fd, "name");
  const pin = str(fd, "pin");
  const pin2 = str(fd, "pin2");
  if (!name) return { error: "Enter who this PIN belongs to." };
  if (!id || pin) {
    if (!isValidPin(pin)) return { error: "PIN must be exactly 6 digits." };
    if (pin !== pin2) return { error: "The two PINs do not match." };
    if (await findUserByPin(pin, { includeInactive: true, excludeId: id || undefined })) return { error: "This PIN is already in use. Choose another." };
  }
  const pinHash = pin ? await hashPin(pin) : undefined;
  if (id) await db.user.update({ where: { id }, data: { name, ...(pinHash && { pinHash }) } });
  else await db.user.create({ data: { name, pinHash: pinHash! } });
  return done("pins", id ? (pin ? `PIN changed for ${name}.` : `${name} updated.`) : `PIN added for ${name}.`);
}

export async function toggleActive(fd: FormData) {
  await requireUser();
  const kind = str(fd, "kind") as MasterKind;
  const id = str(fd, "id");
  const backRaw = str(fd, "back");
  const back = backRaw.startsWith(`/masters/${kind}`) ? backRaw : `/masters/${kind}`;
  const go = (msg: string, bad = false): never => {
    revalidatePath("/", "layout");
    const sep = back.includes("?") ? "&" : "?";
    redirect(`${back}${sep}${bad ? "err" : "msg"}=${encodeURIComponent(msg)}`);
  };
  if (kind === "vehicles") {
    const v = await db.vehicle.findUniqueOrThrow({ where: { id } });
    await db.vehicle.update({ where: { id }, data: { isActive: !v.isActive } });
    go(`${v.number} ${v.isActive ? "deactivated" : "activated"}.`);
  }
  if (kind === "drivers") {
    const d = await db.driver.findUniqueOrThrow({ where: { id } });
    await db.driver.update({ where: { id }, data: { isActive: !d.isActive } });
    go(`${d.name} ${d.isActive ? "deactivated" : "activated"}.`);
  }
  if (kind === "expense-types") {
    const t = await db.expenseType.findUniqueOrThrow({ where: { id } });
    await db.expenseType.update({ where: { id }, data: { isActive: !t.isActive } });
    go(`${t.name} ${t.isActive ? "deactivated" : "activated"}.`);
  }
  if (kind === "pins") {
    const u = await db.user.findUniqueOrThrow({ where: { id } });
    if (u.isActive && (await db.user.count({ where: { isActive: true } })) <= 1) go("The last active PIN cannot be deactivated.", true);
    await db.$transaction([
      db.user.update({ where: { id }, data: { isActive: !u.isActive } }),
      // A deactivated PIN is signed out everywhere.
      ...(u.isActive ? [db.session.deleteMany({ where: { userId: id } })] : []),
    ]);
    go(`${u.name}'s PIN ${u.isActive ? "deactivated" : "activated"}.`);
  }
  go("Unknown record type.", true);
}

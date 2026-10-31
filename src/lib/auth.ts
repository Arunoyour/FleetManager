import "server-only";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { hash, verify } from "@node-rs/argon2";
import { db } from "./db";

const SESSION_COOKIE = "fm_session";
const DEVICE_COOKIE = "fm_device";
const SESSION_DAYS = 30;
const IDLE_MINUTES = 15;
export const MAX_TRIES = 5;
const COOL_DOWN_MINUTES = 5;

export type SessionUser = { id: string; name: string };

export function hashPin(pin: string) {
  return hash(pin);
}

export function isValidPin(pin: string) {
  return /^\d{6}$/.test(pin);
}

/** Finds the active user whose PIN matches. PINs are hashed, so each active user is checked. */
export async function findUserByPin(pin: string, opts: { includeInactive?: boolean; excludeId?: string } = {}) {
  const users = await db.user.findMany({
    where: { ...(opts.includeInactive ? {} : { isActive: true }), ...(opts.excludeId ? { id: { not: opts.excludeId } } : {}) },
  });
  for (const u of users) {
    if (await verify(u.pinHash, pin)) return u;
  }
  return null;
}

/** The signed-in user, or null when signed out, expired or idle for more than 15 minutes. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const id = jar.get(SESSION_COOKIE)?.value;
  if (!id) return null;
  const session = await db.session.findUnique({ where: { id }, include: { user: true } });
  if (!session || !session.user.isActive) return null;
  const now = Date.now();
  const idle = now - session.lastSeenAt.getTime() > IDLE_MINUTES * 60_000;
  if (session.expiresAt.getTime() < now || idle) {
    await db.session.delete({ where: { id } }).catch(() => {});
    return null;
  }
  if (now - session.lastSeenAt.getTime() > 60_000) {
    await db.session.update({ where: { id }, data: { lastSeenAt: new Date(now) } });
  }
  return { id: session.user.id, name: session.user.name };
}

/** Use at the top of every protected page and server action. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

async function deviceKey() {
  const jar = await cookies();
  let key = jar.get(DEVICE_COOKIE)?.value;
  if (!key) {
    key = randomBytes(16).toString("base64url");
    jar.set(DEVICE_COOKIE, key, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 365, path: "/" });
  }
  return key;
}

export type LoginResult = { ok: true } | { ok: false; message: string; lockedUntil?: number };

export async function attemptLogin(pin: string): Promise<LoginResult> {
  const key = await deviceKey();
  const throttle = await db.loginThrottle.findUnique({ where: { key } });
  if (throttle?.lockedUntil && throttle.lockedUntil.getTime() > Date.now()) {
    return { ok: false, message: "Too many wrong tries. Try again in a few minutes.", lockedUntil: throttle.lockedUntil.getTime() };
  }
  const user = isValidPin(pin) ? await findUserByPin(pin) : null;
  if (!user) {
    const failures = (throttle?.lockedUntil ? 0 : throttle?.failures ?? 0) + 1;
    if (failures >= MAX_TRIES) {
      const lockedUntil = new Date(Date.now() + COOL_DOWN_MINUTES * 60_000);
      await db.loginThrottle.upsert({ where: { key }, create: { key, failures: 0, lockedUntil }, update: { failures: 0, lockedUntil } });
      return { ok: false, message: `Too many wrong tries. Wait ${COOL_DOWN_MINUTES} minutes.`, lockedUntil: lockedUntil.getTime() };
    }
    await db.loginThrottle.upsert({ where: { key }, create: { key, failures }, update: { failures, lockedUntil: null } });
    const left = MAX_TRIES - failures;
    return { ok: false, message: `Wrong PIN. ${left} ${left === 1 ? "try" : "tries"} left before a ${COOL_DOWN_MINUTES}-minute wait.` };
  }
  await db.loginThrottle.deleteMany({ where: { key } });
  const id = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await db.session.create({ data: { id, userId: user.id, expiresAt } });
  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, id, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", expires: expiresAt, path: "/" });
  return { ok: true };
}

export async function logout() {
  const jar = await cookies();
  const id = jar.get(SESSION_COOKIE)?.value;
  if (id) await db.session.deleteMany({ where: { id } });
  jar.delete(SESSION_COOKIE);
}

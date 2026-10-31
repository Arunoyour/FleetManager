"use server";

import { redirect } from "next/navigation";
import { attemptLogin, logout } from "@/lib/auth";

export type LoginState = { message: string; lockedUntil?: number } | null;

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const pin = String(formData.get("pin") ?? "");
  const result = await attemptLogin(pin);
  if (!result.ok) return { message: result.message, lockedUntil: result.lockedUntil };
  redirect("/");
}

export async function logoutAction() {
  await logout();
  redirect("/login");
}

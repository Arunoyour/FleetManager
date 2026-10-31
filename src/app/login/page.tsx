import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { PinPad } from "./pin-pad";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage() {
  if (await getSessionUser()) redirect("/");
  return (
    <main className="flex min-h-dvh flex-col items-center bg-ink px-6 pt-[max(4rem,env(safe-area-inset-top))] pb-8 text-white">
      <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M2 6h11v10H2z" />
        <path d="M13 9h4l3 3.5V16h-7z" />
        <circle cx="6" cy="17.5" r="1.8" />
        <circle cx="17" cy="17.5" r="1.8" />
      </svg>
      <h1 className="mt-5 text-2xl font-semibold">Fleet Manager</h1>
      <p className="mt-2 text-[15px] text-[#c9d1cc]">Enter your 6-digit MPIN</p>
      <PinPad />
    </main>
  );
}

"use client";

import { useActionState, useEffect, useRef, useState, startTransition } from "react";
import { loginAction, type LoginState } from "./actions";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"];

export function PinPad() {
  const [pin, setPin] = useState("");
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, null);
  const [now, setNow] = useState(() => Date.now());
  const formRef = useRef<HTMLFormElement>(null);
  const locked = !!state?.lockedUntil && state.lockedUntil > now;

  // Tick while locked so the keypad re-enables when the cool-down ends.
  useEffect(() => {
    if (!state?.lockedUntil) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [state?.lockedUntil]);

  // A wrong PIN clears the dots.
  useEffect(() => {
    if (state) setPin("");
  }, [state]);

  const press = (k: string) => {
    if (pending || locked) return;
    if (k === "del") return setPin((p) => p.slice(0, -1));
    if (pin.length >= 6) return;
    const next = pin + k;
    setPin(next);
    if (next.length === 6) {
      const fd = new FormData();
      fd.set("pin", next);
      startTransition(() => action(fd));
    }
  };

  // Physical keyboard support (laptop).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === "Backspace") press("del");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const secondsLeft = locked ? Math.ceil((state!.lockedUntil! - now) / 1000) : 0;
  const message = locked
    ? `Too many wrong tries. Try again in ${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, "0")}.`
    : state && !state.lockedUntil
      ? state.message
      : "";

  return (
    <form ref={formRef} className="mt-6 flex w-full max-w-[280px] flex-col items-center" onSubmit={(e) => e.preventDefault()}>
      <div className="flex gap-4" role="img" aria-label={`${pin.length} of 6 digits entered`}>
        {Array.from({ length: 6 }, (_, i) => (
          <span key={i} className={`size-3.5 rounded-full border-2 border-white ${i < pin.length ? "bg-white" : ""}`} />
        ))}
      </div>
      <p role="status" aria-live="polite" className="mt-4 min-h-10 text-center text-sm text-[#f1c27d]">
        {pending ? "Checking…" : message}
      </p>
      <div className="mt-2 grid w-full grid-cols-3 gap-3.5">
        {KEYS.map((k, i) =>
          k === "" ? (
            <span key={i} />
          ) : (
            <button
              key={i}
              type="button"
              onClick={() => press(k)}
              disabled={pending || locked}
              aria-label={k === "del" ? "Delete digit" : `Digit ${k}`}
              className="h-16 rounded-full border border-[#3a4540] bg-[#222c28] text-2xl text-white transition-colors active:bg-[#34403b] disabled:opacity-40"
            >
              {k === "del" ? "⌫" : k}
            </button>
          ),
        )}
      </div>
    </form>
  );
}

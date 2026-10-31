"use client";

import { useActionState, useEffect, useRef } from "react";

export type ActionResult = { error?: string; done?: boolean } | null;

type Props = {
  trigger: React.ReactNode;
  triggerClassName: string;
  triggerLabel?: string;
  title: string;
  confirmLabel: string;
  danger?: boolean;
  hidden: Record<string, string>;
  action: (prev: ActionResult, fd: FormData) => Promise<ActionResult>;
  children?: React.ReactNode;
};

/** A button that opens a confirmation sheet (bottom sheet on phones, centred dialog on larger screens). */
export function ConfirmDialog({ trigger, triggerClassName, triggerLabel, title, confirmLabel, danger, hidden, action, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [state, formAction, pending] = useActionState(action, null);

  useEffect(() => {
    if (state?.done) ref.current?.close();
  }, [state]);

  return (
    <>
      <button type="button" className={triggerClassName} aria-label={triggerLabel} onClick={() => ref.current?.showModal()}>
        {trigger}
      </button>
      <dialog
        ref={ref}
        aria-label={title}
        className="m-0 mt-auto w-full max-w-none rounded-t-2xl bg-surface p-0 text-ink backdrop:bg-ink/50 sm:m-auto sm:max-w-md sm:rounded-2xl"
        onClick={(e) => {
          if (e.target === ref.current) ref.current?.close();
        }}
      >
        <form action={formAction} className="flex flex-col gap-4 px-4 pt-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-6">
          {Object.entries(hidden).map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))}
          <h2 className="text-lg font-semibold">{title}</h2>
          {children}
          {state?.error && (
            <p role="alert" className="text-sm font-medium text-bad">
              {state.error}
            </p>
          )}
          <div className="flex gap-2">
            <button type="button" className="btn-secondary h-12 flex-1 text-base" onClick={() => ref.current?.close()}>
              Cancel
            </button>
            <button type="submit" disabled={pending} className={`btn h-12 flex-1 text-base text-white ${danger ? "bg-bad hover:bg-bad/90" : "bg-brand hover:bg-brand-dark"}`}>
              {pending ? "Working…" : confirmLabel}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}

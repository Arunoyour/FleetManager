"use client";

import Link from "next/link";
import { startTransition, useActionState } from "react";
import type { MasterFormState } from "@/app/(app)/masters/actions";

export type FieldDef = {
  name: string;
  label: string;
  defaultValue?: string;
  type?: "text" | "tel" | "password";
  inputMode?: "text" | "numeric" | "tel";
  maxLength?: number;
  placeholder?: string;
  required?: boolean;
  hint?: string;
};

export function MasterForm({
  title, fields, id, action, cancelHref,
}: {
  title: string; fields: FieldDef[]; id?: string; cancelHref: string;
  action: (prev: MasterFormState, fd: FormData) => Promise<MasterFormState>;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <section aria-labelledby="master-form-title" className="card border-brand/40 p-4">
      <h2 id="master-form-title" className="mb-3 text-lg font-semibold">{title}</h2>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          startTransition(() => formAction(fd));
        }}
      >
        {id && <input type="hidden" name="id" value={id} />}
        <div className="grid gap-4 md:grid-cols-2">
          {fields.map((f, i) => (
            <label key={f.name} className="label">
              {f.label}
              <input
                name={f.name}
                type={f.type ?? "text"}
                inputMode={f.inputMode}
                maxLength={f.maxLength}
                placeholder={f.placeholder}
                defaultValue={f.defaultValue}
                required={f.required}
                autoFocus={i === 0}
                autoComplete="off"
                className="field"
              />
              {f.hint && <span className="text-xs font-normal text-muted">{f.hint}</span>}
            </label>
          ))}
        </div>
        {state?.error && <p role="alert" className="rounded-lg bg-bad-soft px-3 py-2.5 text-sm font-medium text-bad">{state.error}</p>}
        <div className="flex gap-2">
          <Link href={cancelHref} className="btn-secondary h-12 flex-1 text-base md:flex-none">Cancel</Link>
          <button type="submit" disabled={pending} className="btn-primary h-12 flex-1 text-base md:flex-none md:px-8">{pending ? "Saving…" : "Save"}</button>
        </div>
      </form>
    </section>
  );
}

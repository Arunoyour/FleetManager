"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { Icon } from "./icon";

/**
 * GET form that applies its filters as soon as a field changes.
 * On phones the fields fold behind a "Filters" button showing the current summary.
 */
export function AutoFilterForm({ children, className = "", summary }: { children: React.ReactNode; className?: string; summary?: string }) {
  const router = useRouter();
  const path = usePathname();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const apply = (form: HTMLFormElement) => {
    const params = new URLSearchParams();
    for (const [k, v] of new FormData(form)) if (String(v)) params.set(k, String(v));
    start(() => router.replace(`${path}?${params}`, { scroll: false }));
  };
  return (
    <div className="no-print">
      {summary && (
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="card flex min-h-12 w-full items-center gap-2 px-3 text-left text-sm md:hidden"
        >
          <span className="font-semibold">Filters</span>
          <span className="min-w-0 flex-1 truncate text-muted">{summary}</span>
          <Icon name="chevronDown" className={`size-4 shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      )}
      <form
        role="search"
        aria-busy={pending}
        className={`${className} ${summary && !open ? "max-md:hidden" : ""} ${summary ? "max-md:mt-2" : ""} ${pending ? "opacity-70" : ""}`}
        onChange={(e) => apply(e.currentTarget)}
        onSubmit={(e) => {
          e.preventDefault();
          apply(e.currentTarget);
        }}
      >
        {children}
      </form>
    </div>
  );
}

export function SelectFilter({ name, label, value, options, allLabel }: { name: string; label: string; value?: string; options: { id: string; label: string }[]; allLabel: string }) {
  return (
    <label className="label text-xs">
      {label}
      <select name={name} defaultValue={value ?? ""} className="field h-11 text-[15px]">
        <option value="">{allLabel}</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}

export function DateFilter({ name, label, value, min, max }: { name: string; label: string; value: string; min?: string; max?: string }) {
  return (
    <label className="label text-xs">
      {label}
      <input type="date" name={name} defaultValue={value} min={min} max={max} className="field h-11 text-[15px]" />
    </label>
  );
}

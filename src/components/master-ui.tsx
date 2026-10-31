import Link from "next/link";
import { toggleActive, type MasterKind } from "@/app/(app)/masters/actions";
import { Icon } from "./icon";
import { EmptyState, Notice } from "./page";

export type MasterRow = { id: string; primary: string; secondary: string; active: boolean };
type Status = "active" | "inactive" | "all";

export function parseMasterParams(sp: Record<string, string | string[] | undefined>) {
  const get = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const s = get("status");
  return { q: get("q").trim(), status: (["active", "inactive", "all"].includes(s) ? s : "active") as Status, edit: get("edit"), msg: get("msg"), err: get("err") };
}

/** Search + status filter + list with Edit and Activate/Deactivate, shared by all four masters. */
export function MasterList({
  kind, rows, q, status, msg, err, addLabel, editLabel = "Edit", searchPlaceholder, intro,
}: {
  kind: MasterKind; rows: MasterRow[]; q: string; status: Status; msg?: string; err?: string;
  addLabel: string; editLabel?: string; searchPlaceholder: string; intro?: string;
}) {
  const needle = q.toLowerCase();
  const counts = { active: rows.filter((r) => r.active).length, inactive: rows.filter((r) => !r.active).length, all: rows.length };
  const shown = rows.filter((r) => (status === "all" || (status === "active") === r.active) && (!needle || `${r.primary} ${r.secondary}`.toLowerCase().includes(needle)));
  const base = `/masters/${kind}`;
  const href = (p: Record<string, string>) => `${base}?${new URLSearchParams({ ...(q && { q }), status, ...p })}`;
  const back = href({});

  return (
    <>
      {msg && <Notice>{msg}</Notice>}
      {err && <Notice tone="bad">{err}</Notice>}
      {intro && <p className="text-sm text-muted">{intro}</p>}
      <div className="flex flex-col gap-2 md:flex-row md:items-end">
        <form role="search" action={base} className="flex flex-1 gap-2">
          <input type="hidden" name="status" value={status} />
          <label className="label flex-1">
            <span className="sr-only">Search</span>
            <input type="search" name="q" defaultValue={q} placeholder={searchPlaceholder} className="field" />
          </label>
          <button type="submit" className="btn-secondary size-12 px-0" aria-label="Search">
            <Icon name="search" />
          </button>
        </form>
        <Link href={href({ edit: "new" })} className="btn-primary h-12 text-base">
          <Icon name="add" /> {addLabel}
        </Link>
      </div>
      <nav aria-label="Status filter" className="grid grid-cols-3 gap-1 rounded-xl bg-[#e3e6e1] p-1">
        {(["active", "inactive", "all"] as const).map((s) => (
          <Link
            key={s}
            href={`${base}?${new URLSearchParams({ ...(q && { q }), status: s })}`}
            aria-current={status === s ? "page" : undefined}
            className={`flex min-h-10 items-center justify-center rounded-lg text-sm font-semibold capitalize ${status === s ? "bg-surface text-ink shadow-sm" : "text-muted"}`}
          >
            {s} ({counts[s]})
          </Link>
        ))}
      </nav>
      {shown.length === 0 ? (
        <EmptyState>Nothing matches.</EmptyState>
      ) : (
        <ul className="card divide-y divide-line-soft">
          {shown.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-2 px-4 py-3">
              <span className="min-w-0 flex-1 basis-40">
                <span className="flex items-center gap-2 font-semibold">
                  <span className="truncate">{r.primary}</span>
                  {!r.active && <span className="chip bg-[#eceeeb] text-[#4b5551]">Inactive</span>}
                </span>
                <span className="block truncate text-xs text-muted">{r.secondary}</span>
              </span>
              <span className="flex gap-2">
                <Link href={href({ edit: r.id })} className="btn-secondary" aria-label={`${editLabel} ${r.primary}`}>{editLabel}</Link>
                <form action={toggleActive}>
                  <input type="hidden" name="kind" value={kind} />
                  <input type="hidden" name="id" value={r.id} />
                  <input type="hidden" name="back" value={back} />
                  <button type="submit" className={`btn-secondary ${r.active ? "text-bad" : "text-good"}`} aria-label={`${r.active ? "Deactivate" : "Activate"} ${r.primary}`}>
                    {r.active ? "Deactivate" : "Activate"}
                  </button>
                </form>
              </span>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-muted">Records are never deleted, only deactivated, so past trips and reports stay intact. Inactive items are hidden from Add Trip.</p>
    </>
  );
}

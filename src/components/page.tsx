import Link from "next/link";
import { logoutAction } from "@/app/login/actions";
import { Icon } from "./icon";

/** Page header: sticky on phones, with an optional back link and the phone-only logout button. */
export function PageHeader({ title, back, actions }: { title: string; back?: { href: string; label: string }; actions?: React.ReactNode }) {
  return (
    <header className="no-print sticky top-0 z-20 border-b border-line bg-surface/95 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 backdrop-blur md:static md:border-0 md:bg-transparent md:px-8 md:pt-8 md:pb-2">
      <div className="mx-auto flex max-w-5xl items-center gap-2">
        {back && (
          <Link href={back.href} className="btn-ghost -ml-2 px-1" aria-label={`Back to ${back.label}`}>
            <Icon name="chevronLeft" />
          </Link>
        )}
        <h1 className="min-w-0 flex-1 truncate text-xl font-semibold md:text-2xl">{title}</h1>
        {actions}
        <form action={logoutAction} className="md:hidden">
          <button type="submit" aria-label="Log out" className="flex size-11 items-center justify-center rounded-full border border-line text-muted">
            <Icon name="logout" />
          </button>
        </form>
      </div>
    </header>
  );
}

export function PageBody({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  return <main className={`mx-auto flex w-full flex-col gap-4 px-4 pt-4 md:px-8 ${wide ? "max-w-6xl" : "max-w-5xl"}`}>{children}</main>;
}

export function Notice({ tone = "good", children }: { tone?: "good" | "bad" | "info"; children: React.ReactNode }) {
  const cls = tone === "good" ? "bg-good-soft text-good" : tone === "bad" ? "bg-bad-soft text-bad" : "bg-brand-soft text-brand-dark";
  return (
    <div role="status" className={`rounded-lg px-3 py-2.5 text-sm font-medium ${cls}`}>
      {children}
    </div>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <p className="card px-4 py-6 text-center text-sm text-muted">{children}</p>;
}

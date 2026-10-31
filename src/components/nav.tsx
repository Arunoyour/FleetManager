"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "./icon";

type Item = { href: string; label: string; icon: IconName; match: (p: string) => boolean };

const BOTTOM: Item[] = [
  { href: "/", label: "Home", icon: "home", match: (p) => p === "/" },
  { href: "/trips/new", label: "Add Trip", icon: "plus", match: (p) => p.startsWith("/trips/new") },
  { href: "/balance", label: "Balance", icon: "chart", match: (p) => p.startsWith("/balance") },
  { href: "/credit", label: "Credit", icon: "receipt", match: (p) => p.startsWith("/credit") },
  { href: "/more", label: "More", icon: "menu", match: (p) => ["/more", "/reports", "/masters"].some((x) => p.startsWith(x)) || (p.startsWith("/trips") && !p.startsWith("/trips/new")) },
];

const SIDE: { title?: string; items: Item[] }[] = [
  {
    items: [
      BOTTOM[0],
      BOTTOM[1],
      { href: "/trips", label: "Trips", icon: "list", match: (p) => p.startsWith("/trips") && !p.startsWith("/trips/new") },
      BOTTOM[2],
      BOTTOM[3],
      { href: "/reports", label: "Reports", icon: "report", match: (p) => p.startsWith("/reports") },
    ],
  },
  {
    title: "Masters",
    items: [
      { href: "/masters/vehicles", label: "Vehicles", icon: "truck", match: (p) => p.startsWith("/masters/vehicles") },
      { href: "/masters/drivers", label: "Drivers", icon: "user", match: (p) => p.startsWith("/masters/drivers") },
      { href: "/masters/expense-types", label: "Expense Types", icon: "tag", match: (p) => p.startsWith("/masters/expense-types") },
      { href: "/masters/pins", label: "MPIN Management", icon: "key", match: (p) => p.startsWith("/masters/pins") },
    ],
  },
];

export function BottomNav() {
  const path = usePathname();
  return (
    <nav aria-label="Main" className="no-print fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-surface px-1 pt-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:hidden">
      {BOTTOM.map((item) => {
        const active = item.match(path);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg text-[11px] font-medium ${active ? "text-brand" : "text-muted"}`}
          >
            <Icon name={item.icon} className="size-[22px]" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function SideNav({ userName, logout }: { userName: string; logout: React.ReactNode }) {
  const path = usePathname();
  return (
    <aside className="no-print sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-line bg-surface md:flex">
      <div className="flex items-center gap-2 px-5 py-5 text-lg font-semibold">
        <Icon name="truck" className="size-6" />
        Fleet Manager
      </div>
      <nav aria-label="Main" className="flex flex-1 flex-col gap-5 overflow-y-auto px-3">
        {SIDE.map((group, gi) => (
          <div key={gi} className="flex flex-col gap-0.5">
            {group.title && <div className="px-3 pb-1 text-xs font-semibold tracking-wide text-muted uppercase">{group.title}</div>}
            {group.items.map((item) => {
              const active = item.match(path);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium ${active ? "bg-brand-soft text-brand" : "text-ink hover:bg-ground"}`}
                >
                  <Icon name={item.icon} className="size-5" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="flex items-center justify-between border-t border-line px-5 py-3 text-sm">
        <span className="text-muted">Signed in as {userName}</span>
        {logout}
      </div>
    </aside>
  );
}

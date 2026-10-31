import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageBody, PageHeader } from "@/components/page";
import { Icon, type IconName } from "@/components/icon";

export const metadata: Metadata = { title: "More" };

export default async function More() {
  await requireUser();
  const [v, d, t, u] = await Promise.all([
    db.vehicle.groupBy({ by: ["isActive"], _count: true }),
    db.driver.groupBy({ by: ["isActive"], _count: true }),
    db.expenseType.groupBy({ by: ["isActive"], _count: true }),
    db.user.count({ where: { isActive: true } }),
  ]);
  const summary = (g: { isActive: boolean; _count: number }[]) => {
    const a = g.find((x) => x.isActive)?._count ?? 0;
    const i = g.find((x) => !x.isActive)?._count ?? 0;
    return `${a} active · ${i} inactive`;
  };
  const groups: { title: string; items: { href: string; label: string; sub: string; icon: IconName }[] }[] = [
    {
      title: "Records",
      items: [
        { href: "/trips", label: "Trips", sub: "View, edit and delete trips", icon: "list" },
        { href: "/reports", label: "Reports & charts", sub: "Vehicle, trip, expense type, balance and driver reports", icon: "report" },
      ],
    },
    {
      title: "Masters",
      items: [
        { href: "/masters/vehicles", label: "Vehicles", sub: summary(v), icon: "truck" },
        { href: "/masters/drivers", label: "Drivers", sub: summary(d), icon: "user" },
        { href: "/masters/expense-types", label: "Expense Types", sub: summary(t), icon: "tag" },
        { href: "/masters/pins", label: "MPIN Management", sub: `${u} active ${u === 1 ? "PIN" : "PINs"}`, icon: "key" },
      ],
    },
  ];
  return (
    <>
      <PageHeader title="More" />
      <PageBody>
        {groups.map((g) => (
          <section key={g.title} className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-muted">{g.title}</h2>
            <ul className="card divide-y divide-line-soft">
              {g.items.map((it) => (
                <li key={it.href}>
                  <Link href={it.href} className="flex min-h-16 items-center gap-3 px-4 py-3 hover:bg-ground">
                    <Icon name={it.icon} className="size-5 text-muted" />
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{it.label}</span>
                      <span className="block truncate text-xs text-muted">{it.sub}</span>
                    </span>
                    <Icon name="chevronRight" className="size-4 text-muted" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </PageBody>
    </>
  );
}

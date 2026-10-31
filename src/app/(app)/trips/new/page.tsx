import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageBody, PageHeader, EmptyState } from "@/components/page";
import { VehiclePicker } from "./vehicle-picker";

export const metadata: Metadata = { title: "Select Vehicle" };

export default async function SelectVehicle() {
  await requireUser();
  const [vehicles, recentTrips] = await Promise.all([
    db.vehicle.findMany({ where: { isActive: true }, orderBy: { number: "asc" } }),
    db.trip.findMany({ where: { isDeleted: false }, orderBy: { createdAt: "desc" }, select: { vehicleId: true }, take: 100 }),
  ]);
  const recent: string[] = [];
  for (const t of recentTrips) if (!recent.includes(t.vehicleId) && recent.length < 5) recent.push(t.vehicleId);
  const items = vehicles
    .map((v) => ({ id: v.id, number: v.number, sub: [v.name, v.type].filter(Boolean).join(" · "), recent: recent.includes(v.id) }))
    .sort((a, b) => {
      const ia = recent.indexOf(a.id), ib = recent.indexOf(b.id);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    });

  return (
    <>
      <PageHeader title="Select Vehicle" />
      <PageBody>
        {items.length === 0 ? <EmptyState>No active vehicles. Add one under More › Vehicles.</EmptyState> : <VehiclePicker vehicles={items} />}
      </PageBody>
    </>
  );
}

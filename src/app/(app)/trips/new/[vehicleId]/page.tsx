import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { activeOptions } from "@/lib/trips";
import { todayISO } from "@/lib/format";
import { Notice, PageBody, PageHeader } from "@/components/page";
import { TripForm } from "@/components/trip-form";

export const metadata: Metadata = { title: "Add Trip" };

export default async function AddTrip({ params, searchParams }: { params: Promise<{ vehicleId: string }>; searchParams: Promise<{ msg?: string }> }) {
  await requireUser();
  const [{ vehicleId }, { msg }] = await Promise.all([params, searchParams]);
  const vehicle = await db.vehicle.findFirst({ where: { id: vehicleId, isActive: true } });
  if (!vehicle) notFound();
  const { drivers, types } = await activeOptions();
  return (
    <>
      <PageHeader title="Add Trip" back={{ href: "/trips/new", label: "Select Vehicle" }} />
      <PageBody>
        {msg && <Notice>{msg}</Notice>}
        <div className="w-full max-w-2xl">
          <TripForm
            key={msg ?? "new"}
            vehicle={{ id: vehicle.id, label: vehicle.number }}
            vehicles={[]}
            drivers={drivers.map((d) => ({ id: d.id, label: d.name }))}
            types={types.map((t) => ({ id: t.id, label: t.name }))}
            today={todayISO()}
          />
        </div>
      </PageBody>
    </>
  );
}

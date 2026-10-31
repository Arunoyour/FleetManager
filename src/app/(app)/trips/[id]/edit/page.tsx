import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { allOptions, loadTrip } from "@/lib/trips";
import { paiseToInput, todayISO } from "@/lib/format";
import { PageBody, PageHeader } from "@/components/page";
import { TripForm } from "@/components/trip-form";

export const metadata: Metadata = { title: "Edit Trip" };

export default async function EditTrip({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const trip = await loadTrip(id);
  if (!trip) notFound();
  const { vehicles, drivers, types } = await allOptions();
  const usedTypes = new Set(trip.expenses.map((e) => e.typeId));
  return (
    <>
      <PageHeader title="Edit Trip" back={{ href: `/trips/${id}`, label: "trip" }} />
      <PageBody>
        <div className="w-full max-w-2xl">
          <TripForm
            trip={{
              id: trip.id,
              date: trip.date,
              name: trip.name,
              vehicleId: trip.vehicleId,
              driverId: trip.driverId,
              earned: paiseToInput(trip.earned),
              isCredit: trip.isCredit,
              paid: !!trip.paidOn,
              expenses: trip.expenses.map((e) => ({ typeId: e.typeId, amount: paiseToInput(e.amount), note: e.note ?? "" })),
            }}
            vehicles={vehicles.filter((v) => v.isActive || v.id === trip.vehicleId).map((v) => ({ id: v.id, label: v.isActive ? v.number : `${v.number} (inactive)` }))}
            drivers={drivers.filter((d) => d.isActive || d.id === trip.driverId).map((d) => ({ id: d.id, label: d.isActive ? d.name : `${d.name} (inactive)` }))}
            types={types.filter((t) => t.isActive || usedTypes.has(t.id)).map((t) => ({ id: t.id, label: t.isActive ? t.name : `${t.name} (inactive)` }))}
            today={todayISO()}
          />
        </div>
      </PageBody>
    </>
  );
}

import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageBody, PageHeader } from "@/components/page";
import { MasterList, parseMasterParams } from "@/components/master-ui";
import { MasterForm } from "@/components/master-form";
import { saveVehicle } from "../actions";

export const metadata: Metadata = { title: "Vehicles" };

export default async function Vehicles({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireUser();
  const p = parseMasterParams(await searchParams);
  const vehicles = await db.vehicle.findMany({ orderBy: { number: "asc" } });
  const editing = p.edit && p.edit !== "new" ? vehicles.find((v) => v.id === p.edit) : undefined;
  const cancel = `/masters/vehicles?status=${p.status}${p.q ? `&q=${encodeURIComponent(p.q)}` : ""}`;

  return (
    <>
      <PageHeader title="Vehicles" back={{ href: "/more", label: "More" }} />
      <PageBody>
        {(p.edit === "new" || editing) && (
          <MasterForm
            key={p.edit}
            title={editing ? `Edit ${editing.number}` : "Add vehicle"}
            id={editing?.id}
            action={saveVehicle}
            cancelHref={cancel}
            fields={[
              { name: "number", label: "Vehicle Number", defaultValue: editing?.number, placeholder: "KL07AB1234", maxLength: 15, required: true, hint: "Saved in capitals without spaces." },
              { name: "name", label: "Vehicle Name / Nickname (optional)", defaultValue: editing?.name ?? "", maxLength: 50 },
              { name: "type", label: "Vehicle Type (optional)", defaultValue: editing?.type ?? "", placeholder: "e.g. 12-wheeler", maxLength: 30 },
              { name: "notes", label: "Notes (optional)", defaultValue: editing?.notes ?? "", maxLength: 200 },
            ]}
          />
        )}
        <MasterList
          kind="vehicles"
          {...p}
          addLabel="Add vehicle"
          searchPlaceholder="Number, name or type"
          rows={vehicles.map((v) => ({ id: v.id, primary: v.number, secondary: [v.name, v.type].filter(Boolean).join(" · ") || "No name or type", active: v.isActive }))}
        />
      </PageBody>
    </>
  );
}

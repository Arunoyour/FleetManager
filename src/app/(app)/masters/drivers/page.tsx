import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageBody, PageHeader } from "@/components/page";
import { MasterList, parseMasterParams } from "@/components/master-ui";
import { MasterForm } from "@/components/master-form";
import { saveDriver } from "../actions";

export const metadata: Metadata = { title: "Drivers" };

export default async function Drivers({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireUser();
  const p = parseMasterParams(await searchParams);
  const drivers = await db.driver.findMany({ orderBy: { name: "asc" } });
  const editing = p.edit && p.edit !== "new" ? drivers.find((d) => d.id === p.edit) : undefined;
  const cancel = `/masters/drivers?status=${p.status}${p.q ? `&q=${encodeURIComponent(p.q)}` : ""}`;

  return (
    <>
      <PageHeader title="Drivers" back={{ href: "/more", label: "More" }} />
      <PageBody>
        {(p.edit === "new" || editing) && (
          <MasterForm
            key={p.edit}
            title={editing ? `Edit ${editing.name}` : "Add driver"}
            id={editing?.id}
            action={saveDriver}
            cancelHref={cancel}
            fields={[
              { name: "name", label: "Driver Name", defaultValue: editing?.name, maxLength: 60, required: true },
              { name: "mobile", label: "Mobile Number (optional)", defaultValue: editing?.mobile ?? "", type: "tel", inputMode: "numeric", maxLength: 10, placeholder: "10 digits" },
              { name: "notes", label: "Notes (optional)", defaultValue: editing?.notes ?? "", maxLength: 200 },
            ]}
          />
        )}
        <MasterList
          kind="drivers"
          {...p}
          addLabel="Add driver"
          searchPlaceholder="Name or mobile"
          rows={drivers.map((d) => ({ id: d.id, primary: d.name, secondary: d.mobile ? `Mobile ${d.mobile}` : "No mobile", active: d.isActive }))}
        />
      </PageBody>
    </>
  );
}

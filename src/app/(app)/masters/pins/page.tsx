import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { fmtDate, iso } from "@/lib/format";
import { PageBody, PageHeader } from "@/components/page";
import { MasterList, parseMasterParams } from "@/components/master-ui";
import { MasterForm } from "@/components/master-form";
import { savePin } from "../actions";

export const metadata: Metadata = { title: "MPIN Management" };

export default async function Pins({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireUser();
  const p = parseMasterParams(await searchParams);
  const users = await db.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, isActive: true, lastLoginAt: true } });
  const editing = p.edit && p.edit !== "new" ? users.find((u) => u.id === p.edit) : undefined;
  const cancel = `/masters/pins?status=${p.status}${p.q ? `&q=${encodeURIComponent(p.q)}` : ""}`;
  const pinField = { type: "password" as const, inputMode: "numeric" as const, maxLength: 6, placeholder: "••••••" };

  return (
    <>
      <PageHeader title="MPIN Management" back={{ href: "/more", label: "More" }} />
      <PageBody>
        {(p.edit === "new" || editing) && (
          <MasterForm
            key={p.edit}
            title={editing ? `Change PIN for ${editing.name}` : "Add PIN"}
            id={editing?.id}
            action={savePin}
            cancelHref={cancel}
            fields={[
              { name: "name", label: "Name", defaultValue: editing?.name, maxLength: 60, required: true, placeholder: "e.g. Partner" },
              { name: "pin", label: editing ? "New 6-digit PIN (leave blank to keep)" : "6-digit PIN", required: !editing, ...pinField },
              { name: "pin2", label: "Confirm PIN", required: !editing, ...pinField },
            ]}
          />
        )}
        <MasterList
          kind="pins"
          {...p}
          addLabel="Add PIN"
          editLabel="Change PIN"
          searchPlaceholder="Name"
          intro="Each active PIN has full access. PINs are stored encrypted and never shown. Deactivating a PIN signs it out on every device."
          rows={users.map((u) => ({ id: u.id, primary: u.name, secondary: `Last login ${u.lastLoginAt ? fmtDate(iso(u.lastLoginAt)) : "never"}`, active: u.isActive }))}
        />
      </PageBody>
    </>
  );
}

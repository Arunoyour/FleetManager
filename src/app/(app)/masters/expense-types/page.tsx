import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageBody, PageHeader } from "@/components/page";
import { MasterList, parseMasterParams } from "@/components/master-ui";
import { MasterForm } from "@/components/master-form";
import { saveExpenseType } from "../actions";

export const metadata: Metadata = { title: "Expense Types" };

export default async function ExpenseTypes({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireUser();
  const p = parseMasterParams(await searchParams);
  const types = await db.expenseType.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { expenses: { where: { trip: { isDeleted: false } } } } } },
  });
  const editing = p.edit && p.edit !== "new" ? types.find((t) => t.id === p.edit) : undefined;
  const cancel = `/masters/expense-types?status=${p.status}${p.q ? `&q=${encodeURIComponent(p.q)}` : ""}`;

  return (
    <>
      <PageHeader title="Expense Types" back={{ href: "/more", label: "More" }} />
      <PageBody>
        {(p.edit === "new" || editing) && (
          <MasterForm
            key={p.edit}
            title={editing ? `Edit ${editing.name}` : "Add expense type"}
            id={editing?.id}
            action={saveExpenseType}
            cancelHref={cancel}
            fields={[{ name: "name", label: "Expense Type Name", defaultValue: editing?.name, maxLength: 40, required: true, hint: editing ? "Renaming updates every past trip that uses it." : undefined }]}
          />
        )}
        <MasterList
          kind="expense-types"
          {...p}
          addLabel="Add expense type"
          searchPlaceholder="Expense type"
          rows={types.map((t) => ({ id: t.id, primary: t.name, secondary: `Used in ${t._count.expenses} ${t._count.expenses === 1 ? "expense" : "expenses"}`, active: t.isActive }))}
        />
      </PageBody>
    </>
  );
}

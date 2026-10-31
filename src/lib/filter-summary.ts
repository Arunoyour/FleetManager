import { fmtShort } from "./format";

type Named = { id: string };

/** Short text for the folded filter button, e.g. "1 Oct – 31 Oct · KL07AB1234 · Ravi". */
export function filterSummary(
  parts: { from?: string; to?: string; picks?: [string | undefined, (Named & Record<string, unknown>)[], string][]; extra?: (string | undefined)[] },
) {
  const out: string[] = [];
  if (parts.from && parts.to) out.push(`${fmtShort(parts.from)} – ${fmtShort(parts.to)}`);
  for (const [id, list, labelKey] of parts.picks ?? []) {
    const hit = id ? list.find((x) => x.id === id) : undefined;
    if (hit) out.push(String(hit[labelKey]));
  }
  for (const e of parts.extra ?? []) if (e) out.push(e);
  return out.join(" · ") || "None";
}

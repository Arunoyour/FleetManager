"use client";

import Link from "next/link";
import { useState } from "react";
import { normaliseVehicleNumber } from "@/lib/format";

type V = { id: string; number: string; sub: string; recent: boolean };

export function VehiclePicker({ vehicles }: { vehicles: V[] }) {
  const [q, setQ] = useState("");
  const needle = normaliseVehicleNumber(q);
  const shown = vehicles.filter((v) => !needle || v.number.includes(needle) || v.sub.toUpperCase().includes(q.trim().toUpperCase()));
  return (
    <>
      <label className="label">
        Search vehicle
        <input type="search" className="field" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Number, e.g. 1234" autoComplete="off" />
      </label>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {shown.map((v) => (
          <Link key={v.id} href={`/trips/new/${v.id}`} className="card flex min-h-20 flex-col gap-1 p-3 hover:border-brand active:bg-brand-soft">
            <span className="font-semibold tracking-wide">{v.number}</span>
            {v.sub && <span className="truncate text-xs text-muted">{v.sub}</span>}
            {v.recent && <span className="chip mt-auto self-start bg-brand-soft text-brand">Recent</span>}
          </Link>
        ))}
      </div>
      {shown.length === 0 && <p className="text-sm text-muted">No vehicle matches “{q}”.</p>}
      <p className="text-xs text-muted">{vehicles.length} active vehicles. Recently used appear first.</p>
    </>
  );
}

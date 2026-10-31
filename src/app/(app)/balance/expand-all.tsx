"use client";

export function ExpandAll({ target }: { target: string }) {
  const setAll = (open: boolean) => document.querySelectorAll<HTMLDetailsElement>(`#${target} details`).forEach((d) => (d.open = open));
  return (
    <div className="no-print grid grid-cols-2 gap-2">
      <button type="button" className="btn-secondary" onClick={() => setAll(true)}>Expand all</button>
      <button type="button" className="btn-secondary" onClick={() => setAll(false)}>Collapse all</button>
    </div>
  );
}

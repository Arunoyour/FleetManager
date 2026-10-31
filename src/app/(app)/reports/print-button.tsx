"use client";

export function PrintButton() {
  return (
    <button type="button" className="btn-secondary h-12" onClick={() => window.print()}>
      PDF / Print
    </button>
  );
}

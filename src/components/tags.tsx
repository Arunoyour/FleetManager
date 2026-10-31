import { fmtShort } from "@/lib/format";

export function CreditTag({ trip, className = "" }: { trip: { isCredit: boolean; paidOn: string | null }; className?: string }) {
  if (!trip.isCredit) return null;
  return trip.paidOn ? (
    <span className={`chip bg-good-soft text-good ${className}`}>Paid {fmtShort(trip.paidOn)}</span>
  ) : (
    <span className={`chip bg-credit-soft text-credit ${className}`}>Credit – pending</span>
  );
}

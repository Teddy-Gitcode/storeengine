"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronRight, Timer } from "lucide-react";
import { awaitingHolds, clock, lastAttemptFailed, payPageHref, payTokens, remainingMs, type FetchedHold } from "@/lib/payment-hold";

/* "Order KT-1234 is waiting for payment · 07:12 left". A strip under the
   header while an order from this browser or this account is held unpaid —
   so a shopper who left the pay page, or whose cart now looks empty because it
   became that order, can find their way back before the items are released.

   Nothing at all otherwise, and nothing on the pay or gateway-return pages. */
export default function AwaitingPaymentBanner() {
  const pathname = usePathname();
  const [holds, setHolds] = useState<FetchedHold[]>([]);
  const [, setNow] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      awaitingHolds()
        .then((found) => !cancelled && setHolds(found))
        .catch(() => undefined);
    void load();
    // Re-ask now and then (it may have been paid from the phone), and when a
    // checkout here has just remembered a new one.
    const poll = window.setInterval(load, 30_000);
    window.addEventListener("pay-tokens", load);
    return () => {
      cancelled = true;
      window.clearInterval(poll);
      window.removeEventListener("pay-tokens", load);
    };
  }, [pathname]);

  const live = holds.filter((h) => remainingMs(h) > 0);
  useEffect(() => {
    if (!live.length) return;
    const tick = window.setInterval(() => setNow(performance.now()), 1000);
    return () => window.clearInterval(tick);
  }, [live.length]);

  // Not on the pay page or the gateway return pages: each is already about
  // this order, and a banner read before a gateway's answer landed would
  // contradict it. Checkout itself keeps it — that is where Back from the
  // gateway lands.
  if (!live.length || pathname?.startsWith("/checkout/")) return null;
  const hold = live[0];
  const left = remainingMs(hold);
  const urgent = left < 60_000;

  return (
    <div className="container-store pt-3">
      <Link
        href={payPageHref(hold.number, payTokens.get(hold.number))}
        className={`flex items-center gap-3 rounded-xl border bg-surface px-4 py-3 transition hover:border-brand ${
          urgent ? "border-danger/40" : "border-brand/30"
        }`}
      >
        <span
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${
            urgent ? "bg-danger/10 text-danger" : "bg-brand-50 text-brand"
          }`}
        >
          <Timer size={18} aria-hidden />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-semibold text-ink truncate">
            {lastAttemptFailed(hold) ? "Payment didn't go through" : `Order ${hold.number} is waiting for payment`}
          </span>
          <span className={`block text-xs tabular-nums ${urgent ? "text-danger" : "text-ink-muted"}`}>
            Items held for {clock(left)}
          </span>
        </span>
        <span className="text-sm font-semibold text-brand whitespace-nowrap flex items-center">
          Pay now <ChevronRight size={16} aria-hidden />
        </span>
      </Link>
    </div>
  );
}

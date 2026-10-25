"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, CircleAlert, ShieldCheck } from "lucide-react";
import Card from "@/components/ui/Card";
import { fetchHold, payPageHref, payTokens } from "@/lib/payment-hold";

/* Where a gateway sends the shopper back: Paystack's callback, PayPal's
   return. It confirms with the server — which asks the gateway itself, so
   nothing in this URL is believed — and then hands over to the order's pay
   page, the one place that shows an order's payment state: paid, still held
   with time left to retry, or released.

   Only when this browser can open that page, though: it needs the guest's
   pay token (kept here at checkout) or the signed-in owner. A shopper who
   started in the app pays in the phone's browser, which has neither — so for
   them the result is shown here, and they go back to the app. */

type Result = "paid" | "failed" | "pending";
type View = { kind: "working" } | { kind: "result"; result: Result; order?: string } | { kind: "lost"; message: string };

export default function HandOff({
  gateway,
  order,
  confirm,
}: {
  gateway: string;
  /** The order number, when the URL carries it (PayPal). Paystack's comes
   *  back from the confirmation. */
  order?: string;
  confirm: () => Promise<{ order?: string; status?: string }>;
}) {
  const router = useRouter();
  const [view, setView] = useState<View>({ kind: "working" });
  const started = useRef(false);

  useEffect(() => {
    // React runs effects twice in development; one confirmation is enough.
    if (started.current) return;
    started.current = true;
    (async () => {
      let number = order;
      let result: Result = "pending";
      try {
        const res = await confirm();
        number = res.order || order;
        result = res.status === "paid" ? "paid" : res.status === "failed" ? "failed" : "pending";
      } catch (err) {
        if (!number) {
          setView({ kind: "lost", message: err instanceof Error ? err.message : "Could not confirm the payment." });
          return;
        }
      }
      if (!number) {
        setView({ kind: "lost", message: "We lost track of that payment." });
        return;
      }
      const token = payTokens.get(number);
      try {
        // Can this browser see the order? Then its pay page says the rest.
        await fetchHold(number, token);
        router.replace(payPageHref(number, token));
      } catch {
        setView({ kind: "result", result, order: number });
      }
    })();
  }, [confirm, order, router]);

  if (view.kind === "working") {
    return (
      <Frame>
        <span className="mx-auto mb-4 block h-9 w-9 rounded-full border-[3px] border-brand border-t-transparent animate-spin" />
        <h1 className="text-[22px] font-semibold text-ink mb-1">Confirming your payment</h1>
        <p className="text-ink-muted text-sm">
          Checking with {gateway} — this takes a moment. Please don&apos;t close this page.
        </p>
        <p className="mt-5 inline-flex items-center gap-1.5 text-xs text-ink-muted">
          <ShieldCheck size={14} aria-hidden /> Verified directly with {gateway}, not from this link.
        </p>
      </Frame>
    );
  }

  if (view.kind === "lost") {
    return (
      <Frame>
        <h1 className="text-[22px] font-semibold text-ink mb-2">{view.message}</h1>
        <p className="text-ink-muted text-sm">
          If the money left your account, the order will show as paid in{" "}
          <Link href="/account" className="underline">
            your orders
          </Link>{" "}
          within a few minutes.
        </p>
      </Frame>
    );
  }

  const appNote = "If you started in the app, you can go back to it now.";
  if (view.result === "paid") {
    return (
      <Frame>
        <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-green-600/10 text-green-700 dark:text-green-400">
          <CheckCircle2 size={30} aria-hidden />
        </span>
        <h1 className="text-[24px] font-semibold text-ink mb-1">Payment received</h1>
        <p className="text-ink-muted">
          Order <span className="font-semibold text-ink">{view.order}</span> is paid. We&apos;ll email you when it
          ships.
        </p>
        <p className="text-ink-muted text-sm mt-3">{appNote}</p>
      </Frame>
    );
  }

  return (
    <Frame>
      <CircleAlert className="mx-auto mb-3 text-danger" size={36} aria-hidden />
      <h1 className="text-[22px] font-semibold text-ink mb-1">
        {view.result === "failed" ? "That payment didn't go through" : "We couldn't confirm that payment yet"}
      </h1>
      <p className="text-ink-muted text-sm">
        Order <span className="font-semibold text-ink">{view.order}</span> is held for a few minutes. Go back to the
        app, or the tab you ordered from, to try again. If the money did leave your account, the order will update
        on its own.
      </p>
    </Frame>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="container-store py-16 max-w-[560px]">
      <Card padding="lg" className="text-center" aria-live="polite">
        {children}
      </Card>
    </div>
  );
}

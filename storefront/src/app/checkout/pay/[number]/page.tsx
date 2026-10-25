"use client";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { BellRing, CheckCircle2, CircleAlert, Clock, CreditCard, ExternalLink, Smartphone, TimerOff } from "lucide-react";
import Alert from "@/components/ui/Alert";
import Card from "@/components/ui/Card";
import { charged } from "@/lib/format";
import { useCart } from "@/lib/cart-store";
import { getProductsByIds } from "@/lib/catalog-api";
import { usePaymentMethods } from "@/lib/use-payment-methods";
import {
  clock,
  fetchHold,
  lastAttemptFailed,
  payTokens,
  PaymentHoldError,
  remainingMs,
  retryPayment,
  type FetchedHold,
} from "@/lib/payment-hold";
import { enableWebPush, webPushState, type WebPushState } from "@/lib/web-push";

/* An order waiting to be paid: how long its items are held, what happened to
   the last attempt, and paying again — by the same method or another.

   Reached from checkout (M-Pesa, or a gateway that refused to start), from a
   PayPal cancel, from the banner, and from every reminder — email and browser
   notification — which carry `?t=`, the guest's pay token. The hold is the
   backend's; this page counts it down, polls while a payment is in the air,
   and stops the moment the order is paid or released. */

const HOLD_MS = 10 * 60 * 1000;

function PayInner() {
  const { number } = useParams<{ number: string }>();
  const params = useSearchParams();
  const router = useRouter();
  const [token, setToken] = useState<string | null>(params.get("t"));
  const [hold, setHold] = useState<FetchedHold | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [method, setMethod] = useState("");
  const [phone, setPhone] = useState("");
  const [, setNow] = useState(0);
  const [push, setPush] = useState<WebPushState>("unsupported");
  const addToCart = useCart((s) => s.add);
  const methods = usePaymentMethods();
  const holdRef = useRef<FetchedHold | null>(null);
  holdRef.current = hold;

  // The token from the link wins; otherwise what this browser kept at checkout.
  useEffect(() => {
    const fromLink = params.get("t");
    if (fromLink) {
      payTokens.remember(number, fromLink);
      setToken(fromLink);
    } else {
      setToken(payTokens.get(number) ?? null);
    }
  }, [number, params]);

  const adopt = useCallback((next: FetchedHold) => {
    setHold(next);
    setPhone((current) => current || next.phone);
    setMethod((current) => current || next.attempt?.method || "");
  }, []);

  const refresh = useCallback(async () => {
    try {
      const next = await fetchHold(number, token);
      adopt(next);
      setError(null);
      if (next.state !== "awaiting_payment") payTokens.forget(number);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }, [number, token, adopt]);

  useEffect(() => {
    void refresh();
    // Poll only while something can change without the shopper doing anything:
    // an M-Pesa prompt being answered, a gateway page being finished.
    const poll = window.setInterval(() => {
      const current = holdRef.current;
      if (!current || current.in_flight || (current.state === "awaiting_payment" && remainingMs(current) === 0)) {
        void refresh();
      }
    }, 4000);
    const tick = window.setInterval(() => setNow(performance.now()), 1000);
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(poll);
      window.clearInterval(tick);
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh]);

  // Browser reminders: already allowed means quietly tie this order to the
  // subscription; otherwise the card below asks, on a click.
  useEffect(() => {
    let cancelled = false;
    void webPushState().then(async (state) => {
      if (cancelled) return;
      if (state === "on") setPush(await enableWebPush({ number, token }));
      else setPush(state);
    });
    return () => {
      cancelled = true;
    };
  }, [number, token]);

  useEffect(() => {
    if (!method && methods.length) setMethod(methods[0].method);
  }, [method, methods]);

  async function pay() {
    const chosen = methods.some((m) => m.method === method) ? method : methods[0]?.method;
    if (!chosen) return;
    setBusy(true);
    setError(null);
    try {
      const next = await retryPayment(number, {
        token,
        method: chosen,
        phone: chosen === "mobile" ? phone.trim() : undefined,
      });
      adopt(next);
      const url = next.attempt?.redirect_url;
      if (next.in_flight && url) window.location.href = url;
    } catch (err) {
      if (err instanceof PaymentHoldError && err.hold) adopt(err.hold);
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function restore(current: FetchedHold) {
    setBusy(true);
    const ids = current.items.map((i) => i.product_id).filter((id): id is number => id != null);
    const products = await getProductsByIds(ids);
    for (const item of current.items) {
      const product = products.find((p) => p.productId === item.product_id);
      if (!product) continue;
      const variant = item.variant_id ? product.variants?.find((v) => v.id === item.variant_id) : undefined;
      if (item.variant_id && !variant) continue;
      addToCart(product, item.quantity, variant);
    }
    // Anything gone since — delisted, or a size dropped — is simply not added.
    router.push("/cart");
  }

  if (!hold) {
    return (
      <Shell>
        {error ? (
          <Card padding="lg" className="text-center">
            <h1 className="text-[22px] font-semibold text-ink mb-2">{error}</h1>
            <p className="text-ink-muted text-sm">
              Use the link in your email, or{" "}
              <Link href="/track" className="underline">
                track the order
              </Link>
              .
            </p>
          </Card>
        ) : (
          <div className="page-loader">
            <span className="text-ink-muted text-sm">Loading your order…</span>
          </div>
        )}
      </Shell>
    );
  }

  if (hold.state === "paid") {
    return (
      <Shell>
        <Card padding="lg" className="text-center max-w-[560px] mx-auto">
          <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-green-600/10 text-green-700 dark:text-green-400">
            <CheckCircle2 size={30} aria-hidden />
          </span>
          <h1 className="text-[24px] font-semibold text-ink mb-1">Payment received</h1>
          <p className="text-ink-muted">
            Order <span className="font-semibold text-ink">{hold.number}</span> is paid. We&apos;ll email you when it
            ships.
          </p>
          <ul className="mt-6 grid gap-2 text-sm text-left border-t border-line/10 pt-4">
            {hold.items.map((item, i) => (
              <li key={i} className="flex justify-between gap-3">
                <span className="text-ink">
                  {item.quantity} × {item.name}
                  {item.variant_label ? ` (${item.variant_label})` : ""}
                </span>
                <span className="text-ink-muted whitespace-nowrap">
                  {charged(Number(item.line_total), hold.currency)}
                </span>
              </li>
            ))}
            <li className="flex justify-between border-t border-line/10 pt-2 font-semibold text-ink">
              <span>Total paid</span>
              <span>{charged(Number(hold.grand_total), hold.currency)}</span>
            </li>
          </ul>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href={`/track?ref=${encodeURIComponent(hold.number)}`} className="btn-primary">
              Track this order
            </Link>
            <Link href="/shop" className="btn-ghost">
              Continue shopping
            </Link>
          </div>
        </Card>
      </Shell>
    );
  }

  if (hold.state === "released") {
    return (
      <Shell>
        <Card padding="lg" className="text-center">
          <TimerOff className="mx-auto mb-4 text-ink-muted" size={44} aria-hidden />
          <h1 className="text-[24px] font-semibold text-ink mb-2">Time&apos;s up</h1>
          <p className="text-ink-muted max-w-sm mx-auto">
            Order <span className="font-semibold text-ink">{hold.number}</span> wasn&apos;t paid in time, so its
            items went back on sale.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              className="btn-primary disabled:opacity-60"
              disabled={busy || !hold.items.length}
              onClick={() => restore(hold)}
            >
              Put the items back in my cart
            </button>
            <Link href="/shop" className="btn-ghost">
              Continue shopping
            </Link>
          </div>
        </Card>
      </Shell>
    );
  }

  const left = remainingMs(hold);
  const urgent = left < 60_000;
  const attempt = hold.attempt;
  const waiting = hold.in_flight && attempt;
  const total = charged(Number(hold.grand_total), hold.currency);

  return (
    <Shell>
      <div className="grid lg:grid-cols-[1fr_340px] gap-6 items-start">
        <div className="flex flex-col gap-4">
          <Card padding="lg" className="flex flex-col sm:flex-row items-center gap-6">
            <Ring fraction={left / HOLD_MS} urgent={urgent} label={clock(left)} />
            <div className="text-center sm:text-left">
              <h1 className="text-[22px] font-semibold text-ink">
                {left === 0 ? "Time's up — releasing your items…" : "We're holding your items"}
              </h1>
              <p className="text-ink-muted text-sm mt-1">
                Pay before the timer runs out, or they go back on sale.
              </p>
              <p className="text-sm mt-3">
                Order <span className="font-semibold text-ink">{hold.number}</span> ·{" "}
                <span className="font-semibold text-ink">{total}</span>
              </p>
            </div>
          </Card>

          {waiting ? (
            <Card className="flex items-start gap-3" aria-live="polite">
              <span className="mt-0.5 h-5 w-5 shrink-0 rounded-full border-2 border-brand border-t-transparent animate-spin" />
              <div className="flex-1">
                <p className="font-semibold text-ink">
                  {attempt.method === "mobile" ? "Check your phone" : "Waiting for your payment"}
                </p>
                <p className="text-sm text-ink-muted">
                  {attempt.method === "mobile"
                    ? `Enter your M-Pesa PIN in the prompt${hold.phone ? ` sent to ${hold.phone}` : ""}.`
                    : "Finish paying on the payment page, then come back here."}
                </p>
                {attempt.redirect_url && (
                  <a href={attempt.redirect_url} className="btn-ghost mt-3 gap-2">
                    <ExternalLink size={15} aria-hidden /> Open payment page
                  </a>
                )}
              </div>
            </Card>
          ) : (
            <>
              {lastAttemptFailed(hold) && attempt?.failure_reason && (
                <div role="alert" className="flex items-start gap-3 rounded-xl border border-danger/20 bg-danger/5 p-4">
                  <CircleAlert size={20} className="text-danger shrink-0 mt-0.5" aria-hidden />
                  <div>
                    <p className="font-semibold text-danger">Payment didn&apos;t go through</p>
                    <p className="text-sm text-ink">{attempt.failure_reason}</p>
                  </div>
                </div>
              )}
              {error && <Alert>{error}</Alert>}

              {hold.can_retry ? (
                <Card>
                  <h2 className="text-sm font-semibold text-ink mb-3">
                    {attempt ? "Try again, or pay another way" : "Pay with"}
                  </h2>
                  {methods.length === 0 ? (
                    <Alert>This store isn&apos;t taking payments right now.</Alert>
                  ) : (
                    <div className="grid gap-2">
                      {methods.map((m) => (
                        <label
                          key={m.id}
                          className={`flex items-center gap-3 border rounded-lg p-3 cursor-pointer transition ${
                            method === m.method ? "border-brand bg-brand-50/40" : "border-line/10 hover:border-brand"
                          }`}
                        >
                          <input
                            type="radio"
                            name="method"
                            className="accent-brand"
                            checked={method === m.method}
                            onChange={() => setMethod(m.method)}
                          />
                          {m.method === "mobile" ? (
                            <Smartphone size={18} aria-hidden />
                          ) : (
                            <CreditCard size={18} aria-hidden />
                          )}
                          <span className="flex-1">
                            <span className="block text-sm font-semibold text-ink">{m.name}</span>
                            {m.body_text && <span className="block text-xs text-ink-muted">{m.body_text}</span>}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                  {method === "mobile" && methods.some((m) => m.method === "mobile") && (
                    <label className="block mt-3">
                      <span className="text-xs font-semibold text-ink">M-Pesa phone number</span>
                      <input
                        className="soft-input mt-1 px-3 py-2.5"
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </label>
                  )}
                  <button
                    type="button"
                    className="btn-primary w-full mt-4 py-3 text-base disabled:opacity-60 disabled:cursor-not-allowed"
                    disabled={busy || methods.length === 0}
                    onClick={pay}
                  >
                    {busy ? "Starting payment…" : `Pay ${total}`}
                  </button>
                </Card>
              ) : (
                left > 0 && (
                  <Card tone="quiet" className="flex items-start gap-3">
                    <Clock size={18} className="text-ink-muted shrink-0 mt-0.5" aria-hidden />
                    <p className="text-sm text-ink-muted">
                      There isn&apos;t enough time left to start a new payment. If it isn&apos;t paid, the items go
                      back on sale and you can put them back in your cart.
                    </p>
                  </Card>
                )
              )}
            </>
          )}

          {push === "ask" && (
            <Card tone="quiet" className="flex flex-wrap items-center gap-3">
              <BellRing size={18} className="text-brand" aria-hidden />
              <p className="flex-1 text-sm text-ink">Get a browser reminder before your items are released.</p>
              <button
                type="button"
                className="btn-ghost"
                onClick={async () => setPush(await enableWebPush({ number, token }))}
              >
                Remind me
              </button>
            </Card>
          )}
          {push === "on" && (
            <p className="text-xs text-ink-muted flex items-center gap-2">
              <BellRing size={14} aria-hidden /> We&apos;ll remind you in this browser before the time runs out.
            </p>
          )}
        </div>

        <Card as="aside">
          <h2 className="text-sm font-semibold text-ink mb-3">In this order</h2>
          <ul className="grid gap-2 text-sm">
            {hold.items.map((item, i) => (
              <li key={i} className="flex justify-between gap-3">
                <span className="text-ink">
                  {item.quantity} × {item.name}
                  {item.variant_label ? ` (${item.variant_label})` : ""}
                </span>
                <span className="text-ink-muted whitespace-nowrap">
                  {charged(Number(item.line_total), hold.currency)}
                </span>
              </li>
            ))}
          </ul>
          <div className="border-t border-line/10 mt-3 pt-3 flex justify-between font-semibold text-ink">
            <span>Total</span>
            <span>{total}</span>
          </div>
        </Card>
      </div>
    </Shell>
  );
}

/** The time left, as a ring that empties — red in the last minute. */
function Ring({ fraction, urgent, label }: { fraction: number; urgent: boolean; label: string }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const f = Math.max(0, Math.min(1, fraction));
  return (
    <div className="relative h-32 w-32 shrink-0" role="timer" aria-label={`${label} left`}>
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" strokeWidth="9" className="stroke-line/10" />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - f)}
          className={`transition-[stroke-dashoffset] duration-1000 ease-linear ${urgent ? "stroke-danger" : "stroke-brand"}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-[26px] font-bold tabular-nums ${urgent ? "text-danger" : "text-ink"}`}>{label}</span>
        <span className="text-xs text-ink-muted">left</span>
      </div>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="container-store py-8 max-w-[960px]">{children}</div>;
}

export default function PayPage() {
  return (
    <Suspense fallback={null}>
      <PayInner />
    </Suspense>
  );
}

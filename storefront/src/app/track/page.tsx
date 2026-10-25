"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { useStoreSettings } from "@/lib/store-context";
import { useAuth } from "@/lib/auth-store";
import { charged } from "@/lib/format";
import { trackOrder, type TrackedOrder } from "@/lib/orders-api";
import EmptyState from "@/components/ui/EmptyState";
import {
  Search,
  Package,
  CreditCard,
  Box,
  Truck,
  MapPin,
  CheckCircle2,
  Phone,
  Copy,
  ExternalLink,
  ShieldCheck,
  Mail,
  XCircle,
  ArrowLeft
} from "lucide-react";

type Step = {
  key: string;
  label: string;
  detail: string;
  icon: React.ElementType;
  date?: string;
  done: boolean;
};

// How far along the pipeline each backend status is.
const STATUS_RANK: Record<string, number> = {
  draft: 0,
  pending_payment: 0,
  paid: 1,
  processing: 1,
  packed: 2,
  shipped: 3,
  delivered: 4,
};

const STEP_DEFS = [
  { key: "placed", label: "Order placed", detail: "We received your order.", icon: Package, statuses: ["draft", "pending_payment"] },
  { key: "confirmed", label: "Confirmed", detail: "Your order is confirmed and being prepared.", icon: CreditCard, statuses: ["paid", "processing"] },
  { key: "packed", label: "Packed", detail: "Sealed and labelled at our warehouse.", icon: Box, statuses: ["packed"] },
  { key: "shipped", label: "Shipped", detail: "On its way with the courier.", icon: Truck, statuses: ["shipped"] },
  { key: "delivered", label: "Delivered", detail: "Order completed — thanks for shopping with us.", icon: CheckCircle2, statuses: ["delivered"] },
];

function formatDate(value: string | null | undefined) {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function buildSteps(order: TrackedOrder): { steps: Step[]; currentIndex: number } {
  const rank = STATUS_RANK[order.status] ?? 0;
  const eventDates = new Map<string, string>();
  for (const event of order.status_events) {
    const formatted = formatDate(event.created_at);
    if (formatted) eventDates.set(event.to_status, formatted);
  }
  const steps: Step[] = STEP_DEFS.map((def, i) => ({
    key: def.key,
    label: def.label,
    detail: def.detail,
    icon: def.icon,
    date:
      def.statuses.map((s) => eventDates.get(s)).find(Boolean) ??
      (def.key === "placed" ? formatDate(order.placed_at) : undefined),
    done: i <= rank,
  }));
  return { steps, currentIndex: Math.min(rank, steps.length - 1) };
}

function TrackPageInner() {
  const settings = useStoreSettings();
  const params = useSearchParams();
  const user = useAuth((s) => s.user);
  const hydrated = useAuth((s) => s.hydrated);
  const refParam = params.get("ref");
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Signed-in shoppers don't fill in the guest form — if they arrive with an
  // order reference (from their account or an email), look it up using the
  // email on their account automatically.
  useEffect(() => {
    if (!hydrated || !user || !refParam || order || busy) return;
    setBusy(true);
    setError(null);
    trackOrder(refParam, user.email)
      .then(setOrder)
      .catch((err) => setError(err instanceof Error ? err.message : "We couldn't load that order."))
      .finally(() => setBusy(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, user, refParam]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const ref = String(fd.get("order") || "").trim();
    const email = String(fd.get("email") || "").trim();
    if (!ref || !email) {
      setError("Enter your order number and the email used at checkout.");
      return;
    }
    setBusy(true);
    try {
      setOrder(await trackOrder(ref, email));
    } catch (err) {
      setOrder(null);
      setError(err instanceof Error ? err.message : "We couldn't find that order.");
    } finally {
      setBusy(false);
    }
  }

  function copyRef(value: string) {
    navigator.clipboard?.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="container-store py-8 sm:py-12 max-w-3xl">
      <Link
        href={hydrated && user ? "/account?tab=orders" : "/"}
        className="mb-5 inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-muted transition-colors hover:text-ink"
      >
        <ArrowLeft size={16} />
        {hydrated && user ? "Back to orders" : "Back to store"}
      </Link>

      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-[26px] sm:text-[30px] font-semibold text-ink leading-tight">Track your order</h1>
        {hydrated && !user && (
          <p className="text-[14px] text-ink-muted mt-1.5">
            Enter your order number and checkout email — we&apos;ll show you exactly where it is.
          </p>
        )}
      </div>

      {/* Search form — guests only; signed-in shoppers track from their account */}
      {hydrated && !user && (
      <form
        onSubmit={handleSubmit}
        className="bg-surface border border-line/5 rounded-2xl p-4 sm:p-5 grid sm:grid-cols-[1fr_1fr_auto] gap-3 mb-6"
      >
        <label className="flex flex-col gap-1.5">
          <span className="text-[12.5px] font-medium text-ink-muted">Order number</span>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <Search size={16} className="text-ink-faint" />
            </span>
            <input
              name="order"
              required
              autoComplete="off"
              spellCheck={false}
              defaultValue={params.get("ref") ?? ""}
              placeholder="SO-XXXXXXXXX"
              className="soft-input pl-9 pr-3 py-2.5"
            />
          </div>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[12.5px] font-medium text-ink-muted">Email used at checkout</span>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <Mail size={16} className="text-ink-faint" />
            </span>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              inputMode="email"
              placeholder="you@example.com"
              className="soft-input pl-9 pr-3 py-2.5"
            />
          </div>
        </label>
        <button
          type="submit"
          disabled={busy}
          className="sm:self-end inline-flex items-center justify-center gap-1.5 bg-brand hover:bg-brand-dark text-white font-semibold text-[14px] px-5 py-3 sm:py-2.5 rounded-md transition-colors active:scale-[0.99] disabled:opacity-70"
        >
          {busy ? "Looking up…" : "Track"}
        </button>
        {error && (
          <div role="alert" className="sm:col-span-3 text-[12.5px] text-danger bg-danger/5 border border-danger/20 rounded-md px-3 py-2">
            {error}
          </div>
        )}
      </form>
      )}

      {/* Guest, no result yet */}
      {hydrated && !user && !order && (
        <EmptyState
          icon={<Package size={20} />}
          title="No tracking yet"
          description="Drop in your order number and email above and we'll fetch the latest status."
        />
      )}

      {/* Signed in, no result yet */}
      {hydrated && user && !order && (
        busy ? (
          <EmptyState title="Loading your order…" />
        ) : (
          <EmptyState
            icon={<Package size={20} />}
            title={error ? "We couldn't load that order" : "Track your orders"}
            description={error ?? "Open an order from your account to see live tracking."}
            action={{ href: "/account?tab=orders", label: "View your orders" }}
          />
        )
      )}

      {order && <TrackingResult order={order} onCopy={copyRef} copied={copied} />}

      {/* Help footer */}
      <div className="mt-8 grid sm:grid-cols-2 gap-3">
        <div className="bg-surface border border-line/5 rounded-xl p-4 flex items-start gap-3">
          <span className="w-8 h-8 rounded-full bg-brand-50 grid place-items-center shrink-0">
            <Phone size={15} className="text-brand" />
          </span>
          <div>
            <div className="text-[14px] font-semibold text-ink">Need help?</div>
            <p className="text-[12.5px] text-ink-muted mt-0.5">
              {settings.support_phone ? (
                <>Call us on <a className="text-brand font-medium" href={`tel:${settings.support_phone}`}>{settings.support_phone}</a> or </>
              ) : (
                <>You can always </>
              )}
              <Link href="/contact" className="text-brand font-medium">message support</Link>.
            </p>
          </div>
        </div>
        <div className="bg-surface border border-line/5 rounded-xl p-4 flex items-start gap-3">
          <span className="w-8 h-8 rounded-full bg-brand-50 grid place-items-center shrink-0">
            <ShieldCheck size={15} className="text-brand" />
          </span>
          <div>
            <div className="text-[14px] font-semibold text-ink">Something wrong?</div>
            <p className="text-[12.5px] text-ink-muted mt-0.5">
              If your order arrives damaged or incomplete,{" "}
              <Link href="/contact" className="text-brand font-medium">tell us</Link> and we&apos;ll put it right.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TrackPage() {
  return (
    <Suspense fallback={null}>
      <TrackPageInner />
    </Suspense>
  );
}

/* ─────────── Result ─────────── */
function TrackingResult({
  order,
  onCopy,
  copied
}: {
  order: TrackedOrder;
  onCopy: (v: string) => void;
  copied: boolean;
}) {
  const halted = order.status === "cancelled" || order.status === "refunded";
  const { steps, currentIndex } = buildSteps(order);
  const current = steps[currentIndex];
  const CurrentIcon = halted ? XCircle : current.icon;
  const completedCount = steps.filter((s) => s.done).length;
  const totalCount = steps.length;
  const progress = halted ? 0 : Math.round((completedCount / totalCount) * 100);
  const eta = formatDate(order.shipment?.estimated_delivery_at);

  return (
    <article className="grid gap-4">
      {/* Status hero */}
      <header className={`text-white rounded-2xl p-5 sm:p-6 relative overflow-hidden ${halted ? "bg-gradient-to-br from-neutral-600 to-neutral-800" : "bg-gradient-to-br from-brand to-brand-dark"}`}>
        <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-surface/5 pointer-events-none" />
        <div className="absolute -right-20 top-20 w-56 h-56 rounded-full bg-surface/5 pointer-events-none" />
        <div className="relative flex items-start gap-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-surface/15 backdrop-blur grid place-items-center shrink-0">
            <CurrentIcon size={24} className="text-white sm:hidden" />
            <CurrentIcon size={26} className="text-white hidden sm:block" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] uppercase tracking-wider text-white/70">Current status</div>
            <div className="text-[20px] sm:text-[22px] font-semibold leading-tight mt-0.5">
              {halted ? (order.status === "cancelled" ? "Cancelled" : "Refunded") : current.label}
            </div>
            <p className="text-[13px] text-white/85 mt-1">
              {halted
                ? order.status === "cancelled"
                  ? "This order was cancelled. Contact support if that's unexpected."
                  : "This order was refunded in full."
                : current.detail}
            </p>
            {eta && !halted && (
              <div className="mt-3 inline-flex items-center gap-2 bg-surface/15 backdrop-blur rounded-full px-3 py-1.5 text-[12.5px] max-w-full">
                <Truck size={13} className="shrink-0" />
                <span className="truncate">Estimated delivery <span className="font-semibold">{eta}</span></span>
              </div>
            )}
          </div>
        </div>

        {!halted && (
          <div className="mt-5 flex items-center gap-3">
            <div className="flex-1 h-1.5 bg-surface/15 rounded-full overflow-hidden">
              <div className="h-full bg-surface rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
            <span className="text-[12px] tabular-nums text-white/80">{completedCount}/{totalCount}</span>
          </div>
        )}
      </header>

      {/* Order ref + carrier */}
      <section className="bg-surface border border-line/5 rounded-2xl p-5 grid sm:grid-cols-2 gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-ink-faint">Order reference</div>
          <div className="flex items-center gap-2 mt-1">
            <code className="text-[15px] font-semibold text-ink">{order.number}</code>
            <button
              type="button"
              onClick={() => onCopy(order.number)}
              aria-label="Copy reference"
              className="p-1.5 text-ink-muted hover:text-brand rounded transition-colors"
            >
              {copied ? <CheckCircle2 size={14} className="text-brand" /> : <Copy size={14} />}
            </button>
          </div>
          <div className="text-[13px] text-ink-muted mt-2 flex items-center gap-1.5">
            <MapPin size={13} className="text-ink-faint" />
            Placed {formatDate(order.placed_at) ?? "recently"}
          </div>
        </div>
        <div className="pt-4 border-t border-line/5 sm:pt-0 sm:border-t-0 sm:border-l sm:pl-4">
          <div className="text-[11px] uppercase tracking-wider text-ink-faint">Carrier</div>
          {order.shipment ? (
            <>
              <div className="text-[15px] font-semibold text-ink mt-1">{order.shipment.carrier || "Courier"}</div>
              {order.shipment.tracking_number &&
                (order.shipment.tracking_url ? (
                  <a
                    href={order.shipment.tracking_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[13px] text-brand hover:text-brand-dark font-medium mt-2"
                  >
                    {order.shipment.tracking_number}
                    <ExternalLink size={12} />
                  </a>
                ) : (
                  <div className="text-[13px] text-ink-muted mt-2">{order.shipment.tracking_number}</div>
                ))}
            </>
          ) : (
            <div className="text-[13px] text-ink-muted mt-1.5">Not handed to a courier yet.</div>
          )}
        </div>
      </section>

      {/* Timeline */}
      {!halted && (
        <section className="bg-surface border border-line/5 rounded-2xl p-5 sm:p-6">
          <h2 className="text-[15px] font-semibold text-ink mb-4">Journey timeline</h2>
          <ol className="relative">
            {steps.map((step, i) => {
              const Icon = step.icon;
              const isCurrent = i === currentIndex;
              const isLast = i === steps.length - 1;
              return (
                <li key={step.key} className="relative pl-12 pb-6 last:pb-0">
                  {!isLast && (
                    <span
                      aria-hidden
                      className={`absolute left-[15px] top-9 bottom-0 w-px ${step.done ? "bg-brand/30" : "bg-black/8"}`}
                    />
                  )}
                  <span
                    className={`absolute left-0 top-0 w-8 h-8 rounded-full grid place-items-center transition-colors ${
                      step.done
                        ? "bg-brand text-white"
                        : isCurrent
                        ? "bg-brand-50 text-brand ring-4 ring-brand/15"
                        : "bg-surface-alt text-ink-faint border border-line/10"
                    }`}
                  >
                    {step.done && !isCurrent ? <CheckCircle2 size={16} /> : <Icon size={15} />}
                    {isCurrent && (
                      <span className="absolute inset-0 rounded-full animate-ping bg-brand/30" />
                    )}
                  </span>
                  <div className="min-h-[32px]">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-[14px] font-semibold ${step.done || isCurrent ? "text-ink" : "text-ink-muted"}`}>
                        {step.label}
                      </span>
                      {isCurrent && (
                        <span className="text-[10.5px] uppercase tracking-wider bg-brand-50 text-brand-dark px-1.5 py-0.5 rounded">
                          Now
                        </span>
                      )}
                    </div>
                    <p className={`text-[12.5px] mt-0.5 leading-relaxed ${step.done || isCurrent ? "text-ink-muted" : "text-ink-faint"}`}>
                      {step.detail}
                    </p>
                    {step.date && (
                      <div className="text-[11.5px] text-ink-faint mt-1 tabular-nums">{step.date}</div>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      {/* Order summary */}
      <section className="bg-surface border border-line/5 rounded-2xl p-5">
        <h2 className="text-[15px] font-semibold text-ink mb-3">In this delivery</h2>
        <ul className="divide-y divide-line/5">
          {order.items.map((item) => (
            <li key={item.name} className="flex items-center justify-between py-2.5 text-[14px]">
              <span className="text-ink">{item.name}</span>
              <span className="text-ink-muted tabular-nums">×{item.quantity}</span>
            </li>
          ))}
        </ul>
        <div className="h-px bg-black/5 my-3" />
        <div className="flex items-center justify-between text-[14px]">
          <span className="text-ink-muted">Order total</span>
          <span className="text-ink font-semibold tabular-nums">{charged(Number(order.grand_total), order.currency)}</span>
        </div>
      </section>
    </article>
  );
}

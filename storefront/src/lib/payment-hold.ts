"use client";
// An order waiting to be paid for, as the backend's `payment_hold` describes
// it. Checkout reserves the stock before any money moves, so an unpaid order
// is held for a fixed ten minutes from when it was placed; the pay page counts
// that down and retries from it.

export type PaymentAttempt = {
  /** The checkout key it was made with: "mobile", "paystack", "paypal"… */
  method: string;
  status: string;
  failure_reason: string;
  /** The gateway's own page, for the ones that host one. */
  redirect_url: string | null;
  created_at: string;
};

export type HeldItem = {
  product_id: number | null;
  product_slug: string;
  variant_id: number | null;
  name: string;
  variant_label: string;
  quantity: number;
  line_total: string;
};

export type PaymentHold = {
  number: string;
  state: "awaiting_payment" | "paid" | "released" | string;
  payment_status: string;
  payment_due_at: string | null;
  seconds_left: number;
  server_time: string;
  can_retry: boolean;
  /** A payment has just been started and may still be answered. */
  in_flight: boolean;
  grand_total: string;
  currency: string;
  email: string;
  phone: string;
  items: HeldItem[];
  attempt: PaymentAttempt | null;
};

/** A hold plus the moment it was read, so the countdown runs on this
 *  browser's monotonic clock from the server's seconds-left — not from the
 *  server's timestamp, which a computer a few minutes out would misread. */
export type FetchedHold = PaymentHold & { fetchedAt: number };

export function remainingMs(hold: FetchedHold, now = performance.now()): number {
  return Math.max(0, hold.seconds_left * 1000 - (now - hold.fetchedAt));
}

export function clock(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const mm = String(Math.floor(total / 60)).padStart(2, "0");
  const ss = String(total % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

export function lastAttemptFailed(hold: PaymentHold): boolean {
  return hold.attempt?.status === "failed" || hold.attempt?.status === "cancelled";
}

export class PaymentHoldError extends Error {
  constructor(
    message: string,
    /** "in_flight", "too_late", "released", "paid", "method", "not_found" */
    readonly code: string,
    readonly hold?: FetchedHold,
  ) {
    super(message);
  }
}

function stamp(hold: PaymentHold): FetchedHold {
  return { ...hold, fetchedAt: performance.now() };
}

export async function fetchHold(number: string, token?: string | null): Promise<FetchedHold> {
  const query = token ? `?t=${encodeURIComponent(token)}` : "";
  const response = await fetch(`/api/orders/${encodeURIComponent(number)}/payment${query}`, { cache: "no-store" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new PaymentHoldError(
      response.status === 404 ? "We couldn't find that order." : data.detail || "Something went wrong.",
      response.status === 404 ? "not_found" : "",
    );
  }
  return stamp(data as PaymentHold);
}

export async function retryPayment(
  number: string,
  { token, method, phone }: { token?: string | null; method: string; phone?: string },
): Promise<FetchedHold> {
  const response = await fetch(`/api/orders/${encodeURIComponent(number)}/payment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: token || undefined, payment_method: method, phone: phone || undefined }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new PaymentHoldError(
      data.detail || "Something went wrong.",
      data.code || "",
      data.hold ? stamp(data.hold as PaymentHold) : undefined,
    );
  }
  return stamp(data as PaymentHold);
}

/* Pay tokens for orders placed in this browser. A guest has no account to be
   recognised by, so this is their way back to the pay page — from the banner,
   or after closing the tab. Per-browser by design, and best-effort: storage
   can be blocked, and the reminder email carries the token too. */
const KEY = "pay_tokens";

function readTokens(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}") as Record<string, string>;
  } catch {
    return {};
  }
}

function writeTokens(tokens: Record<string, string>) {
  try {
    localStorage.setItem(KEY, JSON.stringify(tokens));
  } catch {
    /* storage blocked — the email link still works */
  }
}

export const payTokens = {
  all: readTokens,
  get: (number: string): string | undefined => readTokens()[number],
  remember(number: string, token: string) {
    if (!number || !token) return;
    // Ten minutes is a hold's whole life; the newest few are all that matter.
    const kept = Object.entries({ ...readTokens(), [number]: token }).slice(-5);
    writeTokens(Object.fromEntries(kept));
    window.dispatchEvent(new Event("pay-tokens"));
  },
  forget(number: string) {
    const tokens = readTokens();
    if (!(number in tokens)) return;
    delete tokens[number];
    writeTokens(tokens);
    // The banner re-asks, so it stops claiming an order is waiting the moment
    // something here learns it was paid or released.
    window.dispatchEvent(new Event("pay-tokens"));
  },
};

/** Orders from this browser or this account that are still waiting. */
export async function awaitingHolds(): Promise<FetchedHold[]> {
  const found = new Map<string, FetchedHold>();
  try {
    const response = await fetch("/api/orders/awaiting-payment", { cache: "no-store" });
    if (response.ok) {
      for (const row of (await response.json()) as PaymentHold[]) found.set(row.number, stamp(row));
    }
  } catch {
    /* signed-out or unreachable: the tokens below still count */
  }
  for (const [number, token] of Object.entries(readTokens())) {
    if (found.has(number)) continue;
    try {
      const hold = await fetchHold(number, token);
      if (hold.state === "awaiting_payment") found.set(number, hold);
      else payTokens.forget(number);
    } catch (err) {
      if (err instanceof PaymentHoldError && err.code === "not_found") payTokens.forget(number);
    }
  }
  return [...found.values()].filter((h) => h.state === "awaiting_payment");
}

export function payPageHref(number: string, token?: string | null) {
  return `/checkout/pay/${encodeURIComponent(number)}${token ? `?t=${encodeURIComponent(token)}` : ""}`;
}

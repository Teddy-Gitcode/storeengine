// Client wrappers for checkout, orders, tracking, and coupons — all proxied
// through this app's /api/* route handlers so the auth cookie stays httpOnly.
import { ApiError } from "@/lib/account-api";

export type CheckoutItem = { product_id: number; quantity: number; variant_id?: number };

export type CheckoutPayload = {
  items: CheckoutItem[];
  contact: { name: string; email: string; phone: string };
  shipping_address?: {
    full_name: string;
    phone?: string;
    line1: string;
    line2?: string;
    city: string;
    county_or_state?: string;
    postal_code?: string;
    country_code?: string;
    // Where the parcel actually goes, when the shopper placed a pin. Absent
    // whenever the address was typed by hand, which stays a valid checkout.
    latitude?: number;
    longitude?: number;
    geocode_source?: "geocoded" | "pin";
  };
  address_id?: number;
  /** The chosen method's checkout key — "mobile", "paystack", "paypal"… */
  payment_method: string;
  coupon_code?: string;
  notes?: string;
  /** The currency the shopper is paying in (KES/USD); the server confirms it. */
  currency?: string;
};

export type CheckoutResult = {
  number: string;
  status: string;
  subtotal: string;
  discount_total: string;
  shipping_total: string;
  /** Tax already contained in grand_total — prices are tax-inclusive. */
  tax_total: string;
  /** Name of the tax rule that applied, e.g. "VAT" or "US sales tax". */
  tax_label: string;
  grand_total: string;
  currency: string;
  payment: {
    provider: string | null;
    status: string | null;
    /** Where the shopper finishes paying, for a gateway that hosts its own
     *  page — PayPal and Paystack. Absent for the ones that don't: cash on
     *  delivery has nowhere to send anybody and M-Pesa rings the phone. */
    redirect_url?: string | null;
    /** Why the gateway refused to start, when it did. */
    failure_reason?: string;
  };
  /** The guest's key to this order's pay page. */
  pay_token?: string;
  /** Present for an order that has to be paid up front. */
  hold?: import("./payment-hold").PaymentHold;
};

export type MyOrderItem = {
  id: number;
  product_id: number | null;
  product_slug: string;
  name: string;
  quantity: number;
  unit_price: string;
  line_total: string;
  image_url: string;
};

export type MyOrder = {
  id: number;
  number: string;
  status: string;
  currency: string;
  subtotal: string;
  shipping_total: string;
  discount_total: string;
  tax_total: string;
  grand_total: string;
  placed_at: string | null;
  created_at: string;
  items: MyOrderItem[];
  status_events: { to_status: string; reason: string; created_at: string }[];
};

export type TrackedOrder = {
  number: string;
  status: string;
  placed_at: string | null;
  grand_total: string;
  currency: string;
  items: { name: string; quantity: number; line_total: string }[];
  status_events: { to_status: string; reason: string; created_at: string }[];
  shipment: {
    provider: string;
    carrier: string;
    status: string;
    tracking_number: string;
    tracking_url: string;
    estimated_delivery_at: string | null;
  } | null;
};

export type CouponValidation =
  | { valid: true; code: string; promotion_type: string; value: string; discount_amount: string; free_shipping: boolean; message: string }
  | { valid: false; message: string };

/* ─── Payment methods ───────────────────────────────────────────────────
   Configured in the admin (Payments → Payment Method). There is no fallback:
   a store with nothing switched on cannot take an order. */

export type PaymentMethodOption = {
  id: number;
  name: string;
  body_text: string;
  logo_url: string;
  method: string;
};

import { API_BASE } from "./api-base";
import { mediaSrc } from "./images";

/** Confirms a PayPal order once PayPal has sent the shopper back.
 *  An approval is permission, not payment — this is the call that takes it. */
export async function capturePayPal(orderNumber: string) {
  const response = await fetch(`${API_BASE}/storefront/payments/paypal/capture/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ order: orderNumber }),
    cache: "no-store",
  });
  const data = (await response.json().catch(() => ({}))) as {
    status?: string;
    detail?: string;
  };
  if (!response.ok) throw new Error(data.detail || "Could not confirm the payment.");
  return data;
}

/** Asks the server what Paystack says about a reference. Covers the signed
 *  webhook not arriving, which happens; the server runs the same check either
 *  way, so this cannot disagree with it. */
export async function confirmPaystack(reference: string) {
  const response = await fetch(`${API_BASE}/storefront/payments/paystack/confirm/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reference }),
    cache: "no-store",
  });
  const data = (await response.json().catch(() => ({}))) as {
    status?: string;
    order?: string;
    detail?: string;
  };
  if (!response.ok) throw new Error(data.detail || "Could not confirm the payment.");
  return data;
}

export async function getPaymentMethods(country?: string | null, currency?: string | null): Promise<PaymentMethodOption[]> {
  try {
    // Which gateways can take this shopper's money depends on the currency
    // they pay in — M-Pesa is shillings only — so the API is told both.
    const qs = new URLSearchParams();
    if (country) qs.set("country", country);
    if (currency) qs.set("currency", currency);
    const query = qs.toString() ? `?${qs}` : "";
    const response = await fetch(`${API_BASE}/storefront/payment-methods/${query}`, { cache: "no-store" });
    if (!response.ok) return [];
    const payload = (await response.json()) as PaymentMethodOption[] | { results?: PaymentMethodOption[] };
    const methods = Array.isArray(payload) ? payload : payload.results || [];
    return methods.map((m) => ({ ...m, logo_url: mediaSrc(m.logo_url) }));
  } catch {
    return [];
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError((data as { detail?: string }).detail || "Something went wrong.", response.status);
  }
  return data as T;
}

export function placeOrder(payload: CheckoutPayload) {
  return request<CheckoutResult>("/api/checkout", { method: "POST", body: JSON.stringify(payload) });
}

export function getMyOrders() {
  return request<{ results?: MyOrder[] } | MyOrder[]>("/api/account/orders").then((data) => {
    const orders = Array.isArray(data) ? data : data.results ?? [];
    return orders.map((o) => ({
      ...o,
      items: o.items.map((i) => ({ ...i, image_url: mediaSrc(i.image_url) })),
    }));
  });
}

export function trackOrder(number: string, email: string) {
  return request<TrackedOrder>("/api/track", { method: "POST", body: JSON.stringify({ number, email }) });
}

export function validateCoupon(code: string, subtotal: number) {
  return request<CouponValidation>("/api/coupons/validate", {
    method: "POST",
    body: JSON.stringify({ code, subtotal: subtotal.toFixed(2) }),
  });
}

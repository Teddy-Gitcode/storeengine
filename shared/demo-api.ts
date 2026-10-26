/* The StoreEngine demo's stand-in for the Django API.
 *
 * Both apps point NEXT_PUBLIC_API_BASE_URL at DEMO_API, an address that does
 * not exist. On the server, instrumentation.ts patches fetch so any request to
 * it is answered here; in the browser, instrumentation-client.ts sends the same
 * requests to /demo-api/*, a route handler that also lands here.
 *
 * Answers come from fixtures recorded against the real backend running on a
 * seeded copy of the database: products and settings from the live store,
 * customers and orders generated. Reads are served from them, with paging,
 * filtering and search done locally. Writes succeed and echo back what was
 * sent, but are never stored: the demo is public, and shared writable state
 * would let any visitor rewrite what the next one sees.
 *
 * This file is copied into each app by scripts/sync-shared.mjs; edit it here.
 */
import fixtureData from "./fixtures";

export { DEMO_API, isDemoApi } from "./demo-config";

type Fixture = { status: number; body: unknown };
type Row = Record<string, unknown>;
type Page = { count: number; next: string | null; previous: string | null; results: Row[] };

/* When the fixtures were recorded. Every timestamp in them moves forward by
   the whole days since, so "placed yesterday" stays yesterday and the demo
   never looks abandoned. Update it when the fixtures are re-recorded. */
const RECORDED_AT = Date.parse("2026-10-26T09:10:00Z");
const DAY_MS = 86_400_000;
const ISO_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

function shiftDates(data: Record<string, Fixture>): Record<string, Fixture> {
  const days = Math.max(0, Math.floor((Date.now() - RECORDED_AT) / DAY_MS));
  if (!days) return data;
  const offset = days * DAY_MS;
  return JSON.parse(JSON.stringify(data), (_key, value) =>
    typeof value === "string" && ISO_DATETIME.test(value) ? new Date(Date.parse(value) + offset).toISOString() : value,
  );
}

const FIXTURES = shiftDates(fixtureData);
const PAGING = new Set(["page", "page_size", "limit", "offset"]);
const DEFAULT_PAGE_SIZE = 24;
const SHOPPER_TOKEN = "demo-shopper-token";
const ADMIN_TOKEN = "demo-admin-token";

/* Paths that need a signed-in shopper. Without this every visitor would see
   the demo shopper's account, because the fixture exists either way. */
const SHOPPER_ONLY = [
  "/auth/me/",
  "/storefront/my/",
  "/storefront/wishlist/",
  "/storefront/addresses/",
  "/storefront/orders/awaiting-payment/",
];

const json = (body: unknown, status = 200) =>
  status === 204
    ? new Response(null, { status })
    : new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const isPage = (body: unknown): body is Page =>
  !!body && typeof body === "object" && Array.isArray((body as Page).results) && "count" in (body as Page);

function normQuery(params: URLSearchParams) {
  const kept = [...params.entries()].filter(([k, v]) => !PAGING.has(k) && v !== "").sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return new URLSearchParams(kept).toString();
}

function fixture(path: string, query = ""): Fixture | undefined {
  return FIXTURES[query ? `${path}?${query}` : path];
}

/* ─── Reads ─────────────────────────────────────────────────────────────── */

function lookup(row: Row, field: string): unknown {
  return field.split("__").reduce<unknown>((value, part) => {
    if (value && typeof value === "object") {
      const next = (value as Row)[part];
      // `category=electronics` against a nested {id, slug, name} object.
      if (next && typeof next === "object" && !Array.isArray(next) && part === field.split("__").at(-1)) {
        const obj = next as Row;
        return obj.slug ?? obj.id ?? obj.name;
      }
      return next;
    }
    return undefined;
  }, row);
}

function matches(value: unknown, wanted: string): boolean {
  if (Array.isArray(value)) return value.some((v) => matches(v && typeof v === "object" ? (v as Row).slug ?? (v as Row).id : v, wanted));
  if (typeof value === "boolean") return String(value) === wanted.toLowerCase();
  return String(value ?? "") === wanted;
}

function filterRows(rows: Row[], params: URLSearchParams) {
  let out = rows;
  for (const [key, raw] of params.entries()) {
    if (PAGING.has(key) || raw === "") continue;
    if (key === "search" || key === "q") {
      const needle = raw.toLowerCase();
      out = out.filter((row) => JSON.stringify(row).toLowerCase().includes(needle));
    } else if (key === "ordering") {
      const desc = raw.startsWith("-");
      const field = raw.replace(/^-/, "");
      out = [...out].sort((a, b) => {
        const x = lookup(a, field);
        const y = lookup(b, field);
        const nx = Number(x);
        const ny = Number(y);
        const cmp = !Number.isNaN(nx) && !Number.isNaN(ny) ? nx - ny : String(x ?? "").localeCompare(String(y ?? ""));
        return desc ? -cmp : cmp;
      });
    } else if (key === "ids") {
      const ids = new Set(raw.split(","));
      out = out.filter((row) => ids.has(String(row.id)));
    } else if (rows.length && lookup(rows[0], key) !== undefined) {
      // Only filter on fields the rows actually carry; an unknown parameter is
      // something the real backend computes, and dropping every row for it
      // would be worse than ignoring it.
      out = out.filter((row) => matches(lookup(row, key), raw));
    }
  }
  return out;
}

function paginate(body: unknown, params: URLSearchParams, url: URL): unknown {
  if (!isPage(body)) return body;
  const size = Math.max(1, Math.min(200, Number(params.get("page_size")) || DEFAULT_PAGE_SIZE));
  const page = Math.max(1, Number(params.get("page")) || 1);
  const start = (page - 1) * size;
  const link = (p: number) => {
    const u = new URL(url);
    u.searchParams.set("page", String(p));
    return u.toString();
  };
  return {
    ...body,
    count: body.results.length,
    next: start + size < body.results.length ? link(page + 1) : null,
    previous: page > 1 ? link(page - 1) : null,
    results: body.results.slice(start, start + size),
  };
}

function read(path: string, url: URL): Response {
  const params = url.searchParams;
  const query = normQuery(params);

  const exact = fixture(path, query);
  if (exact) return json(paginate(exact.body, params, url), exact.status);

  // No push in the demo: an empty key is how the storefront knows to hide it.
  if (path === "/storefront/push/web/key/") return json({ public_key: "" });

  // "You may also like": more from the same categories, best sellers first.
  if (path === "/catalog/recommendations/") {
    const all = fixture("/catalog/products/")?.body;
    const rows = isPage(all) ? all.results : [];
    const ids = new Set((params.get("ids") ?? "").split(","));
    const cats = new Set(rows.filter((p) => ids.has(String(p.id))).map((p) => lookup(p, "category")));
    return json(
      rows
        .filter((p) => !ids.has(String(p.id)) && cats.has(lookup(p, "category")))
        .sort((a, b) => Number(b.units_sold ?? 0) - Number(a.units_sold ?? 0))
        .slice(0, 8),
    );
  }

  // Same collection, a filter combination the crawl never asked for.
  const base = fixture(path);
  if (base && (isPage(base.body) || Array.isArray(base.body))) {
    const rows = isPage(base.body) ? base.body.results : (base.body as Row[]);
    const filtered = filterRows(rows, params);
    return isPage(base.body)
      ? json(paginate({ ...base.body, results: filtered }, params, url))
      : json(filtered);
  }

  // A detail page whose record is in its parent collection.
  const parts = path.replace(/\/$/, "").split("/");
  const id = decodeURIComponent(parts.pop() ?? "");
  const parent = fixture(`${parts.join("/")}/`);
  if (parent) {
    const rows = isPage(parent.body) ? parent.body.results : Array.isArray(parent.body) ? (parent.body as Row[]) : [];
    const row = rows.find((r) => [r.id, r.slug, r.number, r.reference].some((v) => String(v) === id));
    if (row) return json(row);
  }

  return json({ detail: "Not found." }, 404);
}

/* ─── Writes ────────────────────────────────────────────────────────────── */

function parse(body: string | null): Row {
  if (!body) return {};
  try {
    const value = JSON.parse(body);
    return value && typeof value === "object" ? (value as Row) : {};
  } catch {
    return {};
  }
}

const me = () => (fixture("/auth/me/")?.body ?? {}) as Row;
const now = () => new Date().toISOString();
const money = (n: number) => n.toFixed(2);

function product(id: unknown): Row | undefined {
  const all = fixture("/catalog/products/")?.body;
  return isPage(all) ? all.results.find((p) => String(p.id) === String(id)) : undefined;
}

/* An order placed in the demo lives in its own pay token: the server keeps
   nothing, so any instance can answer for it, and it is gone with the tab. */
type DemoOrder = {
  number: string;
  method: string;
  email: string;
  phone: string;
  created: number;
  currency: string;
  subtotal: number;
  shipping: number;
  discount: number;
  items: { product_id: number; product_slug: string; name: string; quantity: number; line_total: string }[];
};

const encode = (order: DemoOrder) =>
  btoa(unescape(encodeURIComponent(JSON.stringify(order)))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

function decode(token: string | null): DemoOrder | null {
  if (!token) return null;
  try {
    const b64 = token.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(decodeURIComponent(escape(atob(b64)))) as DemoOrder;
  } catch {
    return null;
  }
}

/** Gateways "answer" this long after checkout; long enough to see the wait. */
const GATEWAY_DELAY_MS = 6000;

function hold(order: DemoOrder) {
  const cod = order.method === "cod";
  const elapsed = Date.now() - order.created;
  const paid = !cod && elapsed > GATEWAY_DELAY_MS;
  const total = order.subtotal + order.shipping - order.discount;
  return {
    number: order.number,
    state: cod ? "due_on_delivery" : paid ? "paid" : "awaiting_payment",
    payment_status: cod ? "due_on_delivery" : paid ? "paid" : "pending",
    payment_due_at: cod ? null : new Date(order.created + 10 * 60_000).toISOString(),
    seconds_left: cod || paid ? 0 : Math.max(0, Math.round((order.created + 10 * 60_000 - Date.now()) / 1000)),
    server_time: now(),
    can_retry: !cod && !paid,
    in_flight: !cod && !paid,
    grand_total: money(total),
    currency: order.currency,
    email: order.email,
    phone: order.phone,
    items: order.items.map((i) => ({ ...i, variant_id: null, variant_label: "", addon_ids: [], note: "" })),
    attempt: cod
      ? null
      : {
          method: order.method,
          status: paid ? "confirmed" : "pending",
          failure_reason: "",
          redirect_url: null,
          created_at: new Date(order.created).toISOString(),
        },
  };
}

function checkout(data: Row) {
  const items = ((data.items as Row[]) ?? [])
    .map((line) => {
      const p = product(line.product_id);
      const quantity = Math.max(1, Number(line.quantity) || 1);
      return p
        ? {
            product_id: Number(p.id),
            product_slug: String(p.slug),
            name: String(p.name),
            quantity,
            line_total: money(Number(p.price) * quantity),
          }
        : null;
    })
    .filter((i): i is NonNullable<typeof i> => i !== null);
  if (!items.length) return json({ items: ["Your cart is empty."] }, 400);

  const contact = (data.contact as Row) ?? {};
  const subtotal = items.reduce((sum, i) => sum + Number(i.line_total), 0);
  const settings = (fixture("/store/settings/")?.body ?? {}) as Row;
  const code = String(data.coupon_code ?? "").toUpperCase();
  // Prices are in the base currency. A shopper paying in the second one is
  // charged at its rate, as the real checkout does; anything else is the base.
  const base = String(settings.currency_code ?? "KES");
  const asked = String(data.currency ?? "").toUpperCase();
  const second = String(settings.secondary_currency_code ?? "").toUpperCase();
  const rate = asked && asked === second ? Number(settings.secondary_currency_rate) || 1 : 1;
  const charge = (amount: number) => Math.round(amount * rate * 100) / 100;
  const d = new Date();
  const order: DemoOrder = {
    number: `SO-${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}${Math.floor(10000 + Math.random() * 89999)}`,
    method: String(data.payment_method ?? "mobile"),
    email: String(contact.email ?? me().email ?? ""),
    phone: String(contact.phone ?? ""),
    created: Date.now(),
    currency: rate === 1 ? base : second,
    subtotal: charge(subtotal),
    shipping: code === "FREESHIP" ? 0 : charge(Number(settings.flat_shipping_fee ?? 300)),
    discount: code === "WELCOME10" ? charge(Math.round(subtotal * 0.1)) : 0,
    items,
  };
  const h = hold(order);
  return json(
    {
      number: order.number,
      status: "pending_payment",
      subtotal: money(order.subtotal),
      discount_total: money(order.discount),
      shipping_total: money(order.shipping),
      tax_total: "0.00",
      tax_label: "VAT",
      grand_total: h.grand_total,
      currency: order.currency,
      payment: { provider: order.method, status: h.payment_status, redirect_url: null },
      pay_token: encode(order),
      hold: h,
    },
    201,
  );
}

function coupon(data: Row) {
  const code = String(data.code ?? "").trim().toUpperCase();
  const subtotal = Number(data.subtotal) || 0;
  if (code === "WELCOME10")
    return json({ valid: true, code, promotion_type: "percentage", value: "10.00", discount_amount: money(Math.round(subtotal * 0.1)), free_shipping: false, message: `Code ${code} applied.` });
  if (code === "FREESHIP")
    return json({ valid: true, code, promotion_type: "free_shipping", value: "0.00", discount_amount: "0.00", free_shipping: true, message: `Code ${code} applied.` });
  return json({ valid: false, message: "Invalid or expired code. Try WELCOME10 or FREESHIP." });
}

/** An order the demo shopper owns, for the tracking page's hint. */
function sampleOrder() {
  const mine = fixture("/storefront/orders/")?.body;
  const rows = isPage(mine) ? mine.results : Array.isArray(mine) ? (mine as Row[]) : [];
  return String(rows[0]?.number ?? "an order number");
}

async function write(method: string, path: string, url: URL, data: Row): Promise<Response> {
  // Shopper session
  if (path === "/auth/login/" || path === "/auth/google/" || path === "/auth/email/verify/")
    return json({ token: SHOPPER_TOKEN, user: me() });
  if (path === "/auth/register/")
    return json({ token: SHOPPER_TOKEN, user: { ...me(), email: data.email ?? me().email, first_name: data.first_name ?? data.name ?? "Demo" }, verification_required: false }, 201);
  if (path === "/auth/logout/") return json(null, 204);
  if (path.startsWith("/auth/password/") || path === "/auth/email/verify/resend/")
    return json({ detail: "Demo store: no email is sent. Sign in with any password instead." });
  if (path === "/auth/me/" && (method === "PATCH" || method === "PUT")) return json({ ...me(), ...data });
  if (path === "/auth/me/delete/") return json({ detail: "Demo store: accounts aren't stored, so there is nothing to delete." });

  // Staff session
  if (path === "/auth/admin-login/")
    return json({ token: ADMIN_TOKEN, user: { username: "demo.admin", email: "admin@storeengine.demo", is_staff: true, is_superuser: true } });

  // Checkout and payment
  if (path === "/storefront/checkout/") return checkout(data);
  const pay = path.match(/^\/storefront\/orders\/([^/]+)\/payment\/$/);
  if (pay) {
    const order = decode(String(data.token ?? url.searchParams.get("t") ?? ""));
    if (!order || order.number !== decodeURIComponent(pay[1])) return json({ detail: "We couldn't find that order." }, 404);
    // A retry restarts the gateway's clock.
    return json(hold({ ...order, method: String(data.payment_method ?? order.method), created: Date.now() }));
  }
  if (path === "/storefront/coupons/validate/") return coupon(data);
  if (path === "/storefront/orders/track/") {
    const number = String(data.number ?? "").trim().toUpperCase();
    const tracked = fixture(`/storefront/orders/${number}/`)?.body as Row | undefined;
    return tracked
      ? json({ ...tracked, shipment: (tracked.shipment as Row) ?? null })
      : json({ detail: `No order with that number and email. Try ${sampleOrder()} with demo@storeengine.demo.` }, 404);
  }
  if (path === "/storefront/contact/") return json({ reference: `TKT-${Math.floor(100000 + Math.random() * 899999)}`, detail: "Thanks! This is a demo, so no one will reply." }, 201);
  if (path === "/storefront/assistant/")
    return json({ reply: "I'm the shopping assistant. In this demo I'm switched off, but on a live store I answer questions about products, delivery and orders.", answer: "In this demo the assistant is switched off." });
  if (path.startsWith("/storefront/wishlist/")) return method === "DELETE" ? json(null, 204) : json({ ok: true }, 201);
  if (path.match(/^\/catalog\/products\/[^/]+\/reviews\/$/))
    return json({ detail: "Thanks! Reviews aren't saved in the demo.", id: Date.now(), display_name: me().first_name ?? "You", rating: data.rating, title: data.title, body: data.body, is_verified_purchase: false, is_approved: false, is_mine: true, created_at: now() }, 201);

  // Everything else: the admin's create/update/delete/actions. Echo the record
  // as it would look afterwards, so forms complete and lists stay as they were.
  if (method === "DELETE") return json(null, 204);
  const existing = read(path, url);
  if (existing.status === 200 && method !== "POST") return await mergeEcho(existing, data);
  if (method === "POST") {
    // An action on a record (…/approve/, …/cancel/): answer with the record.
    const parent = path.replace(/[^/]+\/$/, "");
    const record = parent !== path ? read(parent, url) : null;
    if (record && record.status === 200) return await mergeEcho(record, data);
    return json({ id: Math.floor(100000 + Math.random() * 899999), ...data, created_at: now(), updated_at: now() }, 201);
  }
  return json({ ...data, updated_at: now() });
}

async function mergeEcho(response: Response, data: Row) {
  const current = (await response.json()) as Row;
  return json({ ...current, ...data, updated_at: now() });
}

/* ─── Entry point ───────────────────────────────────────────────────────── */

export async function demoApi(method: string, href: string, headers: Headers, body: string | null): Promise<Response> {
  const url = new URL(href, "https://demo.invalid");
  // Everything after the /api (or /demo-api) prefix, with DRF's trailing slash:
  // a browser request arrives without it, after Next's trailing-slash redirect.
  const path = url.pathname.replace(/^\/(demo-)?api(?=\/)/, "").replace(/\/?$/, "/");
  const auth = headers.get("authorization") ?? "";
  const verb = method.toUpperCase();

  if (SHOPPER_ONLY.some((p) => path.startsWith(p)) || (path === "/storefront/orders/" && verb === "GET")) {
    if (!auth) return json({ detail: "Authentication credentials were not provided." }, 401);
  }

  if (verb === "GET" || verb === "HEAD") {
    const pay = path.match(/^\/storefront\/orders\/([^/]+)\/payment\/$/);
    if (pay) {
      const order = decode(url.searchParams.get("t"));
      return order && order.number === decodeURIComponent(pay[1]) ? json(hold(order)) : json({ detail: "We couldn't find that order." }, 404);
    }
    return read(path, url);
  }
  return write(verb, path, url, parse(body));
}

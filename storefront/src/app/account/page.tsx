"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, Suspense } from "react";
import {
  User as UserIcon,
  MapPin,
  Package,
  LogOut,
  Plus,
  Pencil,
  Trash2,
  Check,
  Star,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  Heart,
  Truck,
  ShoppingBag,
  ArrowLeft,
  MessageSquare,
  Download,
  AlertTriangle,
  X
} from "lucide-react";
import { useAuth } from "@/lib/auth-store";
import { apiDeleteAccount, apiDownloadMyData } from "@/lib/account-api";
import {
  useAddresses,
  countryName,
  countryOptions,
  postcodeRule,
  regionLabel,
  subdivisions,
  validatePostcode,
  storeCountryCode,
  type AddressInput,
  type Address,
  type AddressLabel,
} from "@/lib/address-store";
import { getMyOrders, type MyOrder } from "@/lib/orders-api";
import AddressPicker, { type PickedPlace } from "@/components/AddressPicker";
import { useStoreSettings } from "@/lib/store-context";
import { charged } from "@/lib/format";
import { getThreads, unreadTotal } from "@/lib/support-api";
import EmptyState from "@/components/ui/EmptyState";
import MessagesPane from "./MessagesPane";

type View = "home" | "profile" | "addresses" | "orders" | "messages" | "privacy";

const SECTION_TITLE: Record<Exclude<View, "home">, string> = {
  orders: "Orders",
  addresses: "Addresses",
  profile: "Account details",
  messages: "Messages",
  privacy: "Privacy & data",
};

export default function AccountPage() {
  return (
    <Suspense fallback={<div className="container-store py-16 text-center text-ink-muted text-sm">Loading…</div>}>
      <AccountPageInner />
    </Suspense>
  );
}

function AccountPageInner() {
  const user = useAuth((s) => s.user);
  const hydrated = useAuth((s) => s.hydrated);
  const signOut = useAuth((s) => s.signOut);
  const params = useSearchParams();
  const initialTab = params.get("tab");
  const [view, setView] = useState<View>(
    initialTab === "orders" ||
    initialTab === "profile" ||
    initialTab === "addresses" ||
    initialTab === "messages" ||
    initialTab === "privacy"
      ? initialTab
      : "home"
  );
  const addresses = useAddresses((s) => s.addresses);
  const [orders, setOrders] = useState<MyOrder[] | null>(null);
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    if (user) getMyOrders().then(setOrders).catch(() => setOrders([]));
  }, [user]);
  // Refetched whenever the hub is shown, so the badge settles after a thread
  // is opened and read.
  useEffect(() => {
    if (user && view === "home") {
      getThreads().then((t) => setUnread(unreadTotal(t))).catch(() => setUnread(0));
    }
  }, [user, view]);

  if (!hydrated) {
    return (
      <div className="container-store py-16 text-center text-ink-muted text-sm">Loading…</div>
    );
  }

  if (!user) {
    return (
      <div className="container-store py-12 sm:py-20">
        <div className="max-w-md mx-auto bg-surface border border-line/5 rounded-2xl p-8 text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-brand-50 grid place-items-center mb-4">
            <UserIcon size={26} className="text-brand" />
          </div>
          <h1 className="text-[22px] font-semibold text-ink">You're not signed in</h1>
          <p className="text-[14px] text-ink-muted mt-2 max-w-xs mx-auto">
            Sign in to manage your addresses, track orders, and check out faster.
          </p>
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <Link
              href="/signin"
              className="inline-flex items-center justify-center bg-brand hover:bg-brand-dark text-white font-semibold text-[14px] py-2.5 rounded-md transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center justify-center bg-surface border border-line/15 hover:border-brand text-ink hover:text-brand font-semibold text-[14px] py-2.5 rounded-md transition-colors"
            >
              Create account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:py-10">
      {/* Welcome header */}
      <div className="flex items-center gap-4 rounded-2xl border border-line/5 bg-surface p-5 sm:p-6">
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-brand text-on-brand text-[18px] font-bold tracking-wide">
          {user.initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[18px] sm:text-[20px] font-semibold text-ink">Hello, {user.name}</div>
          <div className="truncate text-[13px] text-ink-muted">{user.email}</div>
        </div>
      </div>

      {view === "home" ? (
        <AccountHome
          orders={orders}
          unread={unread}
          addressCount={addresses.length}
          onOpen={setView}
          onSignOut={() => void signOut()}
        />
      ) : (
        <div className="mt-6">
          <button
            type="button"
            onClick={() => setView("home")}
            className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-muted transition-colors hover:text-ink"
          >
            <ArrowLeft size={15} />
            Account
          </button>
          <h1 className="mb-4 text-[20px] font-semibold text-ink">{SECTION_TITLE[view]}</h1>
          {view === "profile" && <ProfilePane />}
          {view === "addresses" && <AddressesPane />}
          {view === "orders" && <OrdersPane />}
          {view === "messages" && <MessagesPane />}
          {view === "privacy" && <PrivacyPane onSignedOut={() => setView("home")} />}
        </div>
      )}
    </div>
  );
}

/* ─────────── Account home (dashboard hub) ─────────── */
function AccountHome({
  orders,
  unread,
  addressCount,
  onOpen,
  onSignOut,
}: {
  orders: MyOrder[] | null;
  unread: number;
  addressCount: number;
  onOpen: (v: Exclude<View, "home">) => void;
  onSignOut: () => void;
}) {
  const orderCount = orders?.length ?? null;
  const recent = orders && orders.length > 0 ? orders[0] : null;

  return (
    <div className="mt-6 grid gap-4">
      {recent && (
        <Link
          href={`/track?ref=${encodeURIComponent(recent.number)}`}
          className="flex items-center gap-4 rounded-2xl border border-brand/15 bg-brand-50 p-4 sm:p-5 transition-colors hover:border-brand/30"
        >
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand text-on-brand">
            <Package size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-brand-dark">Latest order</div>
            <div className="truncate text-[14.5px] font-semibold text-ink">
              {recent.number} · {statusLabel(recent.status)}
            </div>
            <div className="text-[12.5px] text-ink-muted">
              {new Date(recent.placed_at ?? recent.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })} · {charged(Number(recent.grand_total), recent.currency)}
            </div>
          </div>
          <ChevronRight size={18} className="shrink-0 text-brand" />
        </Link>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <ActionCard icon={Package} title="Orders" subtitle={orderCount === null ? "View your order history" : `${orderCount} order${orderCount === 1 ? "" : "s"}`} onClick={() => onOpen("orders")} />
        <ActionCard icon={MapPin} title="Addresses" subtitle={`${addressCount} saved`} onClick={() => onOpen("addresses")} />
        <ActionCard icon={UserIcon} title="Account details" subtitle="Name, phone & email" onClick={() => onOpen("profile")} />
        <ActionCard
          icon={MessageSquare}
          title="Messages"
          subtitle={unread > 0 ? `${unread} new repl${unread === 1 ? "y" : "ies"}` : "Talk to our team"}
          badge={unread}
          onClick={() => onOpen("messages")}
        />
        <ActionCard icon={Heart} title="Wishlist" subtitle="Items you saved" href="/wishlist" />
        <ActionCard icon={Truck} title="Track an order" subtitle="Check delivery status" href="/track" />
        <ActionCard icon={ShoppingBag} title="Continue shopping" subtitle="Back to the store" href="/shop" />
        <ActionCard
          icon={ShieldCheck}
          title="Privacy & data"
          subtitle="Download or delete your data"
          onClick={() => onOpen("privacy")}
        />
      </div>

      <button
        type="button"
        onClick={onSignOut}
        className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-danger/20 px-4 py-3 text-[14px] font-medium text-danger transition-colors hover:bg-danger/5"
      >
        <LogOut size={16} />
        Sign out
      </button>
    </div>
  );
}

function ActionCard({
  icon: Icon,
  title,
  subtitle,
  onClick,
  href,
  badge = 0,
}: {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  onClick?: () => void;
  href?: string;
  /** Unread count, shown on the icon. Hidden at zero. */
  badge?: number;
}) {
  const inner = (
    <>
      <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand">
        <Icon size={19} />
        {badge > 0 && (
          <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1 text-[10.5px] font-bold text-on-brand">
            {badge > 9 ? "9+" : badge}
          </span>
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold text-ink">{title}</span>
        <span className="block truncate text-[12.5px] text-ink-muted">{subtitle}</span>
      </span>
      <ChevronRight size={17} className="shrink-0 text-ink-faint" />
    </>
  );
  const cls =
    "flex items-center gap-3.5 rounded-2xl border border-line/5 bg-surface p-4 sm:p-5 text-left transition-all hover:-translate-y-0.5 hover:border-brand/30 hover:shadow-[0_12px_32px_-18px_rgb(var(--ink)/0.35)]";
  return href ? (
    <Link href={href} className={cls}>
      {inner}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={cls}>
      {inner}
    </button>
  );
}

/* ─────────── Profile pane ─────────── */
function ProfilePane() {
  const user = useAuth((s) => s.user);
  const updateProfile = useAuth((s) => s.updateProfile);

  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [marketing, setMarketing] = useState(user?.marketing_opt_in ?? false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setBusy(true);
    try {
      await updateProfile({ name: name.trim(), phone, marketing_opt_in: marketing });
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your profile.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="bg-surface border border-line/5 rounded-xl p-6">
      <form onSubmit={handleSave} className="grid gap-4 max-w-md">
        <Field label="Full name" value={name} onChange={setName} required autoComplete="name" />
        <Field label="Phone" value={phone} onChange={setPhone} type="tel" inputMode="tel" autoComplete="tel" placeholder="+ country code" />
        <div>
          <FieldLabel>Email</FieldLabel>
          <div className="text-[14px] font-medium text-ink">{user.email}</div>
        </div>
        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={marketing}
            onChange={(e) => setMarketing(e.target.checked)}
            className="accent-brand w-4 h-4"
          />
          <span className="text-[13px] text-ink-muted">Email me about offers and new arrivals</span>
        </label>
        {error && <div className="rounded-lg border border-danger/20 bg-danger/5 px-3 py-2 text-[12.5px] text-danger">{error}</div>}
        {saved && !error && (
          <div className="flex items-center gap-1.5 text-[12.5px] font-semibold text-brand"><Check size={14} /> Profile saved</div>
        )}
        <button
          type="submit"
          disabled={busy}
          className="self-start inline-flex items-center justify-center bg-brand hover:bg-brand-dark text-white font-semibold text-[14px] px-5 py-2.5 rounded-md transition-colors disabled:opacity-70"
        >
          {busy ? "Saving..." : "Save changes"}
        </button>
      </form>
      <div className="h-px bg-black/5 my-6" />
      <div className="flex items-center gap-2 text-[12.5px] text-ink-muted">
        <ShieldCheck size={14} className="text-brand" />
        Your data is protected — we never sell customer information.
      </div>
    </section>
  );
}

/* ─────────── Orders pane ─────────── */
// Every status Order.Status can hold — `draft` and `pending_payment` are what
// a cash-on-delivery order sits at from the moment it is placed, and they used
// to fall through to the unstyled default.
const STATUS_STYLES: Record<string, string> = {
  draft: "bg-black/5 text-ink-muted",
  pending_payment: "bg-accent/15 text-accent-dark",
  paid: "bg-brand-50 text-brand-dark",
  processing: "bg-brand-50 text-brand-dark",
  packed: "bg-accent/15 text-accent-dark",
  shipped: "bg-accent/15 text-accent-dark",
  delivered: "bg-brand text-white",
  cancelled: "bg-danger/10 text-danger",
  refunded: "bg-black/10 text-ink-muted",
};

function statusLabel(status: string) {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function OrdersPane() {
  const [orders, setOrders] = useState<MyOrder[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [visible, setVisible] = useState(4);

  useEffect(() => {
    getMyOrders()
      .then(setOrders)
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load your orders."));
  }, []);

  if (error) {
    return (
      <section className="bg-surface border border-line/5 rounded-xl p-8 text-center text-[13.5px] text-danger">{error}</section>
    );
  }

  if (orders === null) {
    return <EmptyState title="Loading orders…" />;
  }

  if (orders.length === 0) {
    return (
      <EmptyState
        icon={<Package size={20} />}
        title="No orders yet"
        description="When you place your first order, it'll show up here for tracking and re-ordering."
        action={{ href: "/shop", label: "Browse shop" }}
      />
    );
  }

  return (
    <section className="grid gap-3">
      {orders.slice(0, visible).map((order) => {
        const isOpen = expanded === order.number;
        const itemCount = order.items.reduce((n, i) => n + i.quantity, 0);
        const date = order.placed_at ?? order.created_at;
        return (
          <div key={order.number} className="bg-surface border border-line/5 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setExpanded(isOpen ? null : order.number)}
              className="w-full flex flex-wrap items-center gap-x-4 gap-y-1.5 px-4 sm:px-5 py-4 text-left hover:bg-black/[0.015] transition-colors"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-[13.5px] font-bold text-ink">{order.number}</span>
                  <span className={`text-[10.5px] uppercase tracking-wider px-1.5 py-0.5 rounded ${STATUS_STYLES[order.status] ?? "bg-black/5 text-ink-muted"}`}>
                    {statusLabel(order.status)}
                  </span>
                </div>
                <div className="text-[12.5px] text-ink-muted mt-0.5">
                  {new Date(date).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })} · {itemCount} item{itemCount === 1 ? "" : "s"}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[14.5px] font-semibold text-ink tabular-nums">{charged(Number(order.grand_total), order.currency)}</span>
                <ChevronRight size={16} className={`text-ink-faint transition-transform ${isOpen ? "rotate-90" : ""}`} />
              </div>
            </button>
            {isOpen && (
              <div className="border-t border-line/5 px-4 sm:px-5 py-4">
                <ul className="divide-y divide-line/5">
                  {order.items.map((item) => (
                    <li key={item.id} className="flex items-center gap-3 py-2.5">
                      {item.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.image_url} alt="" className="h-12 w-12 shrink-0 rounded-md border border-line/10 object-cover" />
                      ) : (
                        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-md bg-surface-alt">
                          <Package size={16} className="text-ink-faint" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13.5px] text-ink">{item.name}</div>
                        <div className="text-[12px] text-ink-faint">Qty {item.quantity} · {charged(Number(item.line_total), order.currency)}</div>
                        {order.status === "delivered" && item.product_slug && (
                          <div className="mt-1.5 flex items-center gap-4">
                            <Link href={`/product/${item.product_slug}#reviews`} className="inline-flex items-center gap-1 text-[12px] font-semibold text-brand hover:text-brand-dark">
                              <Star size={12} /> Leave a review
                            </Link>
                            <Link href={`/product/${item.product_slug}`} className="text-[12px] font-medium text-ink-muted hover:text-ink">
                              Buy again
                            </Link>
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
                <dl className="mt-3 pt-3 border-t border-line/5 grid gap-1 text-[12.5px]">
                  <div className="flex justify-between"><dt className="text-ink-muted">Subtotal</dt><dd className="tabular-nums">{charged(Number(order.subtotal), order.currency)}</dd></div>
                  {Number(order.discount_total) > 0 && (
                    <div className="flex justify-between text-brand-dark"><dt>Discount</dt><dd className="tabular-nums">−{charged(Number(order.discount_total), order.currency)}</dd></div>
                  )}
                  <div className="flex justify-between"><dt className="text-ink-muted">Shipping</dt><dd className="tabular-nums">{Number(order.shipping_total) === 0 ? "Free" : charged(Number(order.shipping_total), order.currency)}</dd></div>
                  <div className="flex justify-between font-semibold text-[13px] mt-1"><dt>Total</dt><dd className="tabular-nums">{charged(Number(order.grand_total), order.currency)}</dd></div>
                  {/* Prices are tax-inclusive server-side, so this is a share of
                      the total above, not a charge added to it. */}
                  {Number(order.tax_total) > 0 && (
                    <div className="flex justify-between text-ink-muted"><dt>Includes tax</dt><dd className="tabular-nums">{charged(Number(order.tax_total), order.currency)}</dd></div>
                  )}
                </dl>
                {order.status !== "delivered" && order.status !== "cancelled" && order.status !== "refunded" && (
                  <Link
                    href={`/track?ref=${encodeURIComponent(order.number)}`}
                    className="mt-4 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-brand hover:text-brand-dark"
                  >
                    Track this order <ChevronRight size={13} />
                  </Link>
                )}
              </div>
            )}
          </div>
        );
      })}
      {orders.length > visible && (
        <button
          type="button"
          onClick={() => setVisible((v) => v + 5)}
          className="mt-1 justify-self-center text-[13px] font-semibold text-brand hover:text-brand-dark"
        >
          Show more orders ({orders.length - visible})
        </button>
      )}
    </section>
  );
}

/* ─────────── Addresses pane ─────────── */
function AddressesPane() {
  const hydrated = useAddresses((s) => s.hydrated);
  const addresses = useAddresses((s) => s.addresses);
  const remove = useAddresses((s) => s.remove);
  const setDefault = useAddresses((s) => s.setDefault);

  const [editing, setEditing] = useState<Address | null>(null);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(action: Promise<void>, fallback: string) {
    setError(null);
    try {
      await action;
    } catch (err) {
      setError(err instanceof Error ? err.message : fallback);
    }
  }

  return (
    <section>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h2 className="text-[16px] font-semibold text-ink">Saved addresses</h2>
          <p className="text-[12.5px] text-ink-muted mt-0.5">Pre-filled at checkout so you don't retype them.</p>
        </div>
        <button
          type="button"
          onClick={() => { setEditing(null); setAdding(true); }}
          className="shrink-0 self-start inline-flex items-center gap-1.5 bg-brand hover:bg-brand-dark text-white font-semibold text-[13px] px-3.5 py-2.5 rounded-md transition-colors"
        >
          <Plus size={15} />
          Add address
        </button>
      </div>

      {error && (
        <div role="alert" className="mb-3 rounded-lg border border-danger/20 bg-danger/5 px-3 py-2 text-[12.5px] text-danger">
          {error}
        </div>
      )}

      {!hydrated ? (
        <div className="text-ink-muted text-sm py-10 text-center">Loading…</div>
      ) : addresses.length === 0 && !adding ? (
        <EmptyState
          icon={<MapPin size={20} />}
          title="No saved addresses yet"
          description="Add one and it'll be pre-filled at checkout."
          action={{
            label: "Add your first address",
            onClick: () => setAdding(true),
            icon: <Plus size={15} />,
          }}
        />
      ) : (
        <ul className="grid sm:grid-cols-2 gap-3">
          {addresses.map((a) => (
            <AddressCard
              key={a.id}
              address={a}
              onEdit={() => { setAdding(false); setEditing(a); }}
              onDelete={() => void run(remove(a.id), "Could not delete that address.")}
              onSetDefault={() => void run(setDefault(a.id), "Could not change your default address.")}
            />
          ))}
        </ul>
      )}

      {(adding || editing) && (
        <AddressFormModal
          initial={editing}
          onClose={() => { setAdding(false); setEditing(null); }}
        />
      )}
    </section>
  );
}

function AddressCard({
  address,
  onEdit,
  onDelete,
  onSetDefault
}: {
  address: Address;
  onEdit: () => void;
  onDelete: () => void;
  onSetDefault: () => void;
}) {
  return (
    <li className="bg-surface border border-line/5 rounded-xl p-4 flex flex-col">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-brand-50 text-brand">
            <MapPin size={14} />
          </span>
          <span className="text-[14px] font-semibold text-ink">{address.label}</span>
          {address.isDefault && (
            <span className="inline-flex items-center gap-1 text-[10.5px] uppercase tracking-wider bg-accent/15 text-accent-dark px-1.5 py-0.5 rounded">
              <Star size={10} className="fill-accent-dark" />
              Default
            </span>
          )}
        </div>
        <div className="flex gap-0.5 -mr-1">
          <button type="button" onClick={onEdit} aria-label="Edit address" className="w-9 h-9 grid place-items-center text-ink-muted hover:text-ink rounded transition-colors">
            <Pencil size={15} />
          </button>
          <button type="button" onClick={onDelete} aria-label="Delete address" className="w-9 h-9 grid place-items-center text-ink-muted hover:text-danger rounded transition-colors">
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      <div className="text-[13.5px] text-ink leading-relaxed">
        <div className="font-medium">{address.fullName}</div>
        <div className="text-ink-muted">
          {address.street}{address.building ? `, ${address.building}` : ""}
        </div>
        <div className="text-ink-muted">
          {address.city}{address.county ? `, ${address.county}` : ""}{address.postcode ? ` ${address.postcode}` : ""}
        </div>
        <div className="text-ink-muted">{countryName(address.country)}</div>
        <div className="text-ink-muted mt-1">{address.phone}</div>
      </div>

      {!address.isDefault && (
        <button
          type="button"
          onClick={onSetDefault}
          className="mt-3 self-start inline-flex items-center gap-1.5 text-[12px] font-semibold text-brand hover:text-brand-dark"
        >
          <Check size={13} />
          Set as default
        </button>
      )}
    </li>
  );
}

/* ─────────── Address form modal ─────────── */
const LABELS: AddressLabel[] = ["Home", "Work", "Other"];

function AddressFormModal({ initial, onClose }: { initial: Address | null; onClose: () => void }) {
  const add = useAddresses((s) => s.add);
  const update = useAddresses((s) => s.update);
  const settings = useStoreSettings();

  const [form, setForm] = useState<AddressInput>(() => ({
    label: initial?.label ?? "Home",
    fullName: initial?.fullName ?? "",
    phone: initial?.phone ?? "",
    country: initial?.country ?? storeCountryCode(settings.country),
    county: initial?.county ?? "",
    city: initial?.city ?? "",
    street: initial?.street ?? "",
    building: initial?.building ?? "",
    postcode: initial?.postcode ?? "",
    notes: initial?.notes ?? "",
    latitude: initial?.latitude ?? null,
    longitude: initial?.longitude ?? null,
    geocodeSource: initial?.geocodeSource ?? "",
    isDefault: initial?.isDefault ?? false
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Lock body scroll while open, and let Escape close it.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  function patch<K extends keyof AddressInput>(k: K, v: AddressInput[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  /* Changing country clears the region, because a region only means anything
     inside the country it belongs to — "Texas" left standing under Kenya is
     how an address ends up describing two places at once. The postcode goes
     with it: formats do not survive the border either. The pin goes too, for
     the same reason: a point in Nairobi under a British address is worse than
     no point, because a rider would believe it. */
  function chooseCountry(next: string) {
    setForm((f) =>
      f.country === next
        ? f
        : { ...f, country: next, county: "", postcode: "", latitude: null, longitude: null, geocodeSource: "" },
    );
  }

  /* What the search or the pin found. Same contract as checkout: it fills the
     fields, and anything typed afterwards wins — the written address stays the
     shopper's, the point is what the picker adds to it. */
  const onPick = useCallback((picked: Partial<PickedPlace>) => {
    setForm((f) => ({
      ...f,
      ...(picked.line1 ? { street: picked.line1 } : {}),
      ...(picked.city ? { city: picked.city } : {}),
      ...(picked.county_or_state ? { county: picked.county_or_state } : {}),
      ...(picked.postal_code ? { postcode: picked.postal_code } : {}),
      ...(picked.country_code ? { country: picked.country_code } : {}),
      ...(picked.latitude != null && picked.longitude != null
        ? {
            latitude: picked.latitude,
            longitude: picked.longitude,
            geocodeSource: picked.geocode_source || "pin",
          }
        : {}),
    }));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setError(null);

    // Only refuses a value we are certain contradicts that country's format;
    // blank always passes, because the field is optional everywhere.
    const badPostcode = validatePostcode(form.country, form.postcode ?? "");
    if (badPostcode) {
      setError(badPostcode);
      return;
    }

    setSaving(true);
    try {
      if (initial) await update(initial.id, form);
      else await add(form);
      onClose();
    } catch (err) {
      // The form stays open with what was typed still in it — a rejected save
      // used to close the modal as if it had worked.
      setError(err instanceof Error ? err.message : "Could not save that address.");
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="address-modal-title"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-surface w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="sticky top-0 bg-surface border-b border-line/5 px-5 py-4 flex items-center justify-between">
          <h3 id="address-modal-title" className="text-[16px] font-semibold text-ink">{initial ? "Edit address" : "Add new address"}</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="-mr-1 w-9 h-9 grid place-items-center text-ink-muted hover:text-ink rounded transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-5 grid gap-4">
          <div>
            <FieldLabel>Label</FieldLabel>
            <div className="flex gap-2">
              {LABELS.map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => patch("label", l)}
                  className={`flex-1 px-3 py-2 rounded-md text-[13px] font-medium border transition-colors ${
                    form.label === l
                      ? "bg-brand text-white border-brand"
                      : "bg-surface text-ink-muted border-line/10 hover:border-brand hover:text-brand"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          <Row>
            <Field label="Full name" value={form.fullName} onChange={(v) => patch("fullName", v)} required autoComplete="name" />
            <Field label="Phone" value={form.phone} onChange={(v) => patch("phone", v)} required type="tel" inputMode="tel" autoComplete="tel" placeholder="+ country code" />
          </Row>

          {/* Country first, then the address from most specific to least —
              the order an address is written in, and the order every other
              shop asks for it. It used to run Country, County, City, Postcode
              and only then Street, which put the street below the postcode
              and the region directly under the country. Both misfired: saved
              addresses exist with the country name in the region box and the
              postcode repeated as the street, because by the time the form
              asked for a street the shopper had already given their number to
              the field above it. */}
          <SelectField
            label="Country"
            value={form.country}
            onChange={chooseCountry}
            options={countryOptions(settings.country).map((c) => ({ value: c.code, label: c.name }))}
          />

          {/* The same picker checkout uses. This form had none at all, so every
              address saved here was flat text while the ones checkout created
              carried a point — and this is the book people curate deliberately,
              which makes it the place a pin is worth most. */}
          <AddressPicker
            value={{ latitude: form.latitude, longitude: form.longitude }}
            onPick={onPick}
            country={form.country}
          />

          <Field label="Street / Estate" value={form.street} onChange={(v) => patch("street", v)} required autoComplete="address-line1" placeholder="Estate, road, house or plot number" />
          <Field label="Building / Apartment / Suite (optional)" value={form.building ?? ""} onChange={(v) => patch("building", v)} autoComplete="address-line2" />

          <Row>
            <Field label="City" value={form.city} onChange={(v) => patch("city", v)} required autoComplete="address-level2" />
            {/* A dropdown where the list is fixed and short — the US has fifty
                states and no shopper should be made to spell one. Countries
                whose divisions we cannot state exactly keep a text box: a list
                missing someone's region cannot be worked around, a box can. */}
            {subdivisions(form.country) ? (
              <SelectField
                label={regionLabel(form.country)}
                value={form.county}
                onChange={(v) => patch("county", v)}
                options={[
                  { value: "", label: `Select ${regionLabel(form.country).toLowerCase()}…` },
                  ...subdivisions(form.country)!.map((r) => ({ value: r.name, label: r.name })),
                ]}
                required
              />
            ) : (
              <Field label={regionLabel(form.country)} value={form.county} onChange={(v) => patch("county", v)} required autoComplete="address-level1" />
            )}
          </Row>

          <Row>
            {/* inputMode follows the country. It was numeric everywhere, which
                on a phone is a number pad — and a number pad cannot type
                "SW1A 1AA". */}
            <Field
              label="Postcode / ZIP"
              value={form.postcode ?? ""}
              onChange={(v) => patch("postcode", v)}
              inputMode={postcodeRule(form.country).numeric ? "numeric" : "text"}
              placeholder={postcodeRule(form.country).example}
              autoComplete="postal-code"
            />
          </Row>

          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.isDefault}
              onChange={(e) => patch("isDefault", e.target.checked)}
              className="accent-brand w-4 h-4"
            />
            <span className="text-[13px] text-ink-muted">Use as my default delivery address</span>
          </label>

          {error && (
            <div role="alert" className="rounded-lg border border-danger/20 bg-danger/5 px-3 py-2 text-[12.5px] text-danger">
              {error}
            </div>
          )}

          <div className="sticky bottom-0 bg-surface pt-4 -mx-5 px-5 pb-1 flex gap-2 border-t border-line/5">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 inline-flex items-center justify-center bg-surface border border-line/15 hover:border-line/30 text-ink font-semibold text-[14px] py-2.5 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 inline-flex items-center justify-center bg-brand hover:bg-brand-dark text-white font-semibold text-[14px] py-2.5 rounded-md transition-colors disabled:opacity-70"
            >
              {saving ? "Saving…" : initial ? "Save changes" : "Save address"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <span className="text-[12.5px] font-medium text-ink-muted block mb-1.5">{children}</span>;
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid sm:grid-cols-2 gap-3">{children}</div>;
}

function Field({
  label,
  value,
  onChange,
  required,
  autoComplete,
  placeholder,
  type = "text",
  inputMode
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  autoComplete?: string;
  placeholder?: string;
  type?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  return (
    <label className="flex flex-col gap-1.5 min-w-0">
      <span className="text-[12.5px] font-medium text-ink-muted">
        {label}{required && <span className="text-danger"> *</span>}
      </span>
      <input
        type={type}
        inputMode={inputMode}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        autoComplete={autoComplete}
        placeholder={placeholder}
        className="soft-input px-3 py-2.5"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  required
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1.5 min-w-0">
      <span className="text-[12.5px] font-medium text-ink-muted">
        {label}{required && <span className="text-danger"> *</span>}
      </span>
      {/* The chevron used to be an inlined data-URI SVG with the grey baked
          into the URL, so it stayed slate-500 in dark mode while the field
          around it inverted. Drawn as an overlay it inherits the theme. */}
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          className="soft-input w-full px-3 py-2.5 appearance-none pr-9"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <ChevronDown
          size={14}
          aria-hidden
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted"
        />
      </div>
    </label>
  );
}

/* ─────────── Privacy pane ─────────── */
/**
 * The two rights the law gives every customer, put where they can find them:
 * a copy of their data, and a way out.
 *
 * Deleting asks them to type the word rather than clicking a second button —
 * an irreversible action shouldn't be reachable by the same muscle memory that
 * saves an address. The grace period is stated up front, because "you have 30
 * days to change your mind" is the part that makes the decision safe to make.
 */
function PrivacyPane({ onSignedOut }: { onSignedOut: () => void }) {
  const user = useAuth((s) => s.user);
  const [downloading, setDownloading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [closed, setClosed] = useState<string | null>(null);

  if (!user) return null;

  if (closed) {
    // leave() signs out and clears the address book and wishlist this device
    // still holds, on the way back to the store.
    return (
      <EmptyState
        icon={<Check size={22} />}
        title="Your account is closed"
        description={closed}
        action={{ label: "Back to the store", href: "/", onClick: leave }}
      />
    );
  }

  async function download() {
    setDownloading(true);
    setError(null);
    try {
      await apiDownloadMyData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't prepare your data.");
    } finally {
      setDownloading(false);
    }
  }

  async function confirmDelete() {
    setBusy(true);
    setError(null);
    try {
      const res = await apiDeleteAccount();
      // The session is already dead server-side (token deleted, cookie
      // cleared). The local user object is kept just long enough to show the
      // confirmation — clearing it here would unmount this pane and swap in
      // the signed-out screen, so the customer would never see what happened.
      setClosed(res.detail);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't close your account.");
    } finally {
      setBusy(false);
    }
  }

  function leave() {
    // Through signOut, not a bare setState: it is what clears the address book
    // and wishlist this device is still holding for the closed account.
    void useAuth.getState().signOut();
    onSignedOut();
  }

  return (
    <div className="grid gap-4">
      <section className="rounded-2xl border border-line/5 bg-surface p-5 sm:p-6">
        <div className="flex items-start gap-3.5">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand">
            <Download size={19} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-[15.5px] font-semibold text-ink">Download your data</h2>
            <p className="mt-1 text-[13px] text-ink-muted">
              A copy of everything we hold — your profile, addresses, orders, reviews, saved items
              and support conversations — as a JSON file.
            </p>
            <button
              type="button"
              onClick={() => void download()}
              disabled={downloading}
              className="mt-3.5 inline-flex items-center gap-2 rounded-md border border-line/15 bg-surface px-4 py-2.5 text-[13.5px] font-semibold text-ink transition-colors hover:border-brand hover:text-brand disabled:opacity-60"
            >
              <Download size={15} />
              {downloading ? "Preparing…" : "Download my data"}
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-danger/15 bg-surface p-5 sm:p-6">
        <div className="flex items-start gap-3.5">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-danger/10 text-danger">
            <AlertTriangle size={19} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-[15.5px] font-semibold text-ink">Delete your account</h2>
            <p className="mt-1 text-[13px] text-ink-muted">
              Your account closes straight away and you'll be signed out everywhere. Your personal
              details are erased 30 days later — contact us before then if you change your mind.
              Past orders are kept as accounting records, with your details removed from them.
            </p>

            {!confirming ? (
              <button
                type="button"
                onClick={() => setConfirming(true)}
                className="mt-3.5 inline-flex items-center gap-2 rounded-md border border-danger/25 px-4 py-2.5 text-[13.5px] font-semibold text-danger transition-colors hover:bg-danger/5"
              >
                <Trash2 size={15} />
                Delete my account
              </button>
            ) : (
              <div className="mt-4 rounded-xl border border-danger/20 bg-danger/5 p-4">
                <label className="block text-[13px] font-medium text-ink">
                  Type <span className="font-bold">DELETE</span> to confirm
                  <input
                    value={typed}
                    onChange={(e) => setTyped(e.target.value)}
                    autoComplete="off"
                    className="mt-2 w-full rounded-md border border-line/15 bg-surface px-3 py-2.5 text-base text-ink outline-none transition-colors focus:border-danger sm:text-[14px]"
                  />
                </label>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void confirmDelete()}
                    disabled={typed.trim().toUpperCase() !== "DELETE" || busy}
                    className="inline-flex items-center gap-2 rounded-md bg-danger px-4 py-2.5 text-[13.5px] font-semibold text-white transition-opacity disabled:opacity-40"
                  >
                    <Trash2 size={15} />
                    {busy ? "Closing…" : "Permanently delete"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setConfirming(false);
                      setTyped("");
                    }}
                    className="rounded-md border border-line/15 px-4 py-2.5 text-[13.5px] font-semibold text-ink transition-colors hover:border-ink-muted"
                  >
                    Keep my account
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {error && (
        <p className="rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-[13px] text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

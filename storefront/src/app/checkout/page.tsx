"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, MapPin } from "lucide-react";
import { useCart } from "@/lib/cart-store";
import { useAuth } from "@/lib/auth-store";
import {
  useAddresses,
  countryOptions,
  postcodeRule,
  regionLabel,
  subdivisions,
  validatePostcode,
  storeCountryCode,
} from "@/lib/address-store";
import { edgeCountry, guessCountry } from "@/lib/guess-country";
import { useShopperLocale, useStoreSettings } from "@/lib/store-context";
import { charged, formatMoney } from "@/lib/format";
import { shopperCurrency } from "@/lib/shopper-currency";
import { placeOrder, type CheckoutResult } from "@/lib/orders-api";
import { usePaymentMethods } from "@/lib/use-payment-methods";
import { awaitingHolds, payPageHref, payTokens } from "@/lib/payment-hold";
import { useRouter } from "next/navigation";
import { shippingCost, shippingTerms } from "@/lib/shipping";
import CouponField, { type AppliedCoupon } from "@/components/CouponField";
import AddressPicker, { type PickedPlace } from "@/components/AddressPicker";

/** A payment method's checkout key — "mobile", "paystack", "paypal"… */
type Payment = string;

export default function CheckoutPage() {
  const items = useCart((s) => s.items);
  const subtotal = useCart((s) => s.subtotal());
  const clear = useCart((s) => s.clear);
  const settings = useStoreSettings();
  const user = useAuth((s) => s.user);
  const addresses = useAddresses((s) => s.addresses);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const router = useRouter();
  const [placing, setPlacing] = useState(false);
  const [placed, setPlaced] = useState<CheckoutResult | null>(null);
  /* Set the moment the order exists and the page is on its way somewhere
     else — the gateway's page, or the order's pay page. The cart is emptied
     into the order at that point, and a browser takes a beat to actually
     leave; without this the page re-rendered as "Your cart is empty" for
     that beat, right after the shopper had paid attention to placing it. */
  const [leaving, setLeaving] = useState<{ to: "gateway" | "pay"; href: string } | null>(null);
  /* An empty cart on checkout is, nearly always, a shopper pressing Back on
     Paystack's page: the cart was emptied into an order that is now waiting
     to be paid. Find that order (this browser's, or this account's) and go to
     its pay page, rather than showing an empty cart with no word about it. */
  const [resuming, setResuming] = useState<"checking" | "none">("checking");
  useEffect(() => {
    if (!mounted || leaving || placed) return;
    if (items.length > 0) {
      setResuming("none");
      return;
    }
    let cancelled = false;
    awaitingHolds()
      .then((holds) => {
        if (cancelled) return;
        const hold = holds[0];
        if (hold) router.replace(payPageHref(hold.number, payTokens.get(hold.number)));
        else setResuming("none");
      })
      .catch(() => !cancelled && setResuming("none"));
    return () => {
      cancelled = true;
    };
  }, [mounted, items.length, leaving, placed, router]);
  // Back from the gateway's page, a browser may restore this page as it was
  // left — mid-spinner. Send that shopper to the order's pay page instead.
  useEffect(() => {
    if (!leaving) return;
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted) router.replace(leaving.href);
    };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, [leaving, router]);
  const [error, setError] = useState<string | null>(null);
  const [coupon, setCoupon] = useState<AppliedCoupon | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);

  // The address form starts on the store's own country rather than on the
  // template's United States, and that is also what gets sent — the checkout
  // used to send nothing, so the API filled in "US" and taxed accordingly.
  // It no longer *stays* there; see the preselect effect below.
  const homeCountry = storeCountryCode(settings.country);
  const [country, setCountry] = useState(homeCountry);
  // An explicit choice is final. Every preselect below defers to this.
  const countryEdited = useRef(false);

  /* What the picker has found so far. The text fields below are controlled
     from it so that choosing a suggestion fills them in — but a shopper may
     then edit any of them, and the edit wins. The coordinates deliberately
     survive that edit: rewording "Ruaka Rd" to "the green gate past Ruaka Rd"
     makes the address more useful to a rider, not less true about where it is. */
  const [place, setPlace] = useState<Partial<PickedPlace>>({});
  const onPick = useCallback((picked: Partial<PickedPlace>) => {
    setPlace((current) => ({ ...current, ...picked }));
    // A search result knows its country; the select should not keep claiming
    // otherwise. Only for a country the store actually ships to.
    if (picked.country_code && countryOptions(settings.country).some((c) => c.code === picked.country_code)) {
      // Choosing a place is choosing its country; a later preselect must not
      // move it back underneath them.
      countryEdited.current = true;
      setCountry(picked.country_code);
    }
  }, [settings.country]);
  const field = (name: keyof PickedPlace) => ({
    value: String(place[name] ?? ""),
    onChange: (v: string) => setPlace((current) => ({ ...current, [name]: v })),
  });

  // Saved addresses only exist server-side for signed-in customers.
  const savedAddresses = user ? addresses.filter((a) => /^\d+$/.test(a.id)) : [];
  const [selectedAddressId, setSelectedAddressId] = useState<string | "new">("new");
  useEffect(() => {
    if (savedAddresses.length > 0 && selectedAddressId === "new") {
      const preferred = savedAddresses.find((a) => a.isDefault) ?? savedAddresses[0];
      setSelectedAddressId(preferred.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedAddresses.length]);
  const usingSaved = selectedAddressId !== "new";
  const selectedAddress = savedAddresses.find((a) => a.id === selectedAddressId) ?? null;

  /* What this order is charged in: where it is going (the shopper's own
     choice of location) beats where the browser is (the edge's IP guess), and
     a Kenyan delivery may be paid in shillings or dollars as the header switch
     says. The server applies the same rule to the same inputs, so the totals
     below are the amounts that will actually be taken. */
  const locale = useShopperLocale();
  const deliveryCountry = (usingSaved ? selectedAddress?.country : country) || country;
  const chargeCurrency = shopperCurrency(settings, deliveryCountry, locale.choice);
  const chargeMoney = (amount: number) =>
    formatMoney(amount * chargeCurrency.rate, { symbol: chargeCurrency.symbol, locale: settings.locale });

  // What the store has switched on, and nothing else: every order is paid for
  // up front, so there is no cash-on-delivery fallback to invent.
  const methods = usePaymentMethods(deliveryCountry, chargeCurrency.code);
  const [payment, setPayment] = useState<Payment>("");
  useEffect(() => {
    if (methods.length > 0 && !methods.some((m) => m.method === payment)) setPayment(methods[0].method);
  }, [methods, payment]);

  /* Contact details, prefilled from the profile and then from the chosen
     address.

     Phone is required here but optional on a profile, and a customer who has
     only ever given us a number by saving it on an address was asked for it
     again at every checkout — the field was filled from `user.phone` alone,
     which for most people is empty. The address is the other place a phone
     number is known to live, so it is the fallback.

     Profile first, address second: someone whose profile carries a number
     keeps seeing that one, whichever address they are shipping to. And an
     address that arrives late from the server still fills the field, which a
     `defaultValue` could not do — it is read once, before the fetch lands. */
  const [contact, setContact] = useState({ name: "", phone: "" });
  // What the shopper has typed is never overwritten by a later prefill.
  const editedContact = useRef({ name: false, phone: false });
  useEffect(() => {
    setContact((current) => ({
      name: editedContact.current.name ? current.name : user?.name || selectedAddress?.fullName || "",
      phone: editedContact.current.phone ? current.phone : user?.phone || selectedAddress?.phone || "",
    }));
  }, [user?.name, user?.phone, selectedAddress?.fullName, selectedAddress?.phone]);

  /* Which country the delivery form should open on.
   *
   * It used to open on the store's country for everyone, so every shopper
   * outside Kenya had to notice a dropdown and correct it — on the largest
   * share of revenue that converts worst. In order of how much each signal
   * actually knows:
   *
   *   1. an address they have already saved, which is a stated fact about
   *      where they want things delivered;
   *   2. what the CDN said about where the request came from;
   *   3. their timezone, which is the same guess without a CDN to make it;
   *   4. the store's country, which is where most orders go.
   *
   * Their default saved address rather than the one selected: this only
   * matters while entering a *new* address, and the default is the better
   * statement of where this person usually ships.
   */
  const defaultAddressCountry =
    (savedAddresses.find((a) => a.isDefault) ?? savedAddresses[0])?.country || "";
  useEffect(() => {
    if (countryEdited.current) return;
    const supported = countryOptions(settings.country).map((c) => c.code);
    setCountry(
      (defaultAddressCountry && supported.includes(defaultAddressCountry) ? defaultAddressCountry : "") ||
        edgeCountry(supported) ||
        guessCountry(supported) ||
        homeCountry,
    );
  }, [defaultAddressCountry, homeCountry, settings.country]);

  const chooseCountry = (next: string) => {
    countryEdited.current = true;
    setCountry(next);
    // A region and a postcode only mean something inside their own country.
    // Carrying "Texas" across to Kenya makes an address describe two places.
    setPlace((current) => ({ ...current, county_or_state: "", postal_code: "" }));
  };

  const contactField = (name: "name" | "phone") => ({
    value: contact[name],
    onChange: (value: string) => {
      editedContact.current[name] = true;
      setContact((current) => ({ ...current, [name]: value }));
    },
  });

  const terms = shippingTerms(settings);
  const threshold = terms.threshold;
  const discount = coupon ? Number(coupon.discount_amount) : 0;
  const shipping = shippingCost(subtotal, terms, { free: coupon?.free_shipping });
  const total = Math.max(subtotal - discount, 0) + shipping;
  const selectedMethod = methods.find((m) => m.method === payment);

  if (!mounted) return <div className="container-store py-12 text-ink-muted">Loading…</div>;

  if (leaving) {
    return (
      <div className="container-store py-24 text-center" aria-live="polite">
        <span className="mx-auto mb-4 block h-9 w-9 rounded-full border-[3px] border-brand border-t-transparent animate-spin" />
        <h1 className="text-[22px] font-semibold text-ink mb-1">
          {leaving.to === "gateway" ? "Taking you to secure checkout…" : "Order placed — one more step"}
        </h1>
        <p className="text-ink-muted text-sm">
          {leaving.to === "gateway"
            ? "Your items are held for 10 minutes while you pay."
            : "Opening your payment page…"}
        </p>
      </div>
    );
  }

  if (placed) {
    return (
      <div className="container-store py-16 text-center">
        <div className="max-w-md mx-auto">
          <div className="w-16 h-16 rounded-full bg-brand-50 text-brand flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} />
          </div>
          <h1 className="text-[26px] font-semibold text-ink mb-2">Order placed</h1>
          <p className="text-ink-muted">
            Thanks for shopping with {settings.business_name}. Your order number is
          </p>
          <div className="my-3 inline-block rounded-lg bg-surface-alt px-4 py-2 font-mono text-[18px] font-bold tracking-wide text-ink">
            {placed.number}
          </div>
          {Number(placed.tax_total) > 0 && (
            <p className="text-[13px] text-ink-muted mb-1">
              {charged(Number(placed.grand_total), placed.currency)} paid, including {placed.tax_label}{" "}
              {charged(Number(placed.tax_total), placed.currency)}
            </p>
          )}
          <p className="text-[13px] text-ink-muted mb-6">
            {placed.payment.status === "confirmed" ? "Payment confirmed — we're preparing your order." : ""}{" "}
            A confirmation will be sent to your email.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-2.5">
            <Link href={`/track?ref=${encodeURIComponent(placed.number)}`} className="btn-primary">Track this order</Link>
            {user ? (
              <Link href="/account?tab=orders" className="inline-flex items-center justify-center rounded-md border border-line/15 px-5 py-2.5 text-[14px] font-semibold text-ink transition-colors hover:border-brand hover:text-brand">
                View my orders
              </Link>
            ) : (
              // Guest orders attach themselves to the account once its email is
              // confirmed, so this is the one moment where creating one pays off.
              <Link href="/signup" className="inline-flex items-center justify-center rounded-md border border-line/15 px-5 py-2.5 text-[14px] font-semibold text-ink transition-colors hover:border-brand hover:text-brand">
                Create an account
              </Link>
            )}
          </div>
          {!user && (
            <p className="mt-3 text-[12px] text-ink-muted">
              Sign up with this email and this order joins your account automatically.
            </p>
          )}
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    // Usually Back from the gateway's page: the cart became an order that is
    // still waiting to be paid, so that order is where they belong.
    if (resuming !== "none") {
      return <div className="container-store py-12 text-ink-muted">Loading…</div>;
    }
    return (
      <div className="container-store py-16 text-center">
        <h1 className="text-[22px] font-semibold mb-2">Your cart is empty</h1>
        <Link href="/shop" className="btn-primary mt-4">Browse products</Link>
      </div>
    );
  }

  function failed(message: string) {
    setError(message);
    setPlacing(false);
    requestAnimationFrame(() => errorRef.current?.scrollIntoView({ block: "center" }));
  }

  async function onPlace(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (placing) return;
    if (!acceptedTerms) {
      failed("Please accept the terms and privacy notice before placing your order.");
      return;
    }
    const form = new FormData(e.currentTarget);

    if (!usingSaved) {
      const badPostcode = validatePostcode(country, String(form.get("postal") ?? ""));
      if (badPostcode) return failed(badPostcode);
    }

    const name = String(form.get("name") ?? "");
    const phone = String(form.get("phone") ?? "");
    const email = String(form.get("email") ?? "");

    setPlacing(true);
    try {
      const result = await placeOrder({
        items: items.map((i) => ({
          product_id: i.productId || Number(i.id),
          quantity: i.qty,
          ...(i.variantId ? { variant_id: i.variantId } : {}),
        })),
        contact: { name, email, phone },
        ...(usingSaved
          ? { address_id: Number(selectedAddressId) }
          : {
              shipping_address: {
                full_name: name,
                phone,
                line1: String(form.get("address") ?? ""),
                city: String(form.get("city") ?? ""),
                county_or_state: String(form.get("county") ?? ""),
                postal_code: String(form.get("postal") ?? ""),
                country_code: country,
                // Only ever sent as a pair with the source that explains it.
                // Half a point is not a location, and a source without a point
                // claims a precision the address does not carry.
                ...(place.latitude != null && place.longitude != null
                  ? {
                      latitude: place.latitude,
                      longitude: place.longitude,
                      geocode_source: place.geocode_source || "pin",
                    }
                  : {}),
              },
            }),
        payment_method: payment,
        coupon_code: coupon?.code,
        notes: String(form.get("notes") ?? ""),
        currency: chargeCurrency.code,
      });
      if (result.hold?.state === "awaiting_payment") {
        // Kept so this browser can find its way back — from the banner, or
        // after the shopper closes the tab mid-payment.
        if (result.pay_token) payTokens.remember(result.number, result.pay_token);

        // A gateway that hosts its own page hands back somewhere to go; the
        // order is not paid until the shopper has been there. M-Pesa rings
        // the phone, and a gateway that refused to start leaves an attempt to
        // retry — both of those wait on the pay page, under the countdown.
        const next = result.payment?.redirect_url;
        const toGateway = Boolean(next && result.payment?.status !== "failed");
        const payHref = payPageHref(result.number, result.pay_token);
        setLeaving({ to: toGateway ? "gateway" : "pay", href: payHref });
        // The cart is now the order. If it goes unpaid and is released, the
        // pay page offers to put these lines back.
        clear();
        if (toGateway) window.location.href = next!;
        else router.push(payHref);
        return;
      }

      clear();

      setPlaced(result);
      window.scrollTo({ top: 0 });
    } catch (err) {
      failed(err instanceof Error ? err.message : "Could not place the order. Please try again.");
    }
  }

  return (
    <div className="container-store py-8">
      <h1 className="text-[28px] font-semibold text-ink mb-6">Checkout</h1>

      <form onSubmit={onPlace} className="grid lg:grid-cols-[1fr_380px] gap-8 items-start">
        <div className="flex flex-col gap-6">
          <fieldset className="bg-surface rounded-2xl p-5 shadow-card dark:border dark:border-line/10">
            <legend className="sr-only">1 · Contact</legend>
            <p aria-hidden className="mb-4 font-display text-[17px] font-extrabold text-ink">1 · Contact</p>
            <div className="grid sm:grid-cols-2 gap-3 mt-2">
              <Input label="Full name" name="name" required autoComplete="name" {...contactField("name")} />
              <Input
                label="Phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                placeholder="Your phone number"
                required
                {...contactField("phone")}
              />
              <div className="sm:col-span-2">
                <Input label="Email" name="email" type="email" autoComplete="email" inputMode="email" placeholder="you@example.com" required defaultValue={user?.email} />
              </div>
            </div>
          </fieldset>

          <fieldset className="bg-surface rounded-2xl p-5 shadow-card dark:border dark:border-line/10">
            <legend className="sr-only">2 · Delivery</legend>
            <p aria-hidden className="mb-4 font-display text-[17px] font-extrabold text-ink">2 · Delivery</p>
            {savedAddresses.length > 0 && (
              <div className="grid gap-2 mt-2 mb-3">
                {savedAddresses.map((a) => (
                  <label
                    key={a.id}
                    className={`flex items-start gap-3 border rounded-md p-3 cursor-pointer transition ${
                      selectedAddressId === a.id ? "border-brand bg-brand-50/40" : "border-line/10 hover:border-brand"
                    }`}
                  >
                    <input
                      type="radio"
                      name="saved-address"
                      checked={selectedAddressId === a.id}
                      onChange={() => setSelectedAddressId(a.id)}
                      className="accent-brand mt-1"
                    />
                    <span className="flex-1 text-[13px]">
                      <span className="flex items-center gap-1.5 font-semibold text-ink">
                        <MapPin size={13} className="text-brand" /> {a.label}
                        {a.isDefault && <span className="text-[10px] uppercase tracking-wider text-brand">Default</span>}
                      </span>
                      <span className="text-ink-muted">
                        {a.fullName} · {a.street}, {a.city}
                      </span>
                    </span>
                  </label>
                ))}
                <label
                  className={`flex items-center gap-3 border rounded-md p-3 cursor-pointer transition ${
                    !usingSaved ? "border-brand bg-brand-50/40" : "border-line/10 hover:border-brand"
                  }`}
                >
                  <input
                    type="radio"
                    name="saved-address"
                    checked={!usingSaved}
                    onChange={() => setSelectedAddressId("new")}
                    className="accent-brand"
                  />
                  <span className="text-[13px] font-medium text-ink">Deliver to a new address</span>
                </label>
              </div>
            )}
            {!usingSaved && (
              <div className="grid sm:grid-cols-2 gap-3 mt-2">
                {/* Country first: it decides which country the search below
                    filters to, so asking for it afterwards means the first
                    search a shopper runs is the wrong one. The rest runs most
                    specific to least, matching the address book. */}
                <label className="flex flex-col gap-1 text-sm sm:col-span-2">
                  <span className="text-ink-muted">Country<span className="text-danger"> *</span></span>
                  <select
                    name="country"
                    value={country}
                    onChange={(e) => chooseCountry(e.target.value)}
                    autoComplete="country"
                    className="soft-input px-3 py-2.5 text-sm"
                  >
                    {countryOptions(settings.country).map((c) => (
                      <option key={c.code} value={c.code}>{c.name}</option>
                    ))}
                  </select>
                </label>
                <div className="sm:col-span-2">
                  {/* Above the fields, not instead of them. Search and pin are
                      the fast path; the fields are the one that always works. */}
                  <AddressPicker
                    value={{ latitude: place.latitude, longitude: place.longitude }}
                    onPick={onPick}
                    country={country}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Input label="Address" name="address" required autoComplete="address-line1" placeholder="Estate, road, house or plot number" {...field("line1")} />
                </div>
                <Input label="City" name="city" required autoComplete="address-level2" {...field("city")} />
                {subdivisions(country) ? (
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="text-ink-muted">{regionLabel(country)}</span>
                    <select
                      name="county"
                      autoComplete="address-level1"
                      className="soft-input px-3 py-2.5 text-sm"
                      value={field("county_or_state").value}
                      onChange={(e) => field("county_or_state").onChange(e.target.value)}
                    >
                      <option value="">Select {regionLabel(country).toLowerCase()}…</option>
                      {subdivisions(country)!.map((r) => (
                        <option key={r.code} value={r.name}>{r.name}</option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <Input label={regionLabel(country)} name="county" autoComplete="address-level1" {...field("county_or_state")} />
                )}
                <Input
                  label="Postal code"
                  name="postal"
                  autoComplete="postal-code"
                  inputMode={postcodeRule(country).numeric ? "numeric" : "text"}
                  placeholder={postcodeRule(country).example}
                  {...field("postal_code")}
                />
                {user && (
                  // Stated rather than offered as a checkbox: the checkout API
                  // always files a signed-in shopper's new address, so a box
                  // that could be unticked would be a promise we can't keep.
                  <p className="sm:col-span-2 text-[12px] text-ink-muted">
                    This address will be saved to your account for next time.
                  </p>
                )}
              </div>
            )}
            <div className="mt-3">
              <Input label="Delivery notes" name="notes" placeholder="Gate code, landmark, preferred time…" />
            </div>
          </fieldset>

          <fieldset className="bg-surface rounded-2xl p-5 shadow-card dark:border dark:border-line/10">
            <legend className="sr-only">3 · Payment</legend>
            <p aria-hidden className="mb-4 font-display text-[17px] font-extrabold text-ink">3 · Payment</p>
            <p className="text-[12.5px] text-ink-muted mt-2">
              {methods.length > 0
                ? "Your items are held for 10 minutes while you pay."
                : "This store isn't taking payments right now. Please try again later."}
            </p>
            <div className="grid gap-2 mt-3">
              {methods.map((m) => (
                <PaymentOption
                  key={m.id}
                  value={m.method}
                  checked={payment === m.method}
                  onChange={setPayment}
                  title={m.name}
                  sub={m.body_text}
                  logo={m.logo_url}
                />
              ))}
            </div>
          </fieldset>
        </div>

        <aside className="bg-surface-alt rounded-2xl p-5 lg:sticky lg:top-32">
          <h2 className="font-display text-[18px] font-extrabold text-ink mb-4">Your order</h2>
          <ul className="flex flex-col gap-2.5 text-sm">
            {items.map((i) => (
              <li key={i.id} className="flex justify-between gap-3">
                <span className="text-ink-muted line-clamp-1">
                  {i.title}{i.variantLabel ? ` (${i.variantLabel})` : ""} × {i.qty}
                </span>
                <span className="font-medium whitespace-nowrap">{chargeMoney(i.price * i.qty)}</span>
              </li>
            ))}
          </ul>
          <div className="border-t border-line/10 my-4" />
          <CouponField subtotal={subtotal} applied={coupon} onApply={setCoupon} onRemove={() => setCoupon(null)} />
          <div className="border-t border-line/10 my-4" />
          <dl className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between"><dt className="text-ink-muted">Subtotal</dt><dd>{chargeMoney(subtotal)}</dd></div>
            {discount > 0 && (
              <div className="flex justify-between text-brand-dark"><dt>Discount</dt><dd>−{chargeMoney(discount)}</dd></div>
            )}
            <div className="flex justify-between"><dt className="text-ink-muted">Shipping</dt><dd>{shipping === 0 ? "Free" : chargeMoney(shipping)}</dd></div>
            <div className="flex justify-between text-base mt-1">
              <dt className="font-display font-extrabold">Total</dt><dd className="font-display text-[20px] font-extrabold text-ink tabular-nums">{chargeMoney(total)}</dd>
            </div>
          </dl>
          <label className="mt-4 flex items-start gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="accent-brand w-4 h-4 mt-0.5"
            />
            <span className="text-[12px] leading-relaxed text-ink-muted">
              I agree to the{" "}
              <Link href="/legal/terms" className="text-brand hover:underline">Conditions of Use</Link> and{" "}
              <Link href="/legal/privacy" className="text-brand hover:underline">Privacy Notice</Link>.
            </span>
          </label>
          {error && (
            <div
              ref={errorRef}
              role="alert"
              className="mt-4 rounded-lg border border-danger/20 bg-danger/5 px-3 py-2 text-[12.5px] text-danger"
            >
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={placing || !acceptedTerms || !payment}
            className="btn-primary w-full mt-5 !py-3 disabled:opacity-70"
          >
            {placing ? "Placing order…" : `Place order · ${chargeMoney(total)}`}
          </button>
          <p className="text-[11px] text-ink-muted mt-3 text-center">
            {selectedMethod?.body_text || "Your order is confirmed as soon as it's placed"}
          </p>
        </aside>
      </form>
    </div>
  );
}

/** Uncontrolled by default; controlled when `value` and `onChange` are given,
 *  which is what lets the address picker fill these in. Passing `defaultValue`
 *  alongside `value` is React's "changing an uncontrolled input to be
 *  controlled" warning waiting to happen, so only one is ever handed down. */
function Input({
  label, name, type = "text", required, placeholder, defaultValue, autoComplete, inputMode,
  value, onChange,
}: {
  label: string; name: string; type?: string; required?: boolean; placeholder?: string;
  defaultValue?: string; autoComplete?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  value?: string; onChange?: (value: string) => void;
}) {
  const controlled = value !== undefined && onChange !== undefined;
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-ink-muted">{label}{required && <span className="text-danger"> *</span>}</span>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        {...(controlled
          ? { value, onChange: (e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value) }
          : { defaultValue })}
        autoComplete={autoComplete}
        inputMode={inputMode}
        className="soft-input px-3 py-2.5 text-sm"
      />
    </label>
  );
}

function PaymentOption({
  value, checked, onChange, title, sub, logo
}: {
  value: Payment; checked: boolean; onChange: (v: Payment) => void; title: string; sub: string; logo?: string;
}) {
  return (
    <label className={`flex items-center gap-3 border rounded-md p-3 cursor-pointer transition ${
      checked ? "border-brand bg-brand-50/40" : "border-line/10 hover:border-brand"
    }`}>
      <input type="radio" name="payment" value={value} checked={checked} onChange={() => onChange(value)} className="accent-brand" />
      {logo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logo} alt="" className="h-8 w-8 object-contain rounded bg-surface-alt p-1" />
      )}
      <div className="flex-1">
        <div className="font-medium text-ink">{title}</div>
        {sub && <div className="text-xs text-ink-muted">{sub}</div>}
      </div>
    </label>
  );
}

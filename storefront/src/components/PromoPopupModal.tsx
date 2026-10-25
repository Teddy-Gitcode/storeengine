"use client";
import { useEffect, useId, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import type { StorefrontPromoPopup } from "@/lib/content-api";

// Full-screen or purchase-focused routes a promo shouldn't interrupt.
const SKIP_ROUTES = ["/checkout", "/signin", "/signup", "/forgot-password", "/reset-password"];

/* Quiet, and inside the panel. The old one floated outside the top-right
   corner, where it overhangs the viewport on a narrow phone. */
const CLOSE_BUTTON_INLINE =
  "absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-ink-muted " +
  "transition-colors hover:bg-ink/5 hover:text-ink focus-visible:outline focus-visible:outline-2 " +
  "focus-visible:outline-offset-2 focus-visible:outline-brand";

/* Kept for the bare-image promos, which have no panel to sit inside. */
const CLOSE_BUTTON_FLOATING =
  "absolute -top-3 -right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-surface " +
  "text-ink shadow-lg transition-transform hover:scale-105 focus-visible:outline focus-visible:outline-2 " +
  "focus-visible:outline-offset-2 focus-visible:outline-brand";

const FOCUSABLE =
  'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

function isSkipRoute(pathname: string | null): boolean {
  if (!pathname) return false;
  return SKIP_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`));
}

function storageKey(popup: StorefrontPromoPopup) {
  // Keyed on updated_at so editing the popup's content resets any dismissal.
  return `promo-popup:${popup.id}:${popup.updated_at}`;
}

function isDismissed(popup: StorefrontPromoPopup): boolean {
  if (popup.frequency === "every_visit") return false;
  try {
    const store = popup.frequency === "once_ever" ? localStorage : sessionStorage;
    return store.getItem(storageKey(popup)) === "1";
  } catch {
    return false;
  }
}

function markDismissed(popup: StorefrontPromoPopup) {
  if (popup.frequency === "every_visit") return;
  try {
    const store = popup.frequency === "once_ever" ? localStorage : sessionStorage;
    store.setItem(storageKey(popup), "1");
  } catch {
    // Private browsing or storage disabled — the popup just reshows next time.
  }
}

/** One dismissible modal for the first eligible admin-configured promo,
 * mounted once in the root layout. Falls back to nothing when unconfigured. */
export default function PromoPopupModal({ popups }: { popups: StorefrontPromoPopup[] }) {
  const pathname = usePathname();
  const [active, setActive] = useState<StorefrontPromoPopup | null>(null);
  const shownRef = useRef(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const returnFocusTo = useRef<HTMLElement | null>(null);
  const headingId = useId();

  useEffect(() => {
    if (shownRef.current || popups.length === 0 || isSkipRoute(pathname)) return;
    const next = popups.find((p) => !isDismissed(p));
    if (next) {
      shownRef.current = true;
      setActive(next);
    }
  }, [pathname, popups]);

  function close() {
    if (active) markDismissed(active);
    setActive(null);
  }

  // Escape closes it, like every other modal. Clicking the backdrop was the
  // only way out, which leaves keyboard visitors holding a full-screen overlay.
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        markDismissed(active);
        setActive(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active]);

  /* Focus moves into the promo when it opens and back to where it was when it
     closes. Without this a keyboard visitor's focus stays behind the overlay,
     tabbing through a page they cannot see. */
  useEffect(() => {
    if (!active) return;
    returnFocusTo.current = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    return () => returnFocusTo.current?.focus?.();
  }, [active]);

  /* Tab cycles within the promo rather than escaping behind it — the other
     half of the same problem. */
  function trapTab(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Tab" || !panelRef.current) return;
    const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    const current = document.activeElement;
    if (event.shiftKey && (current === first || current === panelRef.current)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && current === last) {
      event.preventDefault();
      first.focus();
    }
  }

  if (!active) return null;

  const headline = active.headline?.trim();
  const body = active.body?.trim();
  const ctaLabel = active.cta_label?.trim() || "Shop now";
  const hasImage = Boolean(active.image_url);

  /* No headline means a promo made before this popup could hold words — and
     every one of them is a bare picture. Those keep rendering exactly as they
     did, rather than being wrapped in a panel with nothing to say. */
  const bare = !headline && !body;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
      onClick={close}
      role="dialog"
      aria-modal="true"
      aria-labelledby={headline ? headingId : undefined}
      aria-label={headline ? undefined : active.title || "Promotion"}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={trapTab}
        className={`promo-pop relative w-full outline-none ${bare ? "max-w-md" : "max-w-2xl"}`}
      >
        {bare ? (
          <>
            <button onClick={close} aria-label="Close" className={CLOSE_BUTTON_FLOATING}>
              <X size={16} />
            </button>
            {active.link_url ? (
              <a href={active.link_url} onClick={close}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={active.image_url} alt={active.title} className="w-full rounded-xl shadow-2xl" />
              </a>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={active.image_url} alt={active.title} className="w-full rounded-xl shadow-2xl" />
            )}
          </>
        ) : (
          /* Image beside the words rather than stacked above them: it keeps
             the panel short enough to read in one glance on a laptop, and the
             photograph keeps real presence instead of becoming a header. */
          <div className="overflow-hidden rounded-2xl bg-surface shadow-2xl sm:grid sm:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
            {hasImage && (
              <div className="relative aspect-[16/9] sm:aspect-auto sm:h-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={active.image_url}
                  alt={active.title}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              </div>
            )}

            <div className="relative flex flex-col gap-4 p-6 sm:p-8">
              <button onClick={close} aria-label="Close" className={CLOSE_BUTTON_INLINE}>
                <X size={16} />
              </button>

              <div className="flex flex-col gap-2 pr-8">
                <h2
                  id={headingId}
                  className="font-display text-[26px] leading-[1.15] tracking-[-0.01em] text-ink sm:text-[30px]"
                >
                  {headline}
                </h2>
                {body && <p className="max-w-[46ch] text-[14px] leading-relaxed text-ink-muted">{body}</p>}
              </div>

              <div className="mt-1 flex flex-wrap items-center gap-x-5 gap-y-2">
                {active.link_url ? (
                  <a href={active.link_url} onClick={close} className="btn-primary px-5 py-2.5 text-sm">
                    {ctaLabel}
                  </a>
                ) : (
                  <button onClick={close} className="btn-primary px-5 py-2.5 text-sm">
                    {ctaLabel}
                  </button>
                )}
                {/* A stated way out. An X in the corner is the only exit on
                    most promos, which is what makes them feel like a trap. */}
                <button
                  onClick={close}
                  className="text-sm text-ink-muted underline-offset-4 hover:text-ink hover:underline"
                >
                  No thanks
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

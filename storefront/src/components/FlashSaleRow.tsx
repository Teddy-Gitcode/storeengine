"use client";
import Link from "next/link";
import StoreImage from "@/components/ui/StoreImage";
import { useEffect, useState } from "react";
import type { Product } from "@/lib/types";
import { money } from "@/lib/format";
import { FLASH_LOOK, type DealLook } from "@/lib/content-api";
import { ArrowRight } from "lucide-react";

function pad(n: number) {
  return n < 10 ? "0" + n : "" + n;
}

function secondsUntil(endsAt: string) {
  return Math.max(0, Math.floor((Date.parse(endsAt) - Date.now()) / 1000));
}

/** `#RGB`/`#RRGGBB` → `rgba(...)`, for the translucent glows over the panel. */
function withAlpha(hex: string, alpha: number) {
  const raw = hex.replace("#", "");
  const full = raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw.slice(0, 6);
  const n = parseInt(full, 16);
  if (Number.isNaN(n)) return hex;
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/** A darker sibling of a colour, for the panel's inner shadowing. */
function darken(hex: string, percent: number) {
  return `color-mix(in srgb, ${hex} ${100 - percent}%, #000)`;
}

export default function FlashSaleRow({
  products,
  endsAt,
  look = FLASH_LOOK,
}: {
  products: Product[];
  endsAt?: string | null;
  /** Copy and palette from the admin's deal; defaults to the built-in look. */
  look?: DealLook;
}) {
  // Initialized in an effect (not during render) so server and client HTML match.
  const [seconds, setSeconds] = useState<number | null>(null);
  useEffect(() => {
    if (!endsAt) return;
    setSeconds(secondsUntil(endsAt));
    const t = setInterval(() => setSeconds(secondsUntil(endsAt)), 1000);
    return () => clearInterval(t);
  }, [endsAt]);

  const showTimer = seconds !== null && seconds > 0;
  const h = Math.floor((seconds ?? 0) / 3600);
  const m = Math.floor(((seconds ?? 0) % 3600) / 60);
  const s = (seconds ?? 0) % 60;

  if (!products.length) return null;
  const [spotlight, ...rest] = products;
  const spotlightDiscount = spotlight.priceOld
    ? Math.round((1 - spotlight.price / spotlight.priceOld) * 100)
    : 0;

  // The badge reads as two lines — the last word drops underneath, so
  // "Flash Deal" keeps the original seal and "Mega Weekend Sale" still fits.
  const badgeWords = look.badge.trim().split(/\s+/);
  const badgeTail = badgeWords.length > 1 ? badgeWords.pop()! : "";
  const badgeHead = badgeWords.join(" ");

  return (
    <section
      className="mt-8 relative rounded-2xl overflow-hidden isolate"
      style={{
        backgroundImage: [
          `radial-gradient(ellipse 70% 55% at 108% 110%, ${withAlpha(look.accent, 0.18)}, transparent 60%)`,
          `radial-gradient(ellipse 40% 40% at -10% -10%, ${withAlpha(look.accent, 0.1)}, transparent 60%)`,
          `linear-gradient(140deg, ${look.from} 0%, ${look.to} 48%, ${darken(look.to, 25)} 100%)`,
        ].join(", "),
      }}
    >
      {/* Header */}
      <div
        className="relative flex items-center justify-between gap-4 px-5 sm:px-6 pt-5 pb-4"
        style={{ color: look.text }}
      >
        <div className="flex items-center gap-4 min-w-0">
          {/* Tilted seal */}
          <div
            aria-hidden="true"
            className="hidden sm:flex shrink-0 w-[68px] h-[68px] -rotate-[8deg] rounded-full
                       border border-dashed bg-black/20
                       flex-col items-center justify-center text-[9px] font-bold tracking-[1.2px]
                       uppercase text-center leading-tight px-1
                       shadow-[inset_0_0_0_4px_rgba(0,0,0,0.15)]"
            style={{ borderColor: withAlpha(look.accent, 0.65), color: look.accent }}
          >
            {badgeHead}
            {badgeTail && (
              <strong className="block mt-0.5 text-[14px] tracking-wide" style={{ color: look.text }}>
                {badgeTail}
              </strong>
            )}
          </div>

          <div className="min-w-0">
            <h2 className="text-[18px] sm:text-[22px] font-bold leading-tight">{look.headline}</h2>
            {look.subheadline && (
              <p className="text-[11px] sm:text-[12px] mt-0.5 opacity-70">{look.subheadline}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {/* Segmented countdown — only shown when a live promotion has a real end time */}
          {showTimer && (
            <div
              role="timer"
              aria-label="Offer ends in"
              className="flex gap-1.5 items-end"
            >
              <CountdownBlock value={pad(h)} label="HRS" look={look} />
              <Separator look={look} />
              <CountdownBlock value={pad(m)} label="MIN" look={look} />
              <Separator look={look} />
              <CountdownBlock value={pad(s)} label="SEC" look={look} />
            </div>
          )}

          <Link
            href={look.ctaHref}
            className="hidden md:inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.6px]
                       transition-opacity hover:opacity-75 whitespace-nowrap"
            style={{ color: look.accent }}
          >
            {look.ctaLabel} <ArrowRight size={12} aria-hidden />
          </Link>
        </div>
      </div>

      {/* Spotlight + scroller */}
      <div className="relative grid md:grid-cols-[minmax(0,340px)_1fr] gap-px bg-black/10">
        {/* Spotlight card */}
        <Link
          href={`/product/${spotlight.slug}`}
          className="group relative flex p-5 transition-opacity hover:opacity-95"
          style={{
            backgroundImage: `linear-gradient(to bottom right, ${darken(look.to, 25)}, ${darken(look.from, 30)})`,
          }}
        >
          <div className="flex flex-col justify-between gap-3 flex-1 min-w-0 pr-3">
            <div>
              <span
                className="inline-block text-accent-dark text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-sm mb-2"
                style={{ background: look.accent }}
              >
                SPOTLIGHT
              </span>
              <h3
                className="text-[16px] font-bold leading-tight line-clamp-2"
                style={{ color: look.text }}
              >
                {spotlight.title}
              </h3>
            </div>
            <div>
              <div className="flex items-baseline gap-2 flex-wrap mb-2">
                <span className="text-[22px] font-bold tabular-nums" style={{ color: look.accent }}>
                  {money(spotlight.price)}
                </span>
                {spotlight.priceOld && (
                  <span
                    className="text-[12px] line-through opacity-50"
                    style={{ color: look.text }}
                  >
                    {money(spotlight.priceOld)}
                  </span>
                )}
                {spotlightDiscount > 0 && (
                  <span className="bg-danger text-white text-[10px] font-bold px-1.5 py-0.5 rounded-sm shadow-[0_2px_6px_rgba(226,75,74,0.4)]">
                    -{spotlightDiscount}%
                  </span>
                )}
              </div>
              <span
                className="inline-flex items-center gap-1.5
                           text-accent-dark font-bold text-[11px] uppercase tracking-[0.6px] px-4 py-2 rounded-full
                           group-hover:-translate-y-0.5 transition-transform"
                style={{
                  backgroundImage: `linear-gradient(to bottom right, ${look.accent}, ${darken(look.accent, 25)})`,
                  boxShadow: `0 6px 18px ${withAlpha(look.accent, 0.35)}, inset 0 -2px 0 rgba(0,0,0,0.12)`,
                }}
              >
                Claim deal <ArrowRight size={13} aria-hidden />
              </span>
            </div>
          </div>
          <div className="relative w-28 sm:w-32 shrink-0 self-center aspect-square">
            <StoreImage
              src={spotlight.image}
              alt={spotlight.title}
              fill
              sizes="140px"
              className="object-contain drop-shadow-[0_10px_25px_rgba(0,0,0,0.35)] transition-transform group-hover:scale-105"
            />
          </div>
        </Link>

        {/* Scroller */}
        <ul className="flex overflow-x-auto no-scrollbar bg-surface">
          {rest.map((p) => {
            const discount = p.priceOld ? Math.round((1 - p.price / p.priceOld) * 100) : 0;
            return (
              <li
                key={p.id}
                className="shrink-0 w-[150px] sm:w-[170px] border-r border-line/5 last:border-r-0"
              >
                <Link
                  href={`/product/${p.slug}`}
                  className="group block p-3 hover:bg-surface-alt transition-colors"
                >
                  <div className="relative aspect-square bg-surface-alt rounded-md overflow-hidden mb-2">
                    <StoreImage
                      src={p.image}
                      alt={p.title}
                      fill
                      sizes="170px"
                      className="object-contain p-2 transition-transform group-hover:scale-105"
                    />
                    {discount > 0 && (
                      <span
                        className="absolute top-1.5 left-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-sm"
                        style={{ background: look.from, color: look.accent }}
                      >
                        -{discount}%
                      </span>
                    )}
                  </div>
                  <div className="text-[12px] text-ink line-clamp-2 leading-tight mb-1 min-h-[30px]">
                    {p.title}
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-bold text-brand text-[15px] tabular-nums">{money(p.price)}</span>
                    {p.priceOld && (
                      <span className="text-[11px] text-ink-faint line-through">{money(p.priceOld)}</span>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Mobile "See all" footer link (hidden on desktop) */}
      <div className="md:hidden bg-surface border-t border-line/5 px-4 py-2.5 text-center">
        <Link
          href={look.ctaHref}
          className="inline-flex items-center gap-1 text-[12px] font-bold uppercase tracking-wider text-brand hover:underline"
        >
          {look.ctaLabel} <ArrowRight size={13} aria-hidden />
        </Link>
      </div>
    </section>
  );
}

function Separator({ look }: { look: DealLook }) {
  return (
    <span
      className="text-lg font-bold pb-[18px] animate-pulse"
      style={{ color: withAlpha(look.accent, 0.55) }}
    >
      :
    </span>
  );
}

function CountdownBlock({ value, label, look }: { value: string; label: string; look: DealLook }) {
  return (
    <div className="flex flex-col items-center">
      <span
        className="tabular-nums text-[18px] sm:text-[22px] font-bold leading-none
                   bg-black/30 border rounded-md
                   px-2.5 py-2 min-w-[38px] sm:min-w-[44px] text-center tracking-tight
                   shadow-[inset_0_-2px_0_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.06)]"
        style={{ color: look.text, borderColor: withAlpha(look.accent, 0.28) }}
      >
        {value}
      </span>
      <span
        className="text-[8px] sm:text-[9px] font-bold tracking-[1.2px] mt-1 opacity-85"
        style={{ color: look.accent }}
      >
        {label}
      </span>
    </div>
  );
}

"use client";
import Link from "next/link";
import StoreImage from "@/components/ui/StoreImage";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, BadgeCheck, Pause, Play } from "lucide-react";
import type { HeroSlide } from "@/lib/content-api";
import ReelBackground from "./ReelBackground";

// Slides need enough stable screen time to be read (Baymard: 5–10s minimum),
// regardless of what the admin metadata says.
const MIN_INTERVAL_MS = 6000;

/* The slanted panel: 52% wide along the top, 44% along the bottom, measured off
   the reference design. Phones get a much wider wedge, because there the copy
   is the slide — 343px has no room to hold a headline in a column beside a
   photograph, so the photograph shows through underneath it instead. */
const panelLeft =
  "[clip-path:polygon(0_0,92%_0,80%_100%,0_100%)] sm:[clip-path:polygon(0_0,52%_0,44%_100%,0_100%)]";
const panelRight =
  "[clip-path:polygon(8%_0,100%_0,100%_100%,20%_100%)] sm:[clip-path:polygon(48%_0,100%_0,100%_100%,56%_100%)]";

/** 0–100 from the admin → the two hex digits CSS wants for an alpha channel. */
function alpha(percent = 85) {
  const clamped = Math.min(100, Math.max(0, percent));
  return Math.round((clamped / 100) * 255)
    .toString(16)
    .padStart(2, "0")
    .toUpperCase();
}

// Per-slide creative frame, picked in the admin (metadata.image_shape).
const shapeClasses: Record<string, string> = {
  circle: "rounded-full",
  rounded: "rounded-3xl",
  square: "rounded-md",
  arch: "rounded-t-full rounded-b-3xl"
};

/** True when the creative fills the whole frame — every slide except a split
 *  slide with a still, whose product image sits in a shape beside the copy. */
function fillsFrame(b: HeroSlide | undefined) {
  return !!b && (b.showText === false || b.layout === "showcase" || !!b.video);
}

/** The creative edge to edge, with the reel over the still on the live slide.
 *  The still is always laid down first: ReelBackground renders nothing for a
 *  visitor who prefers reduced motion, and they should get the photograph. */
function FullBleedMedia({
  slide: b,
  active,
  first,
  kenburns,
}: {
  slide: HeroSlide;
  active: boolean;
  first: boolean;
  kenburns: boolean;
}) {
  return (
    <div className="absolute inset-0 z-0 overflow-hidden">
      <StoreImage
        src={b.image}
        alt={b.imageAlt}
        fill
        sizes="(max-width: 768px) 100vw, 70vw"
        className={`object-cover ${kenburns && active && !b.video ? "animate-kenburns" : ""}`}
        priority={first}
      />
      {b.video && active && <ReelBackground src={b.video} className="z-0" />}
    </div>
  );
}

/** The corner CTA plate every full-bleed slide carries. */
function CornerCta({ slide: b }: { slide: HeroSlide }) {
  return (
    <Link
      href={b.href}
      className="absolute z-10 bottom-0 right-0 bg-accent text-accent-dark font-bold text-[12px] sm:text-sm uppercase tracking-[0.12em] px-5 sm:px-8 py-3 sm:py-4 rounded-tl-2xl hover:bg-surface hover:text-ink transition-colors"
    >
      {b.cta}
    </Link>
  );
}

/**
 * The default for a full-bleed slide with text: a slanted dark panel over one
 * side of the creative, holding the eyebrow, a heavy title and either the offer
 * pill or the subtitle. The panel is neutral black rather than the slide's
 * gradient so the photograph keeps its own colour; on a reel its strength is
 * the admin's overlay dial.
 */
function OverlaySlide({
  slide: b,
  active,
  first,
}: {
  slide: HeroSlide;
  active: boolean;
  first: boolean;
}) {
  const offer = b.offer?.value?.trim();
  // The copy spans the panel's full height, so only the side of the admin's
  // text position is read; top/center/bottom no longer apply here.
  const right = (b.textPosition ?? "center-left").endsWith("-right");
  const badges = b.badges ?? [];

  return (
    <>
      <FullBleedMedia slide={b} active={active} first={first} kenburns={b.kenburns !== false} />
      <div
        aria-hidden
        className={`absolute inset-0 z-0 pointer-events-none ${right ? panelRight : panelLeft}`}
        style={{ background: `#000000${alpha(b.video ? (b.videoOverlay ?? 45) : 45)}` }}
      />

      {/* Three rows spread down the panel: eyebrow and title at the top, the
          offer or subtitle in the middle, the store promises at the bottom.
          An empty row still takes its slot, so the middle stays in the middle.
          56px in from the edge clears the arrow — on phones there is no arrow
          to clear (swipe and the dots do that job), and 112px of a 343px
          banner spent on clearance is most of the room the headline needed.

          Phones also stack the copy from the top rather than spreading it.
          The promises row below is `hidden` there, which leaves two rows for
          `justify-between` to push apart — subtitle to the bottom edge, into
          the corner the CTA plate already owns. */}
      <div
        className={`relative z-10 h-full flex flex-col justify-start gap-3 px-5 pt-6 pb-5 text-white sm:justify-between sm:gap-4 sm:px-14 sm:pt-9 sm:pb-6 ${
          right ? "items-end text-right" : "items-start text-left"
        }`}
      >
        <div className="max-w-[78%] sm:max-w-[40%]">
          <span className="block text-[12px] sm:text-[14px] font-bold uppercase tracking-[0.04em] mb-2">
            {b.pill}
          </span>
          <h2 className="text-[28px] sm:text-[36px] lg:text-[42px] font-extrabold leading-[1.08] tracking-[-0.01em]">
            {b.title}
          </h2>
        </div>

        <div className="max-w-[78%] sm:max-w-[40%]">
          {offer ? (
            <span className="inline-flex items-center gap-2 -mx-2 bg-white text-[#111111] rounded-full px-5 py-1.5 shadow-card">
              {b.offer?.prefix ? (
                <span className="text-[14px] sm:text-[18px] font-semibold uppercase">
                  {b.offer.prefix}
                </span>
              ) : null}
              <span className="text-[22px] sm:text-[30px] font-extrabold leading-none uppercase tracking-[-0.01em]">
                {offer}
              </span>
            </span>
          ) : b.sub ? (
            <p className="text-[14px] sm:text-[15px] opacity-90 line-clamp-3">{b.sub}</p>
          ) : null}
        </div>

        {/* Hidden on phones, where the hero is too short for a third row. */}
        <ul
          /* Two badges fit side by side inside the panel's foot; a third
             wraps under them rather than running out over the photo. */
          className={`hidden sm:flex flex-wrap gap-x-5 gap-y-2 max-w-[43%] min-h-[2.5rem] ${right ? "justify-end" : ""}`}
        >
          {badges.map((badge) => (
            <li key={badge} className="flex items-center gap-2 text-left">
              <BadgeCheck size={24} strokeWidth={2} aria-hidden className="shrink-0" />
              <span className="text-[13px] font-semibold leading-[1.15] max-w-[6.5rem]">{badge}</span>
            </li>
          ))}
        </ul>
      </div>

      <CornerCta slide={b} />
    </>
  );
}

/**
 * A slide whose image or reel already carries its own lettering from the
 * design team: the creative fills the frame untouched — no scrim, no copy —
 * and only the CTA plate sits in the bottom-right corner, where it covers the
 * least of the design. The title stays for screen readers.
 */
function CreativeSlide({
  slide: b,
  active,
  first,
}: {
  slide: HeroSlide;
  active: boolean;
  first: boolean;
}) {
  return (
    <>
      <FullBleedMedia slide={b} active={active} first={first} kenburns={false} />
      <h2 className="sr-only">{b.title}</h2>
      <CornerCta slide={b} />
    </>
  );
}

export default function HeroBanner({ banners }: { banners: HeroSlide[] }) {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  // Once the visitor navigates manually (or hits pause), autoplay stops for good.
  const [stopped, setStopped] = useState(false);
  // Autoplay is opt-in per environment: off until we know the visitor has a
  // hover-capable pointer and hasn't asked for reduced motion.
  const [autoplayOk, setAutoplayOk] = useState(false);
  const touchX = useRef(0);

  const interval = Math.max(banners[current]?.interval ?? MIN_INTERVAL_MS, MIN_INTERVAL_MS);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const touchOnly = window.matchMedia("(hover: none)");
    const update = () => setAutoplayOk(!reduced.matches && !touchOnly.matches);
    update();
    reduced.addEventListener("change", update);
    touchOnly.addEventListener("change", update);
    return () => {
      reduced.removeEventListener("change", update);
      touchOnly.removeEventListener("change", update);
    };
  }, []);

  const autoplay = autoplayOk && !paused && !stopped && banners.length > 1;

  useEffect(() => {
    if (!autoplay) return;
    const id = setInterval(() => setCurrent((c) => (c + 1) % banners.length), interval);
    return () => clearInterval(id);
  }, [autoplay, interval, banners.length]);

  function goTo(i: number) {
    setStopped(true);
    setCurrent(((i % banners.length) + banners.length) % banners.length);
  }

  // Transition classes driven by the slide's admin-configured effect.
  function transitionClass(i: number, effect: string) {
    const active = i === current;
    if (effect === "slide") {
      return active ? "opacity-100 translate-x-0 z-10" : "opacity-0 translate-x-8 z-0";
    }
    return active ? "opacity-100 z-10" : "opacity-0 z-0";
  }

  return (
    <div
      className="relative rounded-lg overflow-hidden min-h-[300px] sm:min-h-[340px] lg:min-h-[380px] bg-black"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={(e) => { touchX.current = e.touches[0].clientX; setPaused(true); }}
      onTouchEnd={(e) => {
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (Math.abs(dx) > 40) goTo(current + (dx < 0 ? 1 : -1));
        setPaused(false);
      }}
      role="region"
      aria-label="Promotions"
    >
      {banners.map((b, i) => (
        <div
          key={b.id || `${b.title}-${i}`}
          className={`absolute inset-0 transition-all duration-700 ${transitionClass(i, b.effect ?? "fade")}`}
          style={{
            background: `linear-gradient(135deg, ${b.gradientFrom}, ${b.gradientTo})`,
            color: b.text,
            transformStyle: "preserve-3d",
            transform:
              (b.effect ?? "fade") === "flip"
                ? i === current
                  ? "rotateY(0deg)"
                  : "rotateY(90deg)"
                : undefined,
          }}
          aria-hidden={i !== current}
        >
          {b.showText === false ? (
            <CreativeSlide slide={b} active={i === current} first={i === 0} />
          ) : fillsFrame(b) ? (
            <OverlaySlide slide={b} active={i === current} first={i === 0} />
          ) : (
          <>
          {/* Split slide with a still: copy on the left, the product image in
              its shape on the right. */}
          <div className="relative z-10 h-full gap-3 md:gap-4 px-4 sm:px-6 md:px-10 py-6 sm:py-8 grid items-center grid-cols-[1.3fr_auto] md:grid-cols-[1.2fr_1fr]">
            <div className="relative z-10 max-w-xl">
              <span className="inline-block text-[11px] font-bold tracking-[0.15em] px-2.5 py-1 bg-accent text-accent-dark rounded-sm mb-4">
                {b.pill}
              </span>
              <h2 className="text-[28px] sm:text-[36px] lg:text-[44px] font-bold leading-[1.05] mb-3">
                {b.title}
              </h2>
              <p className="text-[14px] sm:text-[16px] opacity-85 mb-6 max-w-md">
                {b.sub}
              </p>
              <Link
                href={b.href}
                className="inline-flex items-center gap-2 bg-accent text-accent-dark font-bold text-sm px-6 py-3 rounded-md hover:bg-surface hover:text-ink transition-colors"
              >
                {b.cta} <ArrowRight size={16} aria-hidden />
              </Link>
            </div>
            <div className="relative h-full min-h-[120px] md:min-h-[260px]">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className={`relative w-[110px] h-[110px] sm:w-[150px] sm:h-[150px] md:w-[280px] md:h-[280px] ${shapeClasses[b.imageShape ?? "circle"]} bg-surface/10 backdrop-blur-sm overflow-hidden ${b.kenburns !== false ? "animate-kenburns" : ""}`}>
                  <StoreImage
                    src={b.image}
                    alt={b.imageAlt}
                    fill
                    sizes="(max-width: 640px) 110px, (max-width: 768px) 150px, 280px"
                    className="object-contain p-2 md:p-4"
                    priority={i === 0}
                  />
                </div>
              </div>
            </div>
          </div>
          </>
          )}
        </div>
      ))}

      {/* Arrows */}
      <button
        type="button"
        onClick={() => goTo(current - 1)}
        className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/30 text-white hidden sm:flex items-center justify-center hover:bg-black/60 transition"
        aria-label="Previous"
      >‹</button>
      <button
        type="button"
        onClick={() => goTo(current + 1)}
        className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/30 text-white hidden sm:flex items-center justify-center hover:bg-black/60 transition"
        aria-label="Next"
      >›</button>

      {/* Dots */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
        {banners.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => goTo(i)}
            aria-label={`Banner ${i + 1}`}
            aria-current={i === current}
            className={`h-1.5 rounded-full transition-all ${i === current ? "w-8 bg-surface" : "w-1.5 bg-surface/50 hover:bg-surface/80"}`}
          />
        ))}
      </div>

      {/* Pause/resume control (WCAG 2.2.2) — shown whenever autoplay is possible */}
      {autoplayOk && banners.length > 1 && (
        <button
          type="button"
          onClick={() => setStopped((s) => !s)}
          aria-label={stopped ? "Resume slideshow" : "Pause slideshow"}
          /* A full-bleed slide owns the bottom-right corner with its CTA
             plate, so the control moves up out of it. */
          className={`absolute z-20 w-8 h-8 rounded-full bg-black/30 text-white flex items-center justify-center hover:bg-black/60 transition ${
            fillsFrame(banners[current]) ? "top-3 right-3" : "bottom-3 right-3"
          }`}
        >
          {/* `▶`/`❚❚` were text, so they sat off the optical centre and picked
              up whatever glyph the platform had for them. */}
          {stopped ? (
            <Play size={13} className="ml-[1px] fill-current" aria-hidden />
          ) : (
            <Pause size={13} className="fill-current" aria-hidden />
          )}
        </button>
      )}
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import type { StorefrontSlide } from '@/lib/admin-types';
import { ArrowRight, BadgeCheck, Monitor, Pause, Play } from 'lucide-react';

export type SlideAnimation = {
  interval: number;
  effect: 'fade' | 'slide' | 'flip';
  kenburns: boolean;
};

// Reads animation config out of a slide's metadata, with storefront defaults.
export function readAnimation(slide: StorefrontSlide | undefined): SlideAnimation {
  const anim = (slide?.metadata?.animation ?? {}) as Partial<SlideAnimation>;
  return {
    interval: typeof anim.interval === 'number' && anim.interval > 0 ? anim.interval : 5500,
    effect: anim.effect === 'slide' || anim.effect === 'flip' ? anim.effect : 'fade',
    kenburns: anim.kenburns !== false,
  };
}

// Creative frame shape, mirroring the storefront's shapeClasses map.
const shapeClasses: Record<string, string> = {
  circle: 'rounded-full',
  rounded: 'rounded-3xl',
  square: 'rounded-md',
  arch: 'rounded-t-full rounded-b-3xl',
};

export function shapeClassFor(slide: StorefrontSlide | undefined): string {
  const shape = slide?.metadata?.image_shape;
  return shapeClasses[typeof shape === 'string' ? shape : 'circle'] ?? shapeClasses.circle;
}

export function layoutFor(slide: StorefrontSlide | undefined): 'split' | 'showcase' {
  return slide?.metadata?.layout === 'showcase' ? 'showcase' : 'split';
}

function offerFor(slide: StorefrontSlide): { prefix: string; value: string } {
  const offer = (slide.metadata?.offer ?? {}) as { prefix?: string; value?: string };
  return { prefix: (offer.prefix ?? '').trim(), value: (offer.value ?? '').trim() };
}

/** True when the creative fills the whole frame on the storefront — every
 *  slide except a split slide with a still. */
export function fillsFrame(slide: StorefrontSlide | undefined): boolean {
  return !!slide && (!showsText(slide) || layoutFor(slide) === 'showcase' || !!slide.video_url);
}

function CornerCta({ slide: s }: { slide: StorefrontSlide }) {
  return (
    <span
      className="absolute bottom-0 right-0 rounded-tl-2xl px-6 py-3 text-[12px] font-bold uppercase tracking-[0.12em]"
      style={{ background: s.accent_color, color: '#1a1a1a' }}
    >
      {s.cta_label || 'Shop now'}
    </span>
  );
}

/** Mirrors the storefront's overlay slide: the creative edge to edge, a
 *  slanted black panel (52% wide at the top, 44% at the bottom) over the copy
 *  side, eyebrow, heavy title, offer pill or subtitle, and the corner CTA. */
function OverlayBody({ slide: s, kenburns }: { slide: StorefrontSlide; kenburns: boolean }) {
  const offer = offerFor(s);
  const right = (s.text_position || 'center-left').endsWith('-right');
  const badges = Array.isArray(s.metadata?.badges)
    ? (s.metadata.badges as unknown[]).filter((b): b is string => typeof b === 'string').slice(0, 3)
    : [];
  const strength = s.video_url ? s.video_overlay_opacity ?? 45 : 45;
  return (
    <>
      <div className="absolute inset-0 overflow-hidden">
        {s.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={s.image_url}
            alt={s.image_alt || s.title}
            className={`absolute inset-0 h-full w-full object-cover ${kenburns && !s.video_url ? 'animate-kenburns' : ''}`}
          />
        )}
      </div>
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `rgba(0,0,0,${Math.min(100, Math.max(0, strength)) / 100})`,
          clipPath: right ? 'polygon(48% 0,100% 0,100% 100%,56% 100%)' : 'polygon(0 0,52% 0,44% 100%,0 100%)',
        }}
      />

      <div
        className={`relative h-full flex flex-col justify-between gap-4 px-14 pt-9 pb-6 text-white ${
          right ? 'items-end text-right' : 'items-start text-left'
        }`}
      >
        <div className="max-w-[40%]">
          <span className="block text-[14px] font-bold uppercase tracking-[0.04em] mb-2">
            {s.eyebrow || 'FEATURED'}
          </span>
          <h2 className="text-[36px] font-extrabold leading-[1.08] tracking-[-0.01em]">
            {s.title || 'Slide title'}
          </h2>
        </div>

        <div className="max-w-[40%]">
          {offer.value ? (
            <span className="inline-flex items-center gap-2 -mx-2 rounded-full bg-white px-5 py-1.5 text-[#111111]">
              {offer.prefix && <span className="text-[18px] font-semibold uppercase">{offer.prefix}</span>}
              <span className="text-[30px] font-extrabold leading-none uppercase tracking-[-0.01em]">{offer.value}</span>
            </span>
          ) : s.subtitle ? (
            <p className="text-[15px] opacity-90 line-clamp-3">{s.subtitle}</p>
          ) : null}
          {s.video_url && (
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-semibold">
              ▶ Reel · {strength}% panel
            </p>
          )}
        </div>

        <ul className={`flex flex-wrap gap-x-5 gap-y-2 max-w-[43%] min-h-[2.5rem] ${right ? 'justify-end' : ''}`}>
          {badges.map((badge) => (
            <li key={badge} className="flex items-center gap-2 text-left">
              <BadgeCheck size={24} aria-hidden className="shrink-0" />
              <span className="text-[13px] font-semibold leading-[1.15] max-w-[6.5rem]">{badge}</span>
            </li>
          ))}
        </ul>
      </div>

      <CornerCta slide={s} />
    </>
  );
}

/** False only when the admin switched text off; older slides show text. */
export function showsText(slide: StorefrontSlide | undefined): boolean {
  return slide?.metadata?.show_text !== false;
}

/** Mirrors the storefront's creative-only slide: the image edge to edge with
 *  no scrim or copy — the lettering is in the artwork — and the CTA in the
 *  bottom-right corner. */
function CreativeBody({ slide: s }: { slide: StorefrontSlide }) {
  return (
    <>
      <div className="absolute inset-0 overflow-hidden">
        {s.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={s.image_url} alt={s.image_alt || s.title} className="absolute inset-0 h-full w-full object-cover" />
        )}
      </div>
      {s.video_url && (
        <p className="absolute top-3 left-14 inline-flex items-center gap-1.5 rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-semibold text-white">
          ▶ Reel · text off
        </p>
      )}
      <CornerCta slide={s} />
    </>
  );
}

/**
 * Mirrors the customer storefront hero (HeroBanner): same crossfade / slide / flip
 * transitions, Ken Burns zoom, autoplay interval and progress bar — so staff see
 * exactly what shoppers will see before publishing.
 */
export default function HeroPreview({ slides }: { slides: StorefrontSlide[] }) {
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [progress, setProgress] = useState(0);

  const count = slides.length;
  // `current` can point past the end when a slide is paused/deleted while
  // previewing — always index through the wrapped value.
  const index = count ? ((current % count) + count) % count : 0;
  const anim = count ? readAnimation(slides[index]) : null;
  const interval = anim?.interval ?? 5500;

  useEffect(() => {
    if (!playing || count <= 1) return;
    const step = 50;
    const id = setInterval(() => {
      setProgress((p) => {
        const next = p + step;
        if (next >= interval) {
          setCurrent((c) => (c + 1) % count);
          return 0;
        }
        return next;
      });
    }, step);
    return () => clearInterval(id);
  }, [playing, count, interval, current]);

  function goTo(i: number) {
    setCurrent(((i % count) + count) % count);
    setProgress(0);
  }

  if (!count) {
    return (
      <div className="bg-surface rounded-2xl border border-gray-500/20 p-8 text-center text-light-secondary-text">
        <Monitor size={22} className="mx-auto mb-2" />
        <p className="text-sm font-public-sans">No slides yet — create one below to preview it here.</p>
      </div>
    );
  }

  function transitionClass(i: number, effect: SlideAnimation['effect']) {
    const active = i === index;
    if (effect === 'slide') {
      return active ? 'opacity-100 translate-x-0 z-10' : 'opacity-0 translate-x-6 z-0';
    }
    if (effect === 'flip') {
      return active ? 'opacity-100 z-10' : 'opacity-0 z-0';
    }
    return active ? 'opacity-100 z-10' : 'opacity-0 z-0';
  }

  return (
    <section className="bg-surface rounded-2xl border border-gray-500/20 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-500/20">
        <p className="text-xs font-semibold font-public-sans flex items-center gap-1.5 text-light-secondary-text">
          <Monitor size={13} className="text-primary" /> Live storefront preview
        </p>
        <button
          type="button"
          onClick={() => setPlaying((p) => !p)}
          className="inline-flex items-center justify-center rounded-lg hover:bg-gray-100 h-8 w-8 text-light-primary-text hover:text-primary transition-colors"
          title={playing ? 'Pause' : 'Play'}
        >
          {playing ? <Pause size={13} /> : <Play size={13} />}
        </button>
      </div>

      <div className="relative min-h-[280px] bg-black" style={{ perspective: '1400px' }}>
        {slides.map((s, i) => {
          const a = readAnimation(s);
          return (
            <div
              key={s.id || i}
              className={`absolute inset-0 transition-all duration-700 ${transitionClass(i, a.effect)}`}
              style={{
                background: `linear-gradient(135deg, ${s.gradient_from}, ${s.gradient_to})`,
                color: s.text_color,
                transformStyle: 'preserve-3d',
                transform:
                  a.effect === 'flip'
                    ? i === index
                      ? 'rotateY(0deg)'
                      : 'rotateY(90deg)'
                    : undefined,
              }}
              aria-hidden={i !== index}
            >
              {!showsText(s) ? (
                <CreativeBody slide={s} />
              ) : fillsFrame(s) ? (
                <OverlayBody slide={s} kenburns={a.kenburns && i === index} />
              ) : (
              <>
              <div className="relative h-full grid items-center gap-4 px-6 md:px-10 py-8 grid-cols-1 md:grid-cols-[1.2fr_1fr]">
                <div className="max-w-xl">
                  <span
                    className="inline-block text-[11px] font-bold tracking-[0.15em] px-2.5 py-1 rounded-sm mb-3"
                    style={{ background: s.accent_color, color: '#1a1a1a' }}
                  >
                    {s.eyebrow || 'FEATURED'}
                  </span>
                  <h2 className="text-[26px] sm:text-[34px] font-bold leading-[1.05] mb-2">{s.title || 'Slide title'}</h2>
                  <p className="text-sm opacity-85 mb-4 max-w-md">{s.subtitle}</p>
                  <span
                    className="inline-flex items-center gap-2 font-bold text-sm px-5 py-2.5 rounded-md"
                    style={{ background: s.accent_color, color: '#1a1a1a' }}
                  >
                    {s.cta_label || 'Shop now'} <ArrowRight size={15} aria-hidden />
                  </span>
                </div>
                {s.image_url && (
                  <div className="hidden md:flex items-center justify-center h-full min-h-[220px]">
                    <div
                      className={`relative w-[220px] h-[220px] ${shapeClassFor(s)} bg-white/10 overflow-hidden ${a.kenburns && i === index ? 'animate-kenburns' : ''}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={s.image_url} alt={s.image_alt || s.title} className="absolute inset-0 w-full h-full object-contain p-4" />
                    </div>
                  </div>
                )}
              </div>
              </>
              )}
            </div>
          );
        })}

        <button type="button" onClick={() => goTo(index - 1)} className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/30 text-white flex items-center justify-center hover:bg-black/60 transition" aria-label="Previous">‹</button>
        <button type="button" onClick={() => goTo(index + 1)} className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/30 text-white flex items-center justify-center hover:bg-black/60 transition" aria-label="Next">›</button>

        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Slide ${i + 1}`}
              aria-current={i === index}
              className={`h-1.5 rounded-full transition-all ${i === index ? 'w-8 bg-surface' : 'w-1.5 bg-white/50 hover:bg-white/80'}`}
            />
          ))}
        </div>

        <div className="absolute top-0 left-0 right-0 h-0.5 bg-white/20 z-20">
          <div className="h-full bg-white transition-[width] duration-75" style={{ width: `${(progress / interval) * 100}%` }} />
        </div>
      </div>

      <div className="px-4 py-2 text-[11px] font-public-sans flex flex-wrap gap-x-4 gap-y-1 text-light-secondary-text">
        <span>Slide {index + 1} / {count}</span>
        {anim && <span>Effect: <strong className="text-light-primary-text">{anim.effect}</strong></span>}
        {anim && <span>Autoplay: <strong className="text-light-primary-text">{(anim.interval / 1000).toFixed(1)}s</strong></span>}
        {anim && <span>Ken Burns: <strong className="text-light-primary-text">{anim.kenburns ? 'on' : 'off'}</strong></span>}
        <span>Layout: <strong className="text-light-primary-text">{layoutFor(slides[index])}</strong></span>
        <span>Text: <strong className="text-light-primary-text">{showsText(slides[index]) ? 'on' : 'off'}</strong></span>
        {layoutFor(slides[index]) === 'split' && (
          <span>Shape: <strong className="text-light-primary-text">{String(slides[index]?.metadata?.image_shape ?? 'circle')}</strong></span>
        )}
      </div>
    </section>
  );
}

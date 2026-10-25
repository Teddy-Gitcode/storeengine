import { revalidatePath } from 'next/cache';
import Link from 'next/link';
import StatCard from '@/components/StatCard';
import Badge, { type BadgeVariant } from '@/components/Badge';
import {
  Calendar,
  CheckCircle2,
  Eye,
  Image,
  PauseCircle,
  Plus,
  Save,
  Film,
} from 'lucide-react';
import {
  createStorefrontSlide,
  deleteStorefrontSlide,
  getCategories,
  getProducts,
  getStoreSettings,
  getStorefrontSlides,
  updateStorefrontSlide,
  updateStoreSettings,
} from '@/lib/admin-api';
import type { StorefrontSlide } from '@/lib/admin-types';
import SettingsToggle from '@/components/sellzy/settings-toggle';
import { storefrontUrl } from '@/lib/storefront';
import HeroPreview from './HeroPreview';
import MediaUrlField from './MediaUrlField';
import OverlayOpacityField from './OverlayOpacityField';
import CtaLinkField, { type LinkCategory, type LinkProduct } from './CtaLinkField';
import SlideOrder from './SlideOrder';
import DeleteSlideButton from './DeleteSlideButton';

export const dynamic = 'force-dynamic';

function value(formData: FormData, key: string, fallback = '') {
  return String(formData.get(key) || fallback).trim();
}

function numberValue(formData: FormData, key: string, fallback = 0) {
  const parsed = Number(formData.get(key));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function orNull(formData: FormData, key: string) {
  const v = String(formData.get(key) || '').trim();
  return v || null;
}

// datetime-local (with tz) -> "YYYY-MM-DDTHH:MM" for the input default value.
function toLocalInput(iso?: string | null) {
  if (!iso) return '';
  return iso.slice(0, 16);
}

type Animation = { interval: number; effect: string; kenburns: boolean };

function readAnimation(slide?: StorefrontSlide): Animation {
  const anim = (slide?.metadata?.animation ?? {}) as Partial<Animation>;
  return {
    interval: typeof anim.interval === 'number' && anim.interval > 0 ? anim.interval : 5500,
    effect: anim.effect === 'slide' || anim.effect === 'flip' ? anim.effect : 'fade',
    kenburns: anim.kenburns !== false,
  };
}

const imageShapes = ['circle', 'rounded', 'square', 'arch'] as const;

function readImageShape(slide?: StorefrontSlide): string {
  const shape = slide?.metadata?.image_shape;
  return imageShapes.find((s) => s === shape) ?? 'circle';
}

/* How the slide arranges itself on the storefront. "split" is the classic
   hero — copy left, creative framed on the right. "showcase" makes the photo
   the whole slide and lays the offer, the store promises and the CTA plate
   over it. */
const slideLayouts = ['split', 'showcase'] as const;

function readLayout(slide?: StorefrontSlide): string {
  const layout = slide?.metadata?.layout;
  return slideLayouts.find((l) => l === layout) ?? 'split';
}

type Offer = { prefix: string; value: string };

/** The discount plate on a showcase slide, e.g. "UP TO" + "30% OFF". */
function readOffer(slide?: StorefrontSlide): Offer {
  const offer = (slide?.metadata?.offer ?? {}) as Partial<Offer>;
  return {
    prefix: typeof offer.prefix === 'string' ? offer.prefix : '',
    value: typeof offer.value === 'string' ? offer.value : '',
  };
}

/** Store promises along the bottom of the text panel, typed comma-separated. */
function readBadges(slide?: StorefrontSlide): string {
  const badges = slide?.metadata?.badges;
  return Array.isArray(badges) ? badges.filter((b) => typeof b === 'string').join(', ') : '';
}

function parseBadges(raw: string): string[] {
  return raw
    .split(',')
    .map((b) => b.trim().slice(0, 32))
    .filter(Boolean)
    .slice(0, 3);
}

/* Picks a layout class on the storefront, so anything off the grid would
   render nothing — fall back rather than pass it through. */
const textPositions = [
  'top-left', 'top-center', 'top-right',
  'center-left', 'center-center', 'center-right',
  'bottom-left', 'bottom-center', 'bottom-right',
] as const;

function readTextPosition(raw: string): string {
  return textPositions.find((p) => p === raw) ?? 'center-left';
}

/** Becomes a CSS alpha channel on the storefront, so keep it a percentage. */
function clampPercent(value: number) {
  return Math.min(100, Math.max(0, Math.round(value)));
}

function slidePayload(formData: FormData) {
  // Input is in seconds for humans; store milliseconds to match the storefront.
  const seconds = numberValue(formData, 'autoplay_s', 5.5);
  const interval = Math.max(2000, Math.round(seconds * 1000));
  const effect = value(formData, 'effect', 'fade');
  const kenburns = formData.get('kenburns') === 'on';
  const rawShape = value(formData, 'image_shape', 'circle');
  const imageShape = imageShapes.find((s) => s === rawShape) ?? 'circle';
  const rawLayout = value(formData, 'layout', 'split');
  const layout = slideLayouts.find((l) => l === rawLayout) ?? 'split';
  const offer = { prefix: value(formData, 'offer_prefix'), value: value(formData, 'offer_value') };
  return {
    placement: value(formData, 'placement', 'home_hero') === 'offers_live' ? 'offers_live' : 'home_hero',
    title: value(formData, 'title'),
    eyebrow: value(formData, 'eyebrow'),
    subtitle: value(formData, 'subtitle'),
    cta_label: value(formData, 'cta_label'),
    cta_href: value(formData, 'cta_href', '/shop'),
    image_url: value(formData, 'image_url', '/products/placeholder-1.svg'),
    image_alt: value(formData, 'image_alt'),
    video_url: value(formData, 'video_url'),
    video_overlay_opacity: clampPercent(numberValue(formData, 'video_overlay_opacity', 85)),
    text_position: readTextPosition(value(formData, 'text_position', 'center-left')),
    gradient_from: value(formData, 'gradient_from', '#0F6E56'),
    gradient_to: value(formData, 'gradient_to', '#0A4F3E'),
    text_color: value(formData, 'text_color', '#FFFFFF'),
    accent_color: value(formData, 'accent_color', '#FFD166'),
    status: value(formData, 'status', 'draft'),
    sort_order: numberValue(formData, 'sort_order', 0),
    starts_at: orNull(formData, 'starts_at'),
    ends_at: orNull(formData, 'ends_at'),
    // show_text off: the creative carries its own lettering, so the storefront
    // and app show it bare with only the CTA in a corner. Unchecked checkboxes
    // post nothing, hence "=== 'on'".
    metadata: {
      animation: { interval, effect, kenburns },
      image_shape: imageShape,
      layout,
      offer,
      badges: parseBadges(value(formData, 'badges')),
      show_text: formData.get('show_text') === 'on',
    },
  };
}

async function createSlideAction(formData: FormData) {
  'use server';
  await createStorefrontSlide(slidePayload(formData));
  revalidatePath('/content');
}

async function updateSlideAction(formData: FormData) {
  'use server';
  const id = Number(formData.get('id'));
  await updateStorefrontSlide(id, slidePayload(formData));
  revalidatePath('/content');
}

async function publishSlideAction(formData: FormData) {
  'use server';
  const id = Number(formData.get('id'));
  await updateStorefrontSlide(id, { status: 'live' });
  revalidatePath('/content');
}

async function pauseSlideAction(formData: FormData) {
  'use server';
  const id = Number(formData.get('id'));
  await updateStorefrontSlide(id, { status: 'paused' });
  revalidatePath('/content');
}

async function deleteSlideAction(formData: FormData) {
  'use server';
  const id = Number(formData.get('id'));
  await deleteStorefrontSlide(id);
  revalidatePath('/content');
}

/* The app decodes hero video on the device, so it costs battery and mobile
   data the storefront's <video> does not — this is the kill switch for it.
   Storefront playback is unaffected. */
async function toggleMobileHeroVideoAction(formData: FormData) {
  'use server';
  await updateStoreSettings({ mobile_hero_video: formData.get('mobile_hero_video') === 'on' });
  revalidatePath('/content');
}

/* The app's festive header: a holiday greeting with confetti on the day, and a
   themed backdrop while a big football tournament or multi-sport games is on.
   Both start off; the merchant decides when the shop is seen celebrating. */
async function saveMobileFestiveHeaderAction(formData: FormData) {
  'use server';
  await updateStoreSettings({
    mobile_holiday_greetings: formData.get('mobile_holiday_greetings') === 'on',
    mobile_sports_themes: formData.get('mobile_sports_themes') === 'on',
  });
  revalidatePath('/content');
}


// Persist a new slide order — each slide's sort_order becomes its list index.
async function reorderSlidesAction(orderedIds: number[]) {
  'use server';
  await Promise.all(orderedIds.map((id, index) => updateStorefrontSlide(id, { sort_order: index })));
  revalidatePath('/content');
}

function slideStatusVariant(status: string): BadgeVariant {
  if (status === 'live') return 'success';
  if (status === 'scheduled') return 'info';
  if (status === 'draft') return 'gold';
  if (status === 'paused') return 'neutral';
  return 'neutral';
}

function scheduleLabel(slide: StorefrontSlide) {
  if (!slide.starts_at && !slide.ends_at) return 'Ongoing';
  const start = slide.starts_at ? new Date(slide.starts_at).toLocaleDateString('en-US') : 'Now';
  const end = slide.ends_at ? new Date(slide.ends_at).toLocaleDateString('en-US') : 'Open';
  return `${start} - ${end}`;
}

function storefrontHref(href: string) {
  return storefrontUrl(href);
}

function Field({
  label,
  name,
  defaultValue,
  type = 'text',
  required = false,
}: {
  label: string;
  name: string;
  defaultValue?: string | number;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="space-y-1">
      <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>
        {label}
      </span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        className="w-full rounded-md border border-[var(--border)] bg-surface px-3 py-2 text-sm outline-none focus:border-[var(--brand)]"
      />
    </label>
  );
}

function ColorField({ label, name, defaultValue }: { label: string; name: string; defaultValue: string }) {
  return (
    <label className="space-y-1">
      <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>
        {label}
      </span>
      <span className="flex items-center gap-2 rounded-md border border-[var(--border)] bg-surface px-2 py-1.5">
        <input name={name} type="color" defaultValue={defaultValue} className="h-6 w-8 cursor-pointer rounded border-0 bg-transparent p-0" />
        <span className="font-mono text-xs" style={{ color: 'var(--text-2)' }}>{defaultValue}</span>
      </span>
    </label>
  );
}

function TextArea({ label, name, defaultValue }: { label: string; name: string; defaultValue?: string }) {
  return (
    <label className="space-y-1 md:col-span-2">
      <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>
        {label}
      </span>
      <textarea
        name={name}
        defaultValue={defaultValue}
        rows={3}
        className="w-full rounded-md border border-[var(--border)] bg-surface px-3 py-2 text-sm outline-none focus:border-[var(--brand)]"
      />
    </label>
  );
}

function StatusSelect({ defaultValue = 'draft' }: { defaultValue?: string }) {
  return (
    <label className="space-y-1">
      <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>
        Status
      </span>
      <select
        name="status"
        defaultValue={defaultValue}
        className="w-full rounded-md border border-[var(--border)] bg-surface pl-3 pr-8 py-2 text-sm outline-none focus:border-[var(--brand)]"
      >
        <option value="draft">Draft</option>
        <option value="scheduled">Scheduled</option>
        <option value="live">Live</option>
        <option value="paused">Paused</option>
        <option value="ended">Ended</option>
      </select>
    </label>
  );
}

type LinkData = { categories: LinkCategory[]; products: LinkProduct[] };

/* A brand-new slide starts on the store's own palette (Settings → General),
   not on the template's stock greens. */
type SlidePalette = { from: string; to: string; text: string; accent: string };

function SlideForm({
  slide,
  linkData,
  palette,
  placement = 'home_hero',
}: {
  slide?: StorefrontSlide;
  linkData: LinkData;
  palette: SlidePalette;
  placement?: 'home_hero' | 'offers_live';
}) {
  const anim = readAnimation(slide);
  const offer = readOffer(slide);
  return (
    <form data-manage action={slide ? updateSlideAction : createSlideAction} className="grid gap-3 md:grid-cols-2">
      {slide ? <input type="hidden" name="id" value={slide.id} /> : null}
      <input type="hidden" name="placement" value={slide?.placement === 'offers_live' ? 'offers_live' : placement} />
      <label className="space-y-1 md:col-span-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>Layout</span>
        <select name="layout" defaultValue={readLayout(slide)} className="w-full rounded-md border border-[var(--border)] bg-surface pl-3 pr-8 py-2 text-sm outline-none focus:border-[var(--brand)]">
          <option value="split">Split — copy left, product image right</option>
          <option value="showcase">Showcase — full-bleed photo with offer plate</option>
        </select>
        <span className="block text-[11px]" style={{ color: 'var(--text-3)' }}>
          Showcase fills the slide with the image, so use a wide photograph rather than a cut-out
          product. It shows the offer plate over the photo and ignores the image shape.
        </span>
      </label>
      <label className="flex items-start gap-2 md:col-span-2 rounded-md border border-[var(--border)] px-3 py-2.5">
        <input
          name="show_text"
          type="checkbox"
          // Missing on slides saved before this switch existed: those show text.
          defaultChecked={slide?.metadata?.show_text !== false}
          className="h-4 w-4 mt-0.5"
        />
        <span className="text-xs" style={{ color: 'var(--text-2)' }}>
          <strong style={{ color: 'var(--text-1)' }}>Show text on the slide</strong> — turn this off when the image or video
          already has its own lettering from the design team. The slide then shows only the creative, with its button in the
          bottom-right corner. Keep a title anyway: it names the slide here and is read out to screen-reader users.
        </span>
      </label>
      <Field label="Eyebrow" name="eyebrow" defaultValue={slide?.eyebrow} />
      <Field label="Sort order" name="sort_order" type="number" defaultValue={slide?.sort_order ?? 50} />
      <Field label="Title" name="title" defaultValue={slide?.title} required />
      <Field label="CTA label" name="cta_label" defaultValue={slide?.cta_label || 'Shop now'} />
      <CtaLinkField defaultValue={slide?.cta_href || '/shop'} categories={linkData.categories} products={linkData.products} pictureTarget="image_url" />
      <MediaUrlField label="Image" name="image_url" defaultValue={slide?.image_url || '/products/placeholder-1.svg'} />
      <Field label="Image alt" name="image_alt" defaultValue={slide?.image_alt || slide?.title} />
      <MediaUrlField
        label="Background reel (optional .mp4/.webm)"
        name="video_url"
        defaultValue={slide?.video_url || ''}
      />
      <OverlayOpacityField defaultValue={slide?.video_overlay_opacity ?? 85} />
      <label className="space-y-1">
        <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>Reel text position</span>
        <select name="text_position" defaultValue={readTextPosition(slide?.text_position ?? 'center-left')} className="w-full rounded-md border border-[var(--border)] bg-surface pl-3 pr-8 py-2 text-sm outline-none focus:border-[var(--brand)]">
          <option value="top-left">Top left</option>
          <option value="top-center">Top centre</option>
          <option value="top-right">Top right</option>
          <option value="center-left">Middle left (default)</option>
          <option value="center-center">Middle centre</option>
          <option value="center-right">Middle right</option>
          <option value="bottom-left">Bottom left</option>
          <option value="bottom-center">Bottom centre</option>
          <option value="bottom-right">Bottom right</option>
        </select>
        <span className="block text-[11px]" style={{ color: 'var(--text-3)' }}>
          Applies to slides with a reel. The copy stays width-capped wherever you put it.
        </span>
      </label>
      <StatusSelect defaultValue={slide?.status || 'draft'} />

      {/* Showcase offer plate. Leave the value empty and the slide shows the
          subtitle in its place instead. */}
      <Field label="Offer prefix (showcase)" name="offer_prefix" defaultValue={offer.prefix} />
      <Field label="Offer value (showcase)" name="offer_value" defaultValue={offer.value} />
      {/* Only state what the store actually does — these show on every
          visit to the home page. */}
      <Field
        label="Badges (up to 3, comma-separated)"
        name="badges"
        defaultValue={readBadges(slide)}
      />

      <ColorField label="Gradient from" name="gradient_from" defaultValue={slide?.gradient_from || palette.from} />
      <ColorField label="Gradient to" name="gradient_to" defaultValue={slide?.gradient_to || palette.to} />
      <ColorField label="Text color" name="text_color" defaultValue={slide?.text_color || palette.text} />
      <ColorField label="Accent color" name="accent_color" defaultValue={slide?.accent_color || palette.accent} />

      <Field label="Publish from" name="starts_at" type="datetime-local" defaultValue={toLocalInput(slide?.starts_at)} />
      <Field label="Publish until" name="ends_at" type="datetime-local" defaultValue={toLocalInput(slide?.ends_at)} />

      {/* Animation controls (stored in metadata, honored by the storefront hero) */}
      <label className="space-y-1">
        <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>Autoplay (seconds)</span>
        <input name="autoplay_s" type="number" step="0.5" min="2" defaultValue={anim.interval / 1000} className="w-full rounded-md border border-[var(--border)] bg-surface px-3 py-2 text-sm outline-none focus:border-[var(--brand)]" />
      </label>
      <label className="space-y-1">
        <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>Transition effect</span>
        <select name="effect" defaultValue={anim.effect} className="w-full rounded-md border border-[var(--border)] bg-surface pl-3 pr-8 py-2 text-sm outline-none focus:border-[var(--brand)]">
          <option value="fade">Fade</option>
          <option value="slide">Slide</option>
          <option value="flip">3D Flip</option>
        </select>
      </label>
      <label className="space-y-1">
        <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>Image shape</span>
        <select name="image_shape" defaultValue={readImageShape(slide)} className="w-full rounded-md border border-[var(--border)] bg-surface pl-3 pr-8 py-2 text-sm outline-none focus:border-[var(--brand)]">
          <option value="circle">Circle</option>
          <option value="rounded">Rounded square</option>
          <option value="square">Square</option>
          <option value="arch">Arch</option>
        </select>
      </label>
      <label className="flex items-center gap-2 md:col-span-2 pt-1">
        <input name="kenburns" type="checkbox" defaultChecked={anim.kenburns} className="h-4 w-4" />
        <span className="text-xs flex items-center gap-1.5" style={{ color: 'var(--text-2)' }}>
          <Film size={13} /> Ken Burns zoom on product image
        </span>
      </label>

      <TextArea label="Subtitle" name="subtitle" defaultValue={slide?.subtitle} />
      <div className="md:col-span-2 flex flex-wrap justify-end gap-2">
        <button className="ak-btn-primary" type="submit">
          {slide ? <Save size={13} /> : <Plus size={13} />}
          {slide ? 'Save slide' : 'Create slide'}
        </button>
      </div>
    </form>
  );
}

export default async function ContentPage() {
  const [slides, liveBanners] = await Promise.all([
    getStorefrontSlides().then((r) => r.results),
    getStorefrontSlides('offers_live').then((r) => r.results),
  ]);
  const [categoriesPage, productsPage, settings] = await Promise.all([
    getCategories({ page_size: 200 }),
    getProducts({ page_size: 200 }),
    getStoreSettings().catch(() => null),
  ]);
  const linkData = {
    categories: categoriesPage.results.filter((c) => c.is_active).map((c) => ({ slug: c.slug, name: c.name, image: c.image_url || '' })),
    products: productsPage.results.map((p) => ({ id: p.id, name: p.name })),
  };
  const liveCount = slides.filter((slide) => slide.status === 'live').length;
  const draftCount = slides.filter((slide) => slide.status === 'draft').length;
  const pausedCount = slides.filter((slide) => slide.status === 'paused').length;
  const liveSlides = slides
    .filter((slide) => slide.status === 'live')
    .sort((a, b) => a.sort_order - b.sort_order);
  const orderedSlides = [...slides].sort((a, b) => a.sort_order - b.sort_order);
  const videoSlides = liveSlides.filter((slide) => (slide.video_url || '').trim().length > 0).length;
  const palette = {
    from: settings?.brand_color || '#0F6E56',
    to: settings?.brand_color_dark || '#0A4F3E',
    text: '#FFFFFF',
    accent: settings?.accent_color || '#FFD166',
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="ak-page-title">Storefront content</h2>
          <p className="ak-page-sub">Homepage hero slides are synced directly with the customer storefront</p>
        </div>
        <Link className="ak-btn-secondary" href={storefrontUrl('/')} target="_blank">
          <Eye size={13} />
          View storefront
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Hero slides" value={String(slides.length)} sub="Editable from admin" trend="neutral" icon={Image} accent="blue" />
        <StatCard label="Live slides" value={String(liveCount)} sub="Visible on storefront" trend="neutral" icon={CheckCircle2} accent="green" />
        <StatCard label="Draft slides" value={String(draftCount)} sub="Hidden until published" trend="neutral" icon={Calendar} accent="gold" />
        <StatCard label="Paused slides" value={String(pausedCount)} sub="Temporarily hidden" trend="neutral" icon={PauseCircle} accent="purple" />
      </div>

      <HeroPreview slides={liveSlides} />

      {settings && (
        <section className="ak-card p-4">
          <form data-manage action={toggleMobileHeroVideoAction} className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-[240px] flex-1">
              <h3 className="font-semibold flex items-center gap-1.5" style={{ color: 'var(--text-1)' }}>
                <Film size={14} /> Play hero videos in the mobile app
              </h3>
              <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                {settings.mobile_hero_video
                  ? 'On — the app plays a slide’s reel muted and looping, and only while that slide is on screen.'
                  : 'Off — the app shows each slide’s still image instead. Turn this off if customers report battery or data use.'}{' '}
                The storefront website is unaffected either way.
                {videoSlides === 0 && ' No live slide has a reel yet, so this changes nothing right now.'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <SettingsToggle name="mobile_hero_video" defaultChecked={settings.mobile_hero_video} label="Play hero videos in the mobile app" />
              <button className="ak-btn-secondary" type="submit">
                <Save size={13} />
                Save
              </button>
            </div>
          </form>
        </section>
      )}

      {settings && (
        <section className="ak-card p-4">
          <form data-manage action={saveMobileFestiveHeaderAction} className="space-y-4">
            <div>
              <h3 className="font-semibold flex items-center gap-1.5" style={{ color: 'var(--text-1)' }}>
                <Calendar size={14} /> Festive header in the mobile app
              </h3>
              <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                The top of the app’s home screen can mark the day. The time-of-day greeting and “Deliver to” always show;
                these add to them, and appear only on the dates they apply to.
              </p>
            </div>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-[240px] flex-1">
                <p className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>Holiday greetings</p>
                <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                  {settings.mobile_holiday_greetings ? 'On' : 'Off'} — “Happy Mashujaa Day, Ted” with confetti on public holidays;
                  in Kenya’s flag colours on Madaraka, Mashujaa and Jamhuri Day.
                </p>
              </div>
              <SettingsToggle name="mobile_holiday_greetings" defaultChecked={settings.mobile_holiday_greetings} label="Holiday greetings" />
            </div>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-[240px] flex-1">
                <p className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>Sports event themes</p>
                <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                  {settings.mobile_sports_themes ? 'On' : 'Off'} — a football or games backdrop and lines like “Football fever is
                  here” while a major tournament runs. Worded without event names or logos, which are sponsors’ trademarks.
                </p>
              </div>
              <SettingsToggle name="mobile_sports_themes" defaultChecked={settings.mobile_sports_themes} label="Sports event themes" />
            </div>
            <div className="flex justify-end">
              <button className="ak-btn-secondary" type="submit">
                <Save size={13} />
                Save
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="ak-card p-4 space-y-4">
        <div>
          <h3 className="font-semibold flex items-center gap-1.5" style={{ color: 'var(--text-1)' }}>
            <Film size={14} /> Flash Sale live banner (mobile app)
          </h3>
          <p className="text-xs" style={{ color: 'var(--text-3)' }}>
            Shown at the top of the app’s Flash Sale screen with a green “Live” badge while it is live — a video reel
            works best (add a Video URL). Same fields and schedule as a homepage slide; it never appears on the homepage.
            {liveBanners.length === 0 && ' None yet, so the Flash Sale screen opens straight on the deals.'}
          </p>
        </div>
        {liveBanners.map((slide) => (
          <article key={slide.id} className="rounded-2xl border p-4" style={{ borderColor: 'var(--border)' }}>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <p className="font-semibold" style={{ color: 'var(--text-1)' }}>{slide.title}</p>
              <div className="flex items-center gap-2">
                <Badge label={slide.status_label} variant={slideStatusVariant(slide.status)} />
                <span className="text-xs" style={{ color: 'var(--text-3)' }}>{scheduleLabel(slide)}</span>
              </div>
            </div>
            <div className="grid gap-4 lg:grid-cols-[1fr_180px]">
              <SlideForm slide={slide} linkData={linkData} palette={palette} placement="offers_live" />
              <div className="flex flex-col gap-2">
                {slide.status === 'live' ? (
                  <form data-manage action={pauseSlideAction}>
                    <input type="hidden" name="id" value={slide.id} />
                    <button className="ak-btn-secondary w-full justify-center" type="submit">
                      <PauseCircle size={13} />
                      Pause
                    </button>
                  </form>
                ) : (
                  <form data-manage action={publishSlideAction}>
                    <input type="hidden" name="id" value={slide.id} />
                    <button className="ak-btn-secondary w-full justify-center" type="submit">
                      <CheckCircle2 size={13} />
                      Publish
                    </button>
                  </form>
                )}
                <DeleteSlideButton id={slide.id} action={deleteSlideAction} />
              </div>
            </div>
          </article>
        ))}
        <details>
          <summary className="cursor-pointer text-sm font-medium" style={{ color: 'var(--text-1)' }}>
            New live banner
          </summary>
          <div className="mt-3">
            <SlideForm linkData={linkData} palette={palette} placement="offers_live" />
          </div>
        </details>
      </section>

      {orderedSlides.length > 1 && (
        <SlideOrder
          slides={orderedSlides.map((s) => ({
            id: s.id,
            title: s.title,
            eyebrow: s.eyebrow,
            status: s.status,
            status_label: s.status_label,
          }))}
          action={reorderSlidesAction}
        />
      )}

      <section className="ak-card p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold" style={{ color: 'var(--text-1)' }}>New homepage slide</h3>
            <p className="text-xs" style={{ color: 'var(--text-3)' }}>
              Create it as draft, set the schedule and animation, then publish when ready.
            </p>
          </div>
        </div>
        <SlideForm linkData={linkData} palette={palette} />
      </section>

      <section className="grid gap-4">
        {slides.map((slide) => (
          <article key={slide.id} className="ak-card overflow-hidden">
            <div
              className="flex min-h-[150px] flex-col justify-end gap-2 p-4"
              style={{
                background: `linear-gradient(135deg, ${slide.gradient_from}, ${slide.gradient_to})`,
                color: slide.text_color,
              }}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="max-w-2xl">
                  <p className="text-[11px] font-bold uppercase tracking-[0.15em]" style={{ color: slide.accent_color }}>
                    {slide.eyebrow || 'HOMEPAGE HERO'}
                  </p>
                  <h3 className="mt-2 text-2xl font-bold leading-tight">{slide.title}</h3>
                  <p className="mt-2 max-w-xl text-sm opacity-85">{slide.subtitle}</p>
                </div>
                <Badge label={slide.status_label} variant={slideStatusVariant(slide.status)} />
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3 text-xs opacity-90">
                <span>CTA: {slide.cta_label || 'Shop now'} {'->'} {slide.cta_href || '/shop'}</span>
                <span>Image: {slide.image_url || 'No image'}</span>
                <span>{scheduleLabel(slide)}</span>
              </div>
            </div>

            <div className="grid gap-4 p-4 lg:grid-cols-[1fr_180px]">
              <SlideForm slide={slide} linkData={linkData} palette={palette} />
              <div className="flex flex-col gap-2">
                <Link className="ak-btn-secondary justify-center" href={storefrontHref(slide.cta_href || '/')} target="_blank">
                  <Eye size={13} />
                  Preview link
                </Link>
                {slide.status === 'live' ? (
                  <form data-manage action={pauseSlideAction}>
                    <input type="hidden" name="id" value={slide.id} />
                    <button className="ak-btn-secondary w-full justify-center" type="submit">
                      <PauseCircle size={13} />
                      Pause
                    </button>
                  </form>
                ) : (
                  <form data-manage action={publishSlideAction}>
                    <input type="hidden" name="id" value={slide.id} />
                    <button className="ak-btn-secondary w-full justify-center" type="submit">
                      <CheckCircle2 size={13} />
                      Publish
                    </button>
                  </form>
                )}
                <DeleteSlideButton id={slide.id} action={deleteSlideAction} />
              </div>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}

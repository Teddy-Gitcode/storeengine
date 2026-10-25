import { getDeals } from '@/lib/admin-api';
import ResourceList from '@/components/sellzy/resource-list';
import { StatusPill } from '@/components/sellzy/product-ui';
import type { ResourceField } from '@/components/sellzy/resource-form';
import type { AdminDeal, AdminProduct } from '@/lib/admin-types';
import type { LinkCategory } from '@/app/content/CtaLinkField';

/* Flash sales and featured deals are one resource with two kinds; the
   clearance list is those same deals once they have ended. */

export type DealKind = 'flash' | 'featured';

export const DEAL_META: Record<DealKind, { route: string; title: string; create: string }> = {
  flash: { route: '/flash-sales', title: 'Flash Sales', create: 'Create Flash' },
  featured: { route: '/featured-deal', title: 'Featured Deal', create: 'Create Deal' },
};

const DEAL_TYPES = [
  { value: 'promo', label: 'Promo' },
  { value: 'bogo', label: 'BOGO' },
];

const STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'ended', label: 'Ended' },
];

/* The header pill on the add/edit form. Live and Paused lead because those are
   the two a merchant reaches for while a sale is running — only `active` puts
   the deal in front of shoppers, and Paused pulls it straight back off. */
export const DEAL_STATUS_PILL = {
  name: 'status',
  publishedValue: 'active',
  options: [
    { value: 'active', label: 'Live' },
    { value: 'paused', label: 'Paused' },
    { value: 'draft', label: 'Draft' },
    { value: 'scheduled', label: 'Scheduled' },
    { value: 'ended', label: 'Ended' },
  ],
};

function toneFor(status: string) {
  if (status === 'active') return 'success' as const;
  if (status === 'scheduled') return 'info' as const;
  if (status === 'paused') return 'warning' as const;
  return 'neutral' as const;
}

/** `datetime-local` needs `YYYY-MM-DDTHH:mm`, not a full ISO string. */
function toLocalInput(value: string | null) {
  return value ? value.slice(0, 16) : '';
}

export function dealPayload(kind: DealKind, formData: FormData): Record<string, unknown> | null {
  const title = String(formData.get('title') || '').trim();
  if (!title) return null;
  const starts = String(formData.get('starts_at') || '');
  const ends = String(formData.get('ends_at') || '');
  const productIds = formData
    .getAll('product_ids')
    .flatMap((v) => String(v).split(','))
    .map((v) => Number(v.trim()))
    .filter((v) => Number.isFinite(v) && v > 0);
  return {
    title,
    kind,
    deal_type: String(formData.get('deal_type') || 'promo'),
    discount_percent: String(formData.get('discount_percent') || '0'),
    status: String(formData.get('status') || 'draft'),
    starts_at: starts ? new Date(starts).toISOString() : null,
    ends_at: ends ? new Date(ends).toISOString() : null,
    product_ids: productIds,
    headline: text(formData, 'headline'),
    subheadline: text(formData, 'subheadline'),
    badge_label: text(formData, 'badge_label'),
    cta_label: text(formData, 'cta_label'),
    cta_href: text(formData, 'cta_href'),
    gradient_from: hex(formData, 'gradient_from'),
    gradient_to: hex(formData, 'gradient_to'),
    text_color: hex(formData, 'text_color'),
    accent_color: hex(formData, 'accent_color'),
  };
}

function text(formData: FormData, name: string): string {
  return String(formData.get(name) || '').trim();
}

/** Normalises `#abc123`/`abc123` and drops anything that isn't a hex colour,
    so a typo saves as blank (= keep the default) rather than breaking the CSS. */
function hex(formData: FormData, name: string): string {
  const raw = text(formData, name).replace(/^#/, '');
  return /^[0-9a-fA-F]{6}$/.test(raw) ? `#${raw.toUpperCase()}` : '';
}

export function dealFields(
  kind: DealKind,
  products: AdminProduct[],
  deal?: AdminDeal,
  categories: LinkCategory[] = [],
): ResourceField[] {
  const fields: ResourceField[] = [
    { kind: 'text', name: 'title', label: 'Title', defaultValue: deal?.title, required: true, half: true },
    { kind: 'number', name: 'discount_percent', label: 'Discount (%)', defaultValue: deal?.discount_percent ?? 0, half: true },
    // Must be datetime-local, not date: `toLocalInput` yields "YYYY-MM-DDTHH:mm",
    // which a date input silently refuses to display — leaving the field blank
    // and wiping the schedule on the next save.
    { kind: 'datetime-local', name: 'starts_at', label: 'Start Date', defaultValue: toLocalInput(deal?.starts_at ?? null), half: true },
    { kind: 'datetime-local', name: 'ends_at', label: 'End Date', defaultValue: toLocalInput(deal?.ends_at ?? null), half: true },
  ];
  // Status lives in the header pill (DEAL_STATUS_PILL), not down here — two
  // inputs named `status` in one form would fight over the payload.
  if (kind === 'featured') {
    fields.push({ kind: 'select', name: 'deal_type', label: 'Deal Type', defaultValue: deal?.deal_type ?? 'promo', options: DEAL_TYPES, half: true });
  }
  fields.push({
    kind: 'multiselect',
    name: 'product_ids',
    label: 'Products',
    defaultValue: (deal?.products ?? []).map((p) => p.id),
    options: products.map((p) => ({ value: p.id, label: p.name })),
    hint:
      kind === 'flash'
        ? 'These fill the storefront’s deals shelf, in this order. Pick at least two so the shelf has a spotlight and a scroller.'
        : 'These appear on the offers page as featured deals.',
  });

  /* Appearance — every one of these is optional. Blank means the storefront
     keeps the copy and palette the section ships with, so an existing deal
     looks exactly as it did before these fields existed. */
  const look = LOOK_DEFAULTS[kind];
  fields.push(
    { kind: 'text', name: 'headline', label: 'Section Headline', defaultValue: deal?.headline, half: true, hint: `Shown above the shelf. Default: “${look.headline}”.` },
    { kind: 'text', name: 'badge_label', label: 'Badge Label', defaultValue: deal?.badge_label, half: true, hint: `The seal on the left of the shelf. Default: “${look.badge}”.` },
    { kind: 'text', name: 'subheadline', label: 'Section Subheadline', defaultValue: deal?.subheadline, hint: `Small line under the headline. Default: “${look.sub}”.` },
    { kind: 'text', name: 'cta_label', label: 'Link Label', defaultValue: deal?.cta_label, half: true, hint: `Default: “${look.cta}”.` },
    {
      kind: 'link',
      name: 'cta_href',
      label: 'Link goes to',
      defaultValue: deal?.cta_href ?? '',
      categories,
      products: products.map((p) => ({ id: p.id, name: p.name })),
      noneLabel: `Default (${look.href})`,
    },
    { kind: 'color', name: 'gradient_from', label: 'Background From', defaultValue: deal?.gradient_from, placeholder: look.from, half: true },
    { kind: 'color', name: 'gradient_to', label: 'Background To', defaultValue: deal?.gradient_to, placeholder: look.to, half: true },
    { kind: 'color', name: 'text_color', label: 'Text Colour', defaultValue: deal?.text_color, placeholder: look.text, half: true },
    { kind: 'color', name: 'accent_color', label: 'Accent Colour', defaultValue: deal?.accent_color, placeholder: look.accent, half: true, hint: 'Prices, countdown and the badge outline.' },
  );
  return fields;
}

/* Mirrors the storefront's own fallbacks (FlashSaleRow.tsx / offers page), so
   the placeholders tell the truth about what an empty field renders as. */
const LOOK_DEFAULTS: Record<DealKind, Record<'headline' | 'sub' | 'badge' | 'cta' | 'href' | 'from' | 'to' | 'text' | 'accent', string>> = {
  flash: {
    headline: "Today's deals",
    sub: 'Hand-picked deals · while stocks last',
    badge: 'Flash Deal',
    cta: 'See all',
    href: '/offers',
    from: '#085041',
    to: '#0F6E56',
    text: '#FFFFFF',
    accent: '#FCD96A',
  },
  featured: {
    headline: 'Featured deals',
    sub: 'Picked by us, priced for you',
    badge: 'Featured',
    cta: 'See all',
    href: '/offers',
    from: '#085041',
    to: '#0F6E56',
    text: '#FFFFFF',
    accent: '#FCD96A',
  },
};

export default async function DealListPage({
  kind,
  deleteAction,
}: {
  kind: DealKind;
  deleteAction: (formData: FormData) => Promise<{ error?: string } | void>;
}) {
  const meta = DEAL_META[kind];
  const page = await getDeals({ kind }).catch(() => null);
  const deals = page?.results ?? [];

  return (
    <ResourceList
      title={meta.title}
      createHref={`${meta.route}/add`}
      createLabel={meta.create}
      columns={[
        { key: 'id', label: 'ID' },
        { key: 'title', label: 'Title' },
        ...(kind === 'flash'
          ? [{ key: 'products', label: 'Products' }]
          : [{ key: 'product', label: 'Product' }, { key: 'deal_type', label: 'Deal Type' }]),
        { key: 'discount', label: 'Discount' },
        { key: 'start', label: 'Start Date' },
        { key: 'end', label: 'End Date' },
        { key: 'status', label: 'Status' },
      ]}
      statusFilter={{ label: 'All status', options: STATUSES }}
      rows={deals.map((d) => ({
        id: d.id,
        search: `${d.title} ${d.products.map((p) => p.name).join(' ')}`,
        status: d.status,
        cells: {
          id: <span className="whitespace-nowrap">#{d.id}</span>,
          title: <span className="font-semibold text-light-primary-text">{d.title}</span>,
          products: <span className="font-dm-sans">{d.product_count}</span>,
          product: d.products[0]?.name ?? '—',
          deal_type: d.deal_type_label,
          discount: <span className="font-dm-sans">{d.discount_percent}%</span>,
          start: <span className="whitespace-nowrap">{d.starts_at ? new Date(d.starts_at).toLocaleDateString() : '—'}</span>,
          end: <span className="whitespace-nowrap">{d.ends_at ? new Date(d.ends_at).toLocaleDateString() : '—'}</span>,
          status: <StatusPill label={d.status_label} tone={toneFor(d.status)} />,
        },
      }))}
      editHrefBase={`${meta.route}/edit`}
      deleteAction={deleteAction}
      emptyMessage={`No ${meta.title.toLowerCase()} yet.`}
    />
  );
}

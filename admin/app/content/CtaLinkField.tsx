'use client';

import { useMemo, useRef, useState } from 'react';
import { ImagePlus } from 'lucide-react';

/** `image` lets the picker offer that category's picture to a MediaUrlField. */
export type LinkCategory = { slug: string; name: string; image?: string };
export type LinkProduct = { id: number; name: string };
type Cat = LinkCategory;
type Prod = LinkProduct;

type Mode = 'none' | 'shop' | 'offers' | 'category' | 'products' | 'custom';

function parseInitial(href: string, allowNone: boolean): { mode: Mode; category: string; ids: number[]; custom: string } {
  if (href === '' && allowNone) return { mode: 'none', category: '', ids: [], custom: '' };
  if (href === '/shop' || href === '') return { mode: 'shop', category: '', ids: [], custom: '' };
  if (href === '/offers') return { mode: 'offers', category: '', ids: [], custom: '' };
  if (href.startsWith('/shop/')) return { mode: 'category', category: href.slice(6), ids: [], custom: '' };
  if (href.startsWith('/collection?ids=')) {
    const ids = href
      .slice('/collection?ids='.length)
      .split(',')
      .map(Number)
      .filter(Number.isFinite);
    return { mode: 'products', category: '', ids, custom: '' };
  }
  return { mode: 'custom', category: '', ids: [], custom: href };
}

/**
 * Link destination picker — hero slides, deals and promo popups. Writes a
 * single value (`name`, default `cta_href`) that the storefront and mobile app
 * both understand:
 *  /shop · /offers · /shop/<category> · /collection?ids=1,2,3 · custom URL.
 *
 * `noneLabel` adds a first choice that submits an empty value — for fields
 * where blank means something (a deal's default link, a popup with no link).
 * `pictureTarget` names a MediaUrlField in the same form: picking a category
 * that has a picture then offers to put it there.
 */
export default function CtaLinkField({
  defaultValue,
  categories,
  products,
  name = 'cta_href',
  label = 'CTA destination',
  noneLabel,
  pictureTarget,
}: {
  defaultValue: string;
  categories: Cat[];
  products: Prod[];
  name?: string;
  label?: string;
  noneLabel?: string;
  pictureTarget?: string;
}) {
  const allowNone = Boolean(noneLabel);
  const initial = useMemo(
    () => parseInitial(defaultValue || (allowNone ? '' : '/shop'), allowNone),
    [defaultValue, allowNone],
  );
  const root = useRef<HTMLDivElement>(null);
  const [usedPicture, setUsedPicture] = useState('');
  const [mode, setMode] = useState<Mode>(initial.mode);
  const [category, setCategory] = useState(initial.category || categories[0]?.slug || '');
  const [ids, setIds] = useState<number[]>(initial.ids);
  const [custom, setCustom] = useState(initial.custom);
  /* The catalogue is 80-plus lines long — without a filter the picker is a
     scroll hunt. */
  const [productQuery, setProductQuery] = useState('');
  const needle = productQuery.trim().toLowerCase();
  const shownProducts = needle
    ? products.filter((p) => p.name.toLowerCase().includes(needle))
    : products;

  const href =
    mode === 'none' ? ''
    : mode === 'shop' ? '/shop'
    : mode === 'offers' ? '/offers'
    : mode === 'category' ? `/shop/${category}`
    : mode === 'products' ? `/collection?ids=${ids.join(',')}`
    : custom;

  const picked = mode === 'category' ? categories.find((c) => c.slug === category) : undefined;

  function usePicture(url: string) {
    // Scoped to this form: the slides page holds several slide forms at once.
    root.current?.closest('form')?.dispatchEvent(
      new CustomEvent('use-picture', { detail: { name: pictureTarget, url } }),
    );
    setUsedPicture(url);
  }

  function toggleId(id: number) {
    setIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  return (
    <div ref={root} className="space-y-1 md:col-span-2">
      <p className="text-[11px] font-semibold font-public-sans uppercase tracking-wide text-light-secondary-text">
        {label}
      </p>
      <input type="hidden" name={name} value={href} />
      <div className="flex flex-wrap gap-2">
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as Mode)}
          className="h-10 rounded-full border border-gray-500/20 bg-surface pl-4 pr-9 text-sm font-public-sans text-light-primary-text focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
        >
          {noneLabel && <option value="none">{noneLabel}</option>}
          <option value="shop">All products</option>
          <option value="category">A category</option>
          <option value="products">Hand-picked products</option>
          <option value="offers">Offers page</option>
          <option value="custom">Custom URL</option>
        </select>

        {mode === 'category' && (
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="h-10 rounded-full border border-gray-500/20 bg-surface pl-4 pr-9 text-sm font-public-sans text-light-primary-text focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
          >
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>{c.name}</option>
            ))}
          </select>
        )}

        {mode === 'custom' && (
          <input
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder="/shop or https://…"
            className="flex-1 min-w-[220px] h-10 rounded-full border border-gray-500/20 bg-surface px-4 text-sm font-public-sans text-light-primary-text focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
          />
        )}
      </div>

      {mode === 'products' && (
        <div className="mt-1 rounded-2xl border border-gray-500/20 bg-surface p-3">
          <input
            type="text"
            value={productQuery}
            onChange={(e) => setProductQuery(e.target.value)}
            placeholder="Search products…"
            aria-label="Search products"
            className="mb-2 h-8 w-full rounded-full border border-gray-500/20 px-3 text-xs font-public-sans text-light-primary-text focus:border-primary focus:outline-none"
          />
          <div className="max-h-40 overflow-y-auto space-y-1">
          {shownProducts.length === 0 && (
            <p className="py-1 text-[11px] font-public-sans text-light-secondary-text">Nothing matches “{productQuery}”.</p>
          )}
          {shownProducts.map((p) => (
            <label key={p.id} className="flex items-center gap-2 text-sm font-public-sans text-light-primary-text">
              <input
                type="checkbox"
                checked={ids.includes(p.id)}
                onChange={() => toggleId(p.id)}
                className="h-3.5 w-3.5"
              />
              {p.name}
            </label>
          ))}
          </div>
          <p className="text-[11px] font-public-sans pt-1 text-light-secondary-text">
            {ids.length} selected — mix products from any categories.
          </p>
        </div>
      )}

      {pictureTarget && picked?.image && usedPicture !== picked.image && (
        <button
          type="button"
          onClick={() => usePicture(picked.image!)}
          className="mt-1 inline-flex items-center gap-2 rounded-full border border-gray-500/20 bg-surface py-1 pl-1 pr-3 text-xs font-bold font-public-sans text-light-primary-text hover:border-primary"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={picked.image} alt="" className="h-6 w-6 rounded-full object-cover" />
          <ImagePlus size={13} /> Use {picked.name}&apos;s picture
        </button>
      )}
      <p className="text-[11px] font-public-sans text-light-secondary-text">Link: <span className="font-mono">{href || '—'}</span></p>
    </div>
  );
}

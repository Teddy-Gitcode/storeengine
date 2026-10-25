'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowRight, ArrowUp, BarChart2, CornerDownLeft, CreditCard, HelpCircle, Home, Image, Inbox, KeyRound, Layers, Megaphone, MessageCircle, Package, Percent, Receipt, RotateCcw, ScrollText, Search, Settings, ShieldCheck, ShoppingBag, Star, Tag, Truck, Users, Warehouse, Zap } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { canOpen, type Viewer } from '@/lib/admin-access';

type Item = {
  id: string;
  label: string;
  meta?: string;
  href: string;
  icon: LucideIcon;
  group: string;
};

/* Labels and destinations mirror the sidebar, so the palette and the nav can
   never disagree about where something lives. "Refunds" and "Returns" were two
   palette rows onto one refund queue, and "Inventory" pointed at Stock Products
   while the nav's Manage Inventory is a different page — both now resolve one
   way only. The fulfilment queues carry their stage number here too, so
   searching "dispatch" lands on the stage rather than on a page that merely
   mentions it. */
const pages: Item[] = [
  { id: 'p-home',      label: 'Dashboard',            href: '/',                        icon: Home,          group: 'Pages' },
  { id: 'p-orders',    label: 'All Orders',           href: '/orders',                  icon: ShoppingBag,   group: 'Orders' },
  { id: 'p-transactions', label: 'Transactions',      href: '/orders/transactions',     icon: CreditCard,    group: 'Orders' },
  { id: 'p-finance-q', label: '1 · Payments to verify', href: '/finance-queue',         icon: CreditCard,    group: 'Fulfilment' },
  { id: 'p-warehouse', label: '2 · To pack',          href: '/warehouse',               icon: Package,       group: 'Fulfilment' },
  { id: 'p-logistics', label: '3 · To dispatch',      href: '/logistics',               icon: Truck,         group: 'Fulfilment' },
  { id: 'p-transit',   label: '4 · In transit',       href: '/in-transit',              icon: Truck,         group: 'Fulfilment' },
  { id: 'p-shipping',  label: 'Shipments',            href: '/shipping',                icon: Truck,         group: 'Fulfilment' },
  { id: 'p-products',  label: 'All Products',         href: '/products',                icon: Package,       group: 'Catalog' },
  { id: 'p-reviews',   label: 'Product Reviews',      href: '/products/review',         icon: Package,       group: 'Catalog' },
  { id: 'p-categories',label: 'Categories',           href: '/categories',              icon: Tag,           group: 'Catalog' },
  { id: 'p-stocks',    label: 'Stock Levels',         href: '/products/stocks',         icon: Package,       group: 'Catalog' },
  { id: 'p-purchasing',label: 'Manage Inventory',     href: '/inventory',               icon: Package,       group: 'Catalog' },
  { id: 'p-warehouses',label: 'Warehouses',           href: '/inventory/warehouses',    icon: Warehouse,     group: 'Catalog' },
  { id: 'p-wh-add',    label: 'Add Warehouse',        href: '/inventory/warehouses/add',icon: Warehouse,     group: 'Catalog' },
  { id: 'p-suppliers', label: 'Suppliers',            href: '/inventory/suppliers',     icon: Truck,         group: 'Catalog' },
  { id: 'p-drafts',    label: 'Draft Products',       href: '/products/drafts',         icon: Package,       group: 'Catalog' },
  { id: 'p-brands',    label: 'Brand List',           href: '/categories/brands',       icon: Tag,           group: 'Catalog' },
  { id: 'p-tags',      label: 'Tag List',             href: '/categories/tags',         icon: Tag,           group: 'Catalog' },
  { id: 'p-attrs',     label: 'Attribute List',       href: '/categories/attributes',   icon: Layers,        group: 'Catalog' },
  { id: 'p-customers', label: 'Customers',            href: '/customers',               icon: Users,         group: 'People' },
  { id: 'p-inbox',     label: 'Support Inbox',        href: '/inbox',                   icon: Inbox,         group: 'People' },
  { id: 'p-staff',     label: 'Users',                href: '/users',                   icon: Users,         group: 'People' },
  { id: 'p-admins',    label: 'Admin',                href: '/admin-users',             icon: ShieldCheck,   group: 'People' },
  { id: 'p-roles',     label: 'Roles',                href: '/roles',                   icon: KeyRound,      group: 'People' },
  { id: 'p-coupon',    label: 'Coupon',               href: '/coupon',                  icon: Tag,           group: 'Marketing' },
  { id: 'p-marketing', label: 'Marketing Tools',      href: '/marketing-tools',         icon: Megaphone,     group: 'Marketing' },
  { id: 'p-assistant', label: 'Customer Assistant',   href: '/assistant',               icon: Settings,      group: 'Settings' },
  { id: 'p-homepage',  label: 'Home Page Control',    href: '/home-page-control',       icon: Image,         group: 'Marketing' },
  { id: 'p-content',   label: 'Storefront Content',   href: '/content',                 icon: Image,         group: 'Marketing' },
  { id: 'p-flash',     label: 'Flash Sales',          href: '/flash-sales',             icon: Zap,           group: 'Marketing' },
  { id: 'p-featured',  label: 'Featured Deal',        href: '/featured-deal',           icon: Star,          group: 'Marketing' },
  { id: 'p-clearance', label: 'Clearance Deal',       href: '/clearance-sale',          icon: Percent,       group: 'Marketing' },
  { id: 'p-popup',     label: 'Promo Popup',          href: '/promo-popup',             icon: Megaphone,     group: 'Marketing' },
  { id: 'p-faq',       label: 'FAQ',                  href: '/faq',                     icon: HelpCircle,    group: 'Content' },
  { id: 'p-privacy',   label: 'Privacy Policy',       href: '/privacy-and-policy',      icon: ShieldCheck,   group: 'Content' },
  { id: 'p-terms',     label: 'Terms & Condition',    href: '/terms-and-conditions',    icon: ScrollText,    group: 'Content' },
  { id: 'p-groups',    label: 'Category Groups',      href: '/category-groups',         icon: Layers,        group: 'Content' },
  { id: 'p-analytics', label: 'Sales reports',        href: '/sales-reports',           icon: BarChart2,     group: 'Reports' },
  { id: 'p-finance',   label: 'Earning',              href: '/earning',                 icon: CreditCard,    group: 'Reports' },
  { id: 'p-refunds',   label: 'Refunds',              href: '/refunds',                 icon: RotateCcw,     group: 'Reports' },
  { id: 'p-settings',  label: 'General Settings',     href: '/settings/general',        icon: Settings,      group: 'Settings' },
  { id: 'p-shopset',   label: 'Shop Settings',        href: '/settings/shop',           icon: Settings,      group: 'Settings' },
  { id: 'p-seo',       label: 'SEO Settings',         href: '/settings/seo',            icon: Search,        group: 'Settings' },
  { id: 'p-maint',     label: 'Maintenance Settings', href: '/settings/maintenance',    icon: Settings,      group: 'Settings' },
  { id: 'p-paymethod', label: 'Payment Methods',      href: '/payment-method',          icon: CreditCard,    group: 'Settings' },
  { id: 'p-payapi',    label: 'Payment API',          href: '/settings/payment-api',    icon: CreditCard,    group: 'Settings' },
  { id: 'p-tax',       label: 'Tax',                  href: '/tax',                     icon: Receipt,       group: 'Settings' },
];

export default function CommandPalette({
  open,
  onClose,
  viewer = null,
}: {
  open: boolean;
  onClose: () => void;
  /** Filters the list to pages the signed-in role can open, as the sidebar does. */
  viewer?: Viewer;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [focus, setFocus] = useState(0);

  const allowed = useMemo(() => pages.filter((p) => canOpen(viewer, p.href)), [viewer]);

  const items = useMemo<Item[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allowed;
    return allowed.filter(
      (i) =>
        i.label.toLowerCase().includes(q) ||
        i.group.toLowerCase().includes(q),
    ).slice(0, 24);
  }, [query, allowed]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setFocus(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  useEffect(() => { setFocus(0); }, [query]);

  useEffect(() => {
    if (!open) return;
    const fn = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
      if (e.key === 'ArrowDown') { e.preventDefault(); setFocus((f) => Math.min(f + 1, items.length - 1)); }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setFocus((f) => Math.max(f - 1, 0)); }
      if (e.key === 'Enter') {
        e.preventDefault();
        const t = items[focus];
        if (t) { router.push(t.href); onClose(); }
      }
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [open, items, focus, onClose, router]);

  if (!open) return null;

  const grouped: Record<string, Item[]> = {};
  items.forEach((i) => { (grouped[i.group] ||= []).push(i); });

  let runningIndex = 0;

  return (
    <div className="ak-cmdk-overlay" onClick={onClose}>
      <div className="ak-cmdk" onClick={(e) => e.stopPropagation()}>
        <div className="ak-cmdk-input-wrap">
          <Search size={16} style={{ color: 'var(--text-3)' }} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search orders, products, customers, discounts…"
            className="ak-cmdk-input"
            aria-label="Search the admin"
          />
          <span className="kbd" style={{
            fontFamily: 'var(--font-ibm-mono)', fontSize: 10, padding: '2px 6px',
            background: 'var(--surface-2)', border: '1px solid var(--border)',
            borderRadius: 4, color: 'var(--text-3)',
          }}>esc</span>
        </div>

        <div className="ak-cmdk-body" role="listbox" aria-label="Commands">
          {items.length === 0 && (
            <div className="ak-cmdk-empty">
              <p>No results for &ldquo;{query}&rdquo;</p>
              <p style={{ fontSize: 11, marginTop: 4 }}>Try an order ID, customer name, or SKU.</p>
            </div>
          )}
          {Object.entries(grouped).map(([group, groupItems]) => (
            <div key={group}>
              <p className="ak-cmdk-section-label">{group}</p>
              {groupItems.map((it) => {
                const idx = runningIndex++;
                const Icon = it.icon;
                return (
                  <div
                    key={it.id}
                    role="option"
                    aria-selected={idx === focus}
                    className={`ak-cmdk-item ${idx === focus ? 'is-focused' : ''}`}
                    onMouseEnter={() => setFocus(idx)}
                    onClick={() => { router.push(it.href); onClose(); }}
                  >
                    <span className="icon-wrap"><Icon size={13} /></span>
                    <span className="truncate">{it.label}</span>
                    {it.meta && <span className="meta truncate" style={{ maxWidth: 180 }}>{it.meta}</span>}
                    {idx === focus && <ArrowRight size={13} style={{ color: 'inherit', marginLeft: 8 }} />}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        <div className="ak-cmdk-footer">
          <span className="flex items-center gap-1.5">
            <span className="kbd"><ArrowUp size={9} style={{ display: 'inline' }} /></span>
            <span className="kbd"><ArrowDown size={9} style={{ display: 'inline' }} /></span> navigate
          </span>
          <span className="flex items-center gap-1.5"><span className="kbd"><CornerDownLeft size={9} style={{ display: 'inline' }} /></span> open</span>
          <span className="flex items-center gap-1.5"><span className="kbd">esc</span> close</span>
          <span className="ml-auto" style={{ fontFamily: 'var(--font-ibm-mono)' }}>{items.length} result{items.length !== 1 ? 's' : ''}</span>
        </div>
      </div>
    </div>
  );
}

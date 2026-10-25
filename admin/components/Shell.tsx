'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart2, Bell, BellRing, Boxes, ChevronDown, ChevronLeft, ChevronRight, CreditCard, FileText,
  Flame, HelpCircle, Home, Image as ImageIcon, Inbox, KeyRound, Layers, LogOut, Megaphone,
  Menu, Package, PackageCheck, Percent, Receipt, RotateCcw, ScrollText, Search, Settings,
  ShieldCheck, ShoppingBag, Star, Store as StoreIcon, Tag, TrendingUp, Truck, UserRound,
  Users, Wallet, Warehouse, X, Zap,
} from 'lucide-react';
import clsx from 'clsx';
import { AREAS, areaForHref, canAccess, canOpen, levelForPath, type Viewer } from '@/lib/admin-access';
import { AccessProvider } from './AccessContext';
import CommandPalette from './CommandPalette';
import NotificationsDrawer from './NotificationsDrawer';
import ThemeToggle from './ThemeToggle';

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number | string; className?: string }>;
  children?: { href: string; label: string }[];
};

/* Which backend queue each fulfilment page lists, so its badge counts the same
   orders the page will show. The names are the API's own (?queue=). */
const QUEUE_OF: Record<string, string> = {
  '/finance-queue': 'finance',
  '/warehouse': 'warehouse',
  '/logistics': 'logistics',
  '/in-transit': 'transit',
};
type NavGroup = { label: string; items: NavItem[] };

/* Section names and item order follow the Sellzy template the admin is a
   parity build of, because that is the map merchants are handed screenshots
   of. The previous pass regrouped by "the job staff do" and, in doing so,
   folded five content pages behind one "Storefront Pages" accordion and the
   warehouse list behind a "Stock" one — accordions render collapsed, so FAQ,
   Terms & Condition and Warehouses were reachable only by knowing they were
   there. Anything a merchant is looking for by name is a flat item now; only
   lists that are genuinely tabs of one screen stay nested. */
const navGroups: NavGroup[] = [
  {
    label: '',
    items: [{ href: '/', label: 'Dashboard', icon: Home }],
  },
  {
    label: 'Product Management',
    items: [
      {
        href: '/products', label: 'Manage Product', icon: Package,
        children: [
          { href: '/products', label: 'All Products' },
          { href: '/products/drafts', label: 'Draft Products' },
          { href: '/products/stocks', label: 'Stock Products' },
          { href: '/products/review', label: 'Product Review' },
        ],
      },
      {
        href: '/categories', label: 'Categories & Attributes', icon: Layers,
        children: [
          { href: '/categories', label: 'Category List' },
          { href: '/categories/attributes', label: 'Attribute List' },
          { href: '/categories/tags', label: 'Tag List' },
          { href: '/categories/brands', label: 'Brand List' },
        ],
      },
      { href: '/inventory', label: 'Manage Inventory', icon: Boxes },
      // Flat, not a sub-link: stock rows carry a warehouse, so "where is it
      // kept" has to be answerable before the first product is received.
      { href: '/inventory/warehouses', label: 'Warehouses', icon: Warehouse },
      { href: '/inventory/suppliers', label: 'Suppliers', icon: Truck },
    ],
  },
  {
    // The fulfilment queues are one pipeline — the backend routes an order from
    // stage to stage (apps/orders/views.py ORDER_QUEUES) — so they are numbered
    // in the order work moves through them. Shipments belongs with them because
    // dispatching writes the shipment the customer then tracks.
    label: 'Order Management',
    items: [
      {
        href: '/orders', label: 'Orders', icon: ShoppingBag,
        children: [
          { href: '/orders', label: 'All Orders' },
          { href: '/orders/abandon-cart', label: 'Abandoned Cart' },
        ],
      },
      {
        href: '/finance-queue', label: 'Fulfilment', icon: PackageCheck,
        children: [
          { href: '/finance-queue', label: '1 · Payments to verify' },
          { href: '/warehouse', label: '2 · To pack' },
          { href: '/logistics', label: '3 · To dispatch' },
          { href: '/in-transit', label: '4 · In transit' },
          { href: '/shipping', label: 'Shipments' },
        ],
      },
      // A refund is something you do to an order, and staff arrive at it from
      // one — not from the ledger, which is why it sits here and not in Finance.
      { href: '/refunds', label: 'Refunds', icon: RotateCcw },
      { href: '/orders/transactions', label: 'Transactions', icon: Wallet },
    ],
  },
  {
    label: 'User Management',
    items: [
      { href: '/customers', label: 'Customer', icon: UserRound },
      // /users and /admin-users are the same staff list split on is_superuser
      // (components/sellzy/staff-pages.tsx), which is why they sit together.
      { href: '/users', label: 'Users', icon: Users },
      { href: '/admin-users', label: 'Admin', icon: ShieldCheck },
      { href: '/roles', label: 'Roles', icon: KeyRound },
    ],
  },
  {
    label: 'Marketing',
    items: [
      { href: '/coupon', label: 'Coupon', icon: Tag },
      { href: '/flash-sales', label: 'Flash Sales', icon: Zap },
      { href: '/featured-deal', label: 'Featured Deal', icon: Star },
      { href: '/clearance-sale', label: 'Clearance Deal', icon: Percent },
      { href: '/push', label: 'Push Notifications', icon: BellRing },
    ],
  },
  {
    // Everything the shopper reads. Flat, in the template's order — these are
    // the pages a merchant goes looking for by name on day one.
    label: 'Content Management',
    items: [
      { href: '/home-page-control', label: 'Home Page Control', icon: ImageIcon },
      { href: '/category-groups', label: 'Category Groups', icon: Layers },
      { href: '/promo-popup', label: 'Promo Popup', icon: Megaphone },
      { href: '/faq', label: 'FAQ', icon: HelpCircle },
      { href: '/privacy-and-policy', label: 'Privacy Policy', icon: ShieldCheck },
      { href: '/terms-and-conditions', label: 'Terms & Condition', icon: ScrollText },
    ],
  },
  {
    // Both halves are "a person is waiting on us".
    // One entry, because there is one inbox: /support was the same tickets in a
    // table and now redirects here.
    label: 'Help & Support',
    items: [
      { href: '/inbox', label: 'Support Inbox', icon: Inbox },
    ],
  },
  {
    // /earning lists payments, not a separate earnings concept — named for what
    // the page shows.
    label: 'Reports & Analytics',
    items: [
      { href: '/sales-reports', label: 'Sales Reports', icon: BarChart2 },
      { href: '/top-products', label: 'Top Products & Categories', icon: TrendingUp },
      { href: '/earning', label: 'Payments', icon: CreditCard },
      { href: '/tax', label: 'Tax', icon: Receipt },
    ],
  },
  {
    // Store Setup leads: it is the wizard a new merchant runs before any of the
    // individual settings pages mean anything.
    label: 'Settings',
    items: [
      // Ten entries became two. Five of the old ones were the same page with a
      // different tab selected, and three of those edited the same fields.
      { href: '/settings', label: 'Store Settings', icon: Settings },
      { href: '/payment-method', label: 'Payment Methods', icon: Wallet },
      {
        href: '/system', label: 'System Configuration', icon: Flame,
        children: [
          { href: '/system', label: 'Integrations' },
          { href: '/system?tab=credentials', label: 'Credentials' },
          { href: '/firebase', label: 'Firebase' },
          { href: '/assistant', label: 'Customer Assistant' },
          { href: '/marketing-tools', label: 'Marketing Tools' },
        ],
      },
    ],
  },
];

// Height of one sub-nav row (py-2 + text-sm's 20px line box), which the
// teal progress overlay multiplies to reach the row you are on.
const CHILD_ROW_PX = 36;

// Every navigable href (parents + children), longest-first, for active matching.
const allHrefs = navGroups
  .flatMap((g) => g.items.flatMap((i) => [i.href, ...(i.children?.map((c) => c.href) ?? [])]))
  .filter((h, i, a) => a.indexOf(h) === i)
  .sort((a, b) => b.length - a.length);

function activeHref(pathname: string): string | undefined {
  if (pathname === '/') return '/';
  return allHrefs.find((h) => h !== '/' && (pathname === h || pathname.startsWith(h + '/'))) ?? allHrefs.find((h) => h === pathname);
}

function itemLabelFor(href: string | undefined): string {
  for (const g of navGroups) {
    for (const i of g.items) {
      if (i.href === href) return i.label;
      const c = i.children?.find((c) => c.href === href);
      if (c) return c.label;
    }
  }
  return 'Overview';
}

function NoAccess({ viewer, pathname }: { viewer: Viewer; pathname: string }) {
  const area = AREAS.find((a) => a.key === areaForHref(pathname));
  const needs = levelForPath(pathname);
  const held = area && viewer ? viewer.access[area.key] : undefined;
  return (
    <div className="mx-auto mt-10 max-w-lg rounded-2xl bg-surface p-8 text-center">
      <span className="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-primary-lighter text-primary-dark">
        <ShieldCheck size={26} aria-hidden />
      </span>
      <h1 className="text-xl font-bold text-light-primary-text font-public-sans">
        {held ? 'Your role can only view this' : 'Your role doesn’t include this page'}
      </h1>
      <p className="mt-2 text-sm text-light-secondary-text font-public-sans">
        {area
          ? held
            ? `${area.label}: your role lets you look but not ${needs === 'manage' ? 'create or change' : 'open'} anything here.`
            : `${area.label} isn’t part of your role${viewer?.roles.length ? ` (${viewer.roles.join(', ')})` : ''}.`
          : 'Admin accounts can only be managed by an admin.'}{' '}
        Ask an admin if you need it.
      </p>
      <div className="mt-6 flex justify-center gap-3">
        {held && area && (
          <Link
            href={pathname.split('/').slice(0, 2).join('/') || '/'}
            className="rounded-full border border-gray-500/25 px-5 py-2 text-sm font-semibold text-light-primary-text hover:border-primary hover:text-primary font-public-sans"
          >
            Back to the list
          </Link>
        )}
        <Link href="/" className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary-dark font-public-sans">
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}

export default function Shell({
  children,
  businessName = 'Store Admin',
  viewer = null,
  queueCounts = null,
}: {
  children: React.ReactNode;
  businessName?: string;
  viewer?: Viewer;
  /** Orders waiting in each fulfilment queue, keyed by the API's queue name. */
  queueCounts?: Record<string, number> | null;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  /* Badge counts what the feed returns minus what this browser has read; the
     drawer owns the same localStorage key. Re-checked when the drawer closes
     so marking things read clears the badge. */
  useEffect(() => {
    if (notifOpen) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/notifications', { cache: 'no-store' });
        const data = await res.json();
        const ids: string[] = (data.results ?? []).map((n: { id: string }) => n.id);
        let read: string[] = [];
        try {
          read = JSON.parse(window.localStorage.getItem('admin-notifications-read') || '[]');
        } catch {
          read = [];
        }
        if (!cancelled) setUnreadCount(ids.filter((id) => !read.includes(id)).length);
      } catch {
        if (!cancelled) setUnreadCount(0);
      }
    })();
    return () => { cancelled = true; };
  }, [notifOpen]);
  const [userOpen, setUserOpen] = useState(false);
  const userRef = useRef<HTMLDivElement>(null);

  const active = useMemo(() => activeHref(pathname), [pathname]);

  // Only the pages the signed-in role can open (lib/admin-access.ts). A parent
  // whose children are all hidden goes too, as does a group left empty.
  const visibleGroups = useMemo(
    () =>
      navGroups
        .map((group) => ({
          ...group,
          items: group.items
            .map((item) =>
              item.children ? { ...item, children: item.children.filter((c) => canOpen(viewer, c.href)) } : item,
            )
            .filter((item) => (item.children ? item.children.length > 0 : canOpen(viewer, item.href))),
        }))
        .filter((group) => group.items.length > 0),
    [viewer],
  );

  // Accordion open-state, keyed by parent href. Auto-open the group holding the
  // active route; the user can still toggle others.
  /* The template's sidebar collapses to an icon rail. Remembered per browser:
     someone who works narrow should not re-collapse it every page load. */
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    try { setCollapsed(localStorage.getItem('ak-sidebar-collapsed') === '1'); } catch { /* private mode */ }
  }, []);
  function toggleCollapsed() {
    setCollapsed((v) => {
      try { localStorage.setItem('ak-sidebar-collapsed', v ? '0' : '1'); } catch { /* private mode */ }
      return !v;
    });
  }

  const [open, setOpen] = useState<Record<string, boolean>>({});
  useEffect(() => {
    const parent = navGroups
      .flatMap((g) => g.items)
      .find((i) => i.children && (i.href === active || i.children.some((c) => c.href === active) ||
        pathname.startsWith(i.href + '/') || pathname === i.href));
    if (parent) setOpen((o) => ({ ...o, [parent.href]: true }));
  }, [active, pathname]);

  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCmdOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, []);

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false);
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  // Chrome-free routes: login and printable invoices.
  if (pathname === '/login' || pathname.endsWith('/invoice')) return <>{children}</>;

  const closeMobile = () => setSidebarOpen(false);

  return (
    <div className="xl:flex min-h-screen bg-[var(--bg)]">
      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside
        className={clsx(
          'h-screen shrink-0 fixed left-0 top-0 z-50 flex flex-col transition-all duration-300 bg-primary-darker',
          collapsed ? 'w-[280px] xl:w-[88px]' : 'w-[280px]',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full xl:translate-x-0',
        )}
      >
        {/* Logo header. The round button straddling the right edge is the
            template's collapse control; ours had a hamburger there instead,
            which is the icon for opening a menu, on a menu that is open. */}
        <div className="px-5 flex items-center gap-2.5 shrink-0 h-[70px] border-b border-white/10 relative">
          <Link
            href="/"
            className={clsx('flex items-center gap-2.5 min-w-0', collapsed && 'xl:justify-center xl:w-full')}
            onClick={closeMobile}
          >
            <span className="size-9 grid place-items-center rounded-lg bg-primary text-white shrink-0">
              <StoreIcon size={19} />
            </span>
            <span className={clsx('font-display font-extrabold text-[17px] text-white truncate', collapsed && 'xl:hidden')}>
              {businessName}
            </span>
          </Link>
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
            aria-expanded={!collapsed}
            className="hidden xl:inline-flex size-10 absolute -right-5 top-1/2 -translate-y-1/2 rounded-full justify-center items-center shadow-md z-50 transition-transform duration-300 bg-white text-[#212529] hover:bg-gray-100"
          >
            <ChevronLeft size={18} className={clsx('transition-transform duration-300', collapsed && 'rotate-180')} />
          </button>
          <button
            className="xl:hidden ml-auto p-1 rounded-md text-white/70 hover:bg-white/10"
            onClick={closeMobile}
            aria-label="Close navigation"
          >
            <X size={20} />
          </button>
        </div>

        {/* Nav */}
        <div className="px-3 py-4 flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar-white">
          {visibleGroups.map((group) => (
            <div key={group.label || 'main'} className="mb-6">
              {group.label && (
                <div className={clsx('text-xs font-medium tracking-wider mb-3 uppercase text-warning-light px-4 transition-all duration-300', collapsed && 'xl:h-0 xl:mb-0 xl:overflow-hidden xl:opacity-0')}>
                  {group.label}
                </div>
              )}
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  if (!item.children) {
                    const isActive = item.href === active;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={closeMobile}
                        title={collapsed ? item.label : undefined}
                        className={clsx(
                          'flex items-center gap-3 py-2 px-4 rounded-lg transition-colors',
                          collapsed && 'xl:justify-center xl:px-0',
                          isActive ? 'bg-primary-dark text-white font-semibold' : 'text-white hover:bg-white/5',
                        )}
                      >
                        <Icon size={20} className="shrink-0" />
                        <span className={clsx('font-medium text-sm whitespace-nowrap truncate', collapsed && 'xl:hidden')}>{item.label}</span>
                      </Link>
                    );
                  }
                  // Accordion item
                  const isOpen = open[item.href] ?? false;
                  const parentActive = pathname === item.href || pathname.startsWith(item.href + '/');
                  const activeChildIndex = item.children.findIndex((c) => c.href === active);
                  return (
                    <div key={item.href}>
                      <button
                        type="button"
                        aria-expanded={isOpen}
                        title={collapsed ? item.label : undefined}
                        onClick={() => {
                          if (collapsed) { toggleCollapsed(); setOpen((o) => ({ ...o, [item.href]: true })); return; }
                          setOpen((o) => ({ ...o, [item.href]: !isOpen }));
                        }}
                        className={clsx(
                          'w-full font-semibold flex items-center justify-between py-2 px-4 rounded-lg transition-colors',
                          collapsed && 'xl:justify-center xl:px-0',
                          parentActive ? 'bg-[#caf8e4] text-[#056d6e]' : 'text-white hover:bg-white/5',
                        )}
                      >
                        <span className={clsx('flex items-center gap-3 min-w-0', collapsed && 'xl:justify-center')}>
                          <Icon size={20} className="shrink-0" />
                          <span className={clsx('font-medium text-sm whitespace-nowrap truncate', collapsed && 'xl:hidden')}>{item.label}</span>
                        </span>
                        <ChevronRight size={15} className={clsx('shrink-0 transition-transform', isOpen && 'rotate-90', collapsed && 'xl:hidden')} />
                      </button>
                      <div className={clsx('grid transition-all duration-300 ease-in-out', collapsed && 'xl:hidden', isOpen ? 'grid-rows-[1fr] opacity-100 mt-2' : 'grid-rows-[0fr] opacity-0')}>
                        {/* The template draws the sub-list as a progress rail:
                            one grey track from the first row's centre to the
                            last's, a teal overlay stopping at the row you are
                            on, and a dot only at each end. Ours was a 1px line
                            with a dot on every row, which read as a bullet list
                            and said nothing about where you were. CHILD_ROW_PX
                            is the row height the overlay counts in — py-2 plus
                            text-sm's 20px line box. */}
                        <div className="overflow-hidden min-h-0 relative space-y-0">
                          <span className="absolute left-[30px] top-[22px] bottom-[22px] w-[2px] z-0 bg-gray-500/20" aria-hidden />
                          {activeChildIndex >= 0 && (
                            <span
                              className="absolute left-[30px] top-[18px] w-[2px] z-0 transition-all duration-300 bg-primary-light"
                              style={{ height: activeChildIndex * CHILD_ROW_PX }}
                              aria-hidden
                            />
                          )}
                          {item.children.map((c, ci) => {
                            const cActive = c.href === active;
                            const isFirst = ci === 0;
                            const isLast = ci === item.children!.length - 1;
                            return (
                              <Link
                                key={c.href}
                                href={c.href}
                                onClick={closeMobile}
                                className={clsx(
                                  'relative block pl-[50px] py-2 text-sm transition-colors z-10',
                                  cActive ? 'text-primary-light font-semibold' : 'text-white hover:text-primary-light',
                                )}
                              >
                                {(isFirst || isLast) && (
                                  <span
                                    className={clsx(
                                      'absolute left-[27px] top-[14px] size-2 rounded-full z-20',
                                      (isFirst && activeChildIndex >= 0) || (isLast && activeChildIndex === ci)
                                        ? 'bg-primary-light'
                                        : 'bg-gray-500/20',
                                    )}
                                    aria-hidden
                                  />
                                )}
                                {c.label}
                                {(() => {
                                  const waiting = queueCounts?.[QUEUE_OF[c.href] ?? ''] ?? 0;
                                  // Only when there is something to do: a zero
                                  // badge on every queue is noise that teaches
                                  // people to stop reading the badges.
                                  return waiting > 0 ? (
                                    <span
                                      className="ml-2 inline-flex min-w-[20px] justify-center rounded-full px-1.5 py-0.5 align-middle text-[10px] font-bold tabular-nums"
                                      style={{ background: 'var(--brand)', color: '#fff' }}
                                    >
                                      {waiting}
                                    </span>
                                  ) : null;
                                })()}
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* Mobile scrim */}
      {sidebarOpen && (
        <button
          className="xl:hidden fixed inset-0 z-40 bg-black/40"
          aria-label="Close navigation"
          onClick={closeMobile}
        />
      )}

      {/* ── Main column ─────────────────────────────────────── */}
      <div className={clsx('flex-1 min-w-0 flex flex-col transition-all duration-300', collapsed ? 'xl:ml-[88px]' : 'xl:ml-[280px]')}>
        {/* Demo: say up front that saving does nothing, before someone edits a product and wonders. */}
        <div className="bg-primary text-white text-xs px-4 lg:px-6 xl:px-10 py-2 flex flex-wrap items-center justify-between gap-2">
          <span>StoreEngine demo admin: explore freely, changes aren&apos;t saved.</span>
          {process.env.NEXT_PUBLIC_STOREFRONT_URL && (
            <a href={process.env.NEXT_PUBLIC_STOREFRONT_URL} className="font-semibold underline underline-offset-2">
              View the store →
            </a>
          )}
        </div>
        <header className="bg-[var(--surface)] border-b border-[var(--border)] z-30 px-4 lg:px-6 xl:px-10 py-3.5 flex items-center justify-between sticky top-0">
          <div className="flex items-center gap-4">
            <button
              className="xl:hidden p-2 text-[var(--text-1)] hover:bg-gray-100 rounded-md"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation"
            >
              <Menu size={22} />
            </button>
            <button
              type="button"
              aria-label="Search the admin"
              onClick={() => setCmdOpen(true)}
              className="hidden md:flex items-center gap-2.5 h-10 w-[320px] pl-4 pr-3 rounded-full bg-gray-100 text-[var(--text-3)] text-sm ring-1 ring-gray-300 hover:ring-gray-400 transition"
            >
              <Search size={16} />
              <span className="flex-1 text-left">Search orders, products…</span>
              <kbd className="text-[10px] font-mono bg-[var(--surface)] border border-[var(--border)] rounded px-1.5 py-0.5">⌘K</kbd>
            </button>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <button
              className="relative size-9 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
              onClick={() => setNotifOpen(true)}
              aria-label="Notifications"
            >
              <Bell size={19} className="text-[var(--text-1)]" />
              {unreadCount > 0 && (
                <span className="absolute top-0.5 right-0.5 min-w-4 h-4 px-1 flex items-center justify-center rounded-full bg-warning text-[10px] font-bold text-[#212529]">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            <div className="relative" ref={userRef}>
              <button
                className="flex items-center gap-2 h-9 pl-1 pr-2 rounded-full hover:bg-gray-100 transition-colors"
                type="button"
                aria-expanded={userOpen}
                aria-haspopup="menu"
                onClick={() => setUserOpen((v) => !v)}
              >
                {/* The person signed in, not the store: this said "Admin" with
                    the shop's initial for everyone, so a content editor looked
                    like they held full control. */}
                <span className="size-8 grid place-items-center overflow-hidden rounded-full bg-primary text-white text-xs font-bold">
                  {viewer?.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={viewer.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    (viewer?.name || businessName || 'A').charAt(0).toUpperCase()
                  )}
                </span>
                <span className="hidden sm:block max-w-[160px] truncate text-sm font-semibold text-[var(--text-1)]">
                  {viewer?.name || 'Account'}
                </span>
                <ChevronDown size={14} className="text-[var(--text-3)]" />
              </button>

              {userOpen && (
                <div className="absolute right-0 top-full mt-2 ak-menu z-50">
                  <div className="px-3 py-2 mb-1 max-w-[260px]">
                    <p className="truncate" style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>
                      {viewer?.name || businessName}
                    </p>
                    {viewer?.email && (
                      <p className="truncate" style={{ fontSize: 11, color: 'var(--text-3)' }}>{viewer.email}</p>
                    )}
                    <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>
                      {viewer
                        ? viewer.isSuperuser
                          ? 'Admin · full access'
                          : viewer.roles.length
                            ? viewer.roles.join(', ')
                            : 'No role yet'
                        : businessName}
                    </p>
                  </div>
                  <div className="ak-menu-divider" />
                  {canOpen(viewer, '/settings/general') && (
                    <Link className="ak-menu-item" href="/settings" onClick={() => setUserOpen(false)}><Settings size={14} />Settings</Link>
                  )}
                  <a className="ak-menu-item danger" href="/logout"><LogOut size={14} />Sign out</a>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6 xl:p-8">
          <AccessProvider viewer={viewer}>
            {/* The page guard. Hiding a menu item never stopped anyone typing
                the URL, and a view-only role could open Add Product, fill it
                in and only learn at Save that the API refuses. */}
            {canAccess(viewer, pathname, levelForPath(pathname)) ? (
              // `data-readonly` lets one stylesheet rule hide every Add and
              // Edit link on a page the role can only view (globals.css);
              // buttons that act in place check useAccess() themselves.
              <div data-readonly={canAccess(viewer, pathname, 'manage') ? undefined : ''}>{children}</div>
            ) : (
              <NoAccess viewer={viewer} pathname={pathname} />
            )}
          </AccessProvider>
        </main>
      </div>

      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} viewer={viewer} />
      <NotificationsDrawer open={notifOpen} onClose={() => setNotifOpen(false)} />
    </div>
  );
}

export { itemLabelFor };

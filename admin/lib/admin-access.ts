/* What a staff role can reach — the admin's mirror of
   backend/apps/accounts/access.py. The backend is what enforces it; this file
   only decides what the menu offers, so a packer isn't shown a Settings page
   that would refuse them. Keep the two lists in step. */

export type AccessLevel = 'view' | 'manage';
export type AreaKey =
  | 'orders' | 'finance' | 'catalog' | 'inventory' | 'customers'
  | 'support' | 'marketing' | 'content' | 'settings' | 'integrations' | 'staff';
export type Access = Partial<Record<AreaKey, AccessLevel>>;

export const AREAS: { key: AreaKey; label: string; description: string }[] = [
  { key: 'orders', label: 'Orders & fulfilment', description: 'Orders, the fulfilment queues, shipments and abandoned carts.' },
  { key: 'finance', label: 'Payments & refunds', description: 'Transactions and refund approvals.' },
  { key: 'catalog', label: 'Products & catalogue', description: 'Products, variants, categories, brands, tags, attributes and reviews.' },
  { key: 'inventory', label: 'Inventory', description: 'Stock levels, stock movements, warehouses, suppliers and purchase requests.' },
  { key: 'customers', label: 'Customers', description: 'Customer accounts and their addresses.' },
  { key: 'support', label: 'Support inbox', description: 'Customer conversations and replies.' },
  { key: 'marketing', label: 'Marketing', description: 'Coupons, deals, push notifications, campaigns and marketing tools.' },
  { key: 'content', label: 'Storefront content', description: 'Home page slides, popups, category groups, FAQ and legal pages.' },
  { key: 'settings', label: 'Store settings', description: 'Store details, tax, payment methods and shipping rates.' },
  { key: 'integrations', label: 'Integrations & credentials', description: 'Firebase, the assistant, marketing tools and the stored API keys.' },
  { key: 'staff', label: 'Staff & roles', description: 'Staff accounts and what each role can do.' },
];

/* Which area each admin page belongs to. The longest matching prefix wins, so
   /products/stocks is inventory while /products is catalogue. A page not listed
   here is shown to all staff (the dashboard). */
const HREF_AREAS: [string, AreaKey][] = [
  ['/products', 'catalog'], ['/categories', 'catalog'],
  ['/products/stocks', 'inventory'], ['/inventory', 'inventory'],
  ['/orders', 'orders'], ['/finance-queue', 'orders'], ['/warehouse', 'orders'], ['/logistics', 'orders'],
  ['/in-transit', 'orders'], ['/shipping', 'orders'], ['/sales-reports', 'orders'], ['/top-products', 'orders'],
  ['/orders/transactions', 'finance'], ['/refunds', 'finance'], ['/earning', 'finance'],
  ['/customers', 'customers'], ['/inbox', 'support'],
  ['/users', 'staff'], ['/admin-users', 'staff'], ['/roles', 'staff'],
  ['/coupon', 'marketing'], ['/flash-sales', 'marketing'], ['/featured-deal', 'marketing'],
  ['/clearance-sale', 'marketing'], ['/push', 'marketing'], ['/marketing-tools', 'marketing'],
  ['/home-page-control', 'content'], ['/content', 'content'], ['/category-groups', 'content'],
  ['/promo-popup', 'content'], ['/faq', 'content'], ['/privacy-and-policy', 'content'], ['/terms-and-conditions', 'content'],
  ['/tax', 'settings'], ['/onboarding', 'settings'], ['/settings', 'settings'], ['/payment-method', 'settings'],
  ['/firebase', 'integrations'], ['/assistant', 'integrations'], ['/system', 'integrations'],
];

export function areaForHref(href: string): AreaKey | null {
  let best: [string, AreaKey] | null = null;
  for (const entry of HREF_AREAS) {
    const prefix = entry[0];
    if ((href === prefix || href.startsWith(`${prefix}/`)) && (!best || prefix.length > best[0].length)) best = entry;
  }
  return best ? best[1] : null;
}

/** The signed-in staff member, or null when it couldn't be loaded. */
export type Viewer = {
  name: string;
  email: string;
  avatarUrl: string;
  isSuperuser: boolean;
  roles: string[];
  access: Access;
} | null;

const RANK: Record<AccessLevel, number> = { view: 1, manage: 2 };

/** The level a page needs: its create and edit screens are forms that save,
 *  so they need manage; everything else only shows data and needs view. */
export function levelForPath(pathname: string): AccessLevel {
  return pathname.split('/').some((segment) => segment === 'add' || segment === 'edit') ? 'manage' : 'view';
}

/** Whether the signed-in role reaches `href` at `level`. A viewer that couldn't
 *  be loaded is let through — the backend still refuses what their role
 *  doesn't allow — so an API hiccup never empties the admin. */
export function canAccess(viewer: Viewer, href: string, level: AccessLevel = 'view'): boolean {
  if (!viewer || viewer.isSuperuser) return true;
  // Admin accounts are superusers; only a superuser can manage them.
  if (href === '/admin-users' || href.startsWith('/admin-users/')) return false;
  const area = areaForHref(href);
  if (area === null) return true;
  const held = viewer.access[area];
  return held !== undefined && RANK[held] >= RANK[level];
}

/** Whether the menu should offer `href`. */
export function canOpen(viewer: Viewer, href: string): boolean {
  return canAccess(viewer, href, 'view');
}

export function accessSummary(access: Access): string {
  const manage = AREAS.filter((a) => access[a.key] === 'manage').map((a) => a.label);
  const view = AREAS.filter((a) => access[a.key] === 'view').map((a) => a.label);
  if (manage.length === AREAS.length) return 'Full access';
  if (!manage.length && !view.length) return 'No access yet';
  return [manage.length ? `Manage ${manage.join(', ')}` : '', view.length ? `View ${view.join(', ')}` : '']
    .filter(Boolean)
    .join(' · ');
}

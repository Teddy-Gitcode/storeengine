import { getOrders, getProducts, getStoreSettings } from '@/lib/admin-api';
import ResourceList from '@/components/sellzy/resource-list';
import { StatusPill } from '@/components/sellzy/product-ui';

export const dynamic = 'force-dynamic';

// Only orders whose money is real should count towards a sales ranking.
const PAID_STATUSES = new Set(['paid', 'processing', 'packed', 'shipped', 'delivered']);

export default async function TopProductsPage() {
  const [productsPage, ordersPage, settings] = await Promise.all([
    getProducts({ page_size: 200 }).catch(() => null),
    getOrders({ page_size: 200 }).catch(() => null),
    getStoreSettings().catch(() => null),
  ]);
  const products = productsPage?.results ?? [];
  const orders = ordersPage?.results ?? [];

  const money = new Intl.NumberFormat(settings?.locale || 'en-US', {
    style: 'currency',
    currency: settings?.currency_code || 'USD',
    maximumFractionDigits: 0,
  });

  /* The ranking is what the page is for, so it is measured, not guessed: units
     sold and revenue from paid orders, matched to products by line name. The
     old order (featured first, then most expensive) looked like a sales chart
     and was not one. */
  const sold = new Map<string, { units: number; revenue: number }>();
  for (const order of orders) {
    if (!PAID_STATUSES.has(order.status)) continue;
    for (const item of order.items ?? []) {
      const entry = sold.get(item.name) || { units: 0, revenue: 0 };
      entry.units += item.quantity;
      entry.revenue += Number(item.line_total || 0);
      sold.set(item.name, entry);
    }
  }

  const ranked = products
    .map((p) => ({ product: p, sales: sold.get(p.name) || { units: 0, revenue: 0 } }))
    .sort((a, b) => b.sales.revenue - a.sales.revenue || b.sales.units - a.sales.units);

  return (
    <ResourceList
      title="Top products, categories"
      columns={[
        { key: 'rank', label: '#' },
        { key: 'product', label: 'Product' },
        { key: 'category', label: 'Category' },
        { key: 'units', label: 'Units sold' },
        { key: 'revenue', label: 'Revenue' },
        { key: 'price', label: 'Price' },
        { key: 'stock', label: 'Stock' },
        { key: 'status', label: 'Status' },
      ]}
      statusFilter={{ label: 'All status', options: [
        { value: 'active', label: 'Active' },
        { value: 'draft', label: 'Draft' },
        { value: 'archived', label: 'Archived' },
      ] }}
      rows={ranked.map(({ product: p, sales }, i) => ({
        id: p.id,
        search: `${p.name} ${p.category?.name ?? ''}`,
        status: p.status,
        cells: {
          rank: <span className="font-dm-sans whitespace-nowrap">{sales.units > 0 ? i + 1 : '—'}</span>,
          product: <span className="font-semibold text-light-primary-text">{p.name}</span>,
          category: p.category?.name ?? '—',
          units: <span className="font-dm-sans tabular-nums">{sales.units}</span>,
          revenue: <span className="font-dm-sans tabular-nums whitespace-nowrap">{money.format(sales.revenue)}</span>,
          price: <span className="font-dm-sans whitespace-nowrap">{money.format(Number(p.price))}</span>,
          stock: <span className="font-dm-sans tabular-nums">{p.stock?.quantity_on_hand ?? 0}</span>,
          status: <StatusPill label={p.status} tone={p.status === 'active' ? 'success' : 'neutral'} />,
        },
      }))}
      emptyMessage={products.length === 0 ? 'No products yet.' : 'No products match this filter.'}
    />
  );
}

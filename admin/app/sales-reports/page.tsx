import StatCard from '@/components/StatCard';
import { getOrders, getPayments, getProducts, getStoreSettings, getDashboard } from '@/lib/admin-api';
import { baseTotal, moneyFormatter } from '@/lib/money';
import type { AdminOrder } from '@/lib/admin-types';
import { DollarSign, Eye, ShoppingBag, TrendingUp, Award } from 'lucide-react';
import AnalyticsRevenueChart from '@/components/sellzy/analytics-revenue-chart';
import AnalyticsStatusDonut from '@/components/sellzy/analytics-status-donut';
import {
  IconAction, StatusPill, TABLE_HEAD_ROW, TABLE_ROW, TABLE_TD, TABLE_TH, type PillTone,
} from '@/components/sellzy/product-ui';

export const dynamic = 'force-dynamic';

const PAID_STATUSES = new Set(['paid', 'processing', 'packed', 'shipped', 'delivered']);

const PROVIDER_LABELS: Record<string, string> = {
  mobile_money: 'Mobile Money',
  stripe: 'Stripe',
  paypal: 'PayPal',
  manual: 'Manual',
};
const PROVIDER_COLORS: Record<string, string> = {
  mobile_money: 'var(--green)',
  stripe: 'var(--info)',
  paypal: 'var(--gold)',
  manual: 'var(--text-3)',
};

function orderDate(o: AdminOrder) {
  return new Date(o.placed_at || o.created_at);
}

function saleTone(status: string): PillTone {
  if (status === 'delivered' || status === 'paid') return 'success';
  if (status === 'cancelled' || status === 'refunded') return 'error';
  if (status === 'pending_payment' || status === 'draft') return 'warning';
  return 'info';
}

export default async function AnalyticsPage() {
  const [ordersPage, paymentsPage, productsPage, settings, dashboard] = await Promise.all([
    getOrders({ page_size: 200 }),
    getPayments({ page_size: 200 }),
    getProducts({ page_size: 200 }),
    getStoreSettings(),
    getDashboard().catch(() => null),
  ]);
  const orders = ordersPage.results;
  const payments = paymentsPage.results;
  const products = productsPage.results;

  const money = new Intl.NumberFormat(settings?.locale || 'en-US', {
    style: 'currency',
    currency: settings?.currency_code || 'USD',
    maximumFractionDigits: 0,
  });
  // One order's own figures, in what it was charged in. Sums above use
  // `baseTotal` so dollar and shilling orders add up in the store's currency.
  const orderMoney = moneyFormatter(settings);

  const now = new Date();
  const monthLabel = now.toLocaleDateString(settings?.locale || 'en-US', { month: 'long', year: 'numeric' });
  const isMtd = (d: Date) => d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();

  const paidOrders = orders.filter((o) => PAID_STATUSES.has(o.status));
  const paidMtd = paidOrders.filter((o) => isMtd(orderDate(o)));
  const revenueMtd = paidMtd.reduce((s, o) => s + baseTotal(o), 0);
  const avgBasket = paidMtd.length ? revenueMtd / paidMtd.length : 0;

  // Top category by paid order line revenue (item name -> product category)
  const categoryByProduct = new Map(products.map((p) => [p.name, p.category?.name || 'Uncategorized']));
  const categoryRevenue = new Map<string, number>();
  const productRevenue = new Map<string, { revenue: number; orders: number }>();
  for (const o of paidOrders) {
    for (const item of o.items || []) {
      const line = Number(item.line_total || 0);
      const cat = categoryByProduct.get(item.name) || 'Uncategorized';
      categoryRevenue.set(cat, (categoryRevenue.get(cat) || 0) + line);
      const entry = productRevenue.get(item.name) || { revenue: 0, orders: 0 };
      entry.revenue += line;
      entry.orders += 1;
      productRevenue.set(item.name, entry);
    }
  }
  const totalCategoryRevenue = [...categoryRevenue.values()].reduce((a, b) => a + b, 0);
  const topCategory = [...categoryRevenue.entries()].sort((a, b) => b[1] - a[1])[0];
  const topProducts = [...productRevenue.entries()]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);
  const maxProductRevenue = topProducts[0]?.revenue || 1;

  // Daily revenue, last 7 days
  const DAY = 86_400_000;
  const dayKey = (d: Date) => d.toISOString().slice(0, 10);
  const days = Array.from({ length: 7 }, (_, i) => new Date(Date.now() - (6 - i) * DAY));
  const revenueByDay = days.map((d) =>
    paidOrders.filter((o) => dayKey(orderDate(o)) === dayKey(d)).reduce((s, o) => s + baseTotal(o), 0),
  );
  const rangeLabel = `${days[0].toLocaleDateString(settings?.locale || 'en-US', { weekday: 'short', day: 'numeric', month: 'short' })} – ${days[6].toLocaleDateString(settings?.locale || 'en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}`;

  // Payment method share (confirmed payments)
  const confirmed = payments.filter((p) => p.status === 'confirmed');
  const byProvider = Object.keys(PROVIDER_LABELS)
    .map((key) => ({ key, count: confirmed.filter((p) => p.provider === key).length }))
    .filter((e) => e.count > 0)
    .sort((a, b) => b.count - a.count);

  // Order status distribution
  const statusCounts = new Map<string, number>();
  for (const o of orders) statusCounts.set(o.status, (statusCounts.get(o.status) || 0) + 1);
  const statusRows = [...statusCounts.entries()].sort((a, b) => b[1] - a[1]);

  // Repeat customer rate: share of paid orders from emails with >1 paid order
  const ordersByEmail = new Map<string, number>();
  for (const o of paidOrders) {
    if (o.email) ordersByEmail.set(o.email, (ordersByEmail.get(o.email) || 0) + 1);
  }
  const repeatOrders = paidOrders.filter((o) => (ordersByEmail.get(o.email) || 0) > 1).length;
  const repeatRate = paidOrders.length ? Math.round((repeatOrders / paidOrders.length) * 100) : 0;
  const deliveredRate = paidOrders.length
    ? Math.round((orders.filter((o) => o.status === 'delivered').length / paidOrders.length) * 100)
    : 0;
  const cancelledRate = orders.length
    ? Math.round((orders.filter((o) => o.status === 'cancelled').length / orders.length) * 100)
    : 0;
  const paymentSuccessRate = payments.length ? Math.round((confirmed.length / payments.length) * 100) : 0;

  const salesRows = [...orders]
    .sort((a, b) => orderDate(b).getTime() - orderDate(a).getTime())
    .slice(0, 10);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="ak-page-title">Analytics & Reporting</h2>
          <p className="ak-page-sub">Revenue, orders, and performance insights · {monthLabel}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Revenue MTD" value={money.format(revenueMtd)} sub={`${paidMtd.length} paid orders`} icon={DollarSign} accent="green" />
        <StatCard label="Orders MTD" value={String(paidMtd.length)} sub={`${orders.length} all-time`} icon={ShoppingBag} accent="blue" />
        <StatCard label="Avg Basket Size" value={money.format(avgBasket)} sub="Paid orders this month" icon={TrendingUp} accent="gold" />
        <StatCard
          label="Top Category"
          value={topCategory ? topCategory[0] : '—'}
          sub={topCategory && totalCategoryRevenue ? `${Math.round((topCategory[1] / totalCategoryRevenue) * 100)}% of item revenue` : 'No sales yet'}
          icon={Award}
          accent="purple"
        />
      </div>

      {/* Revenue chart */}
      <div className="ak-card p-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-1)' }}>
              {dashboard ? 'Monthly Revenue' : 'Daily Revenue — Last 7 Days'}
            </p>
            <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 3 }}>
              {dashboard ? 'This year, by month' : rangeLabel}
            </p>
          </div>
        </div>
        {dashboard ? (
          <AnalyticsRevenueChart
            categories={dashboard.revenue_monthly.map((m) => m.month)}
            series={dashboard.revenue_monthly.map((m) => m.total)}
            currencyCode={settings?.currency_code || 'USD'}
            locale={settings?.locale || 'en-US'}
          />
        ) : (
          <AnalyticsRevenueChart
            categories={days.map((d) => d.toLocaleDateString(settings?.locale || 'en-US', { weekday: 'short' }))}
            series={revenueByDay}
            currencyCode={settings?.currency_code || 'USD'}
            locale={settings?.locale || 'en-US'}
          />
        )}
      </div>

      {/* Middle row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="ak-card p-6">
          <p style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-1)' }}>Top Products by Revenue</p>
          <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 3, marginBottom: 20 }}>All paid orders</p>
          <div className="space-y-4">
            {topProducts.map((p, i) => (
              <div key={p.name}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold"
                      style={{ background: 'var(--green-light)', color: 'var(--green)' }}
                    >
                      {i + 1}
                    </span>
                    <p style={{ fontSize: 13, color: 'var(--text-1)', fontWeight: 500 }} className="truncate">{p.name}</p>
                  </div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-1)' }} className="tabular-nums shrink-0 ml-3">
                    {money.format(p.revenue)}
                  </p>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${Math.round((p.revenue / maxProductRevenue) * 100)}%`, background: 'var(--green)' }} />
                </div>
                <p style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 3 }}>{p.orders} orders</p>
              </div>
            ))}
            {topProducts.length === 0 && (
              <p style={{ fontSize: 12, color: 'var(--text-3)' }}>No paid orders yet.</p>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {/* Payment methods */}
          <div className="ak-card p-6">
            <p style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-1)' }}>Payment Methods</p>
            <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 3, marginBottom: 16 }}>Share of confirmed payments</p>
            <div className="space-y-3">
              {byProvider.map((p) => {
                const pct = confirmed.length ? Math.round((p.count / confirmed.length) * 100) : 0;
                return (
                  <div key={p.key}>
                    <div className="flex items-center justify-between mb-1">
                      <span style={{ fontSize: 13, color: 'var(--text-2)', fontWeight: 500 }}>{PROVIDER_LABELS[p.key]}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }} className="tabular-nums">{pct}%</span>
                    </div>
                    <div className="progress-track">
                      <div className="progress-fill" style={{ width: `${pct}%`, backgroundColor: PROVIDER_COLORS[p.key] }} />
                    </div>
                    <p style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 3 }}>{p.count.toLocaleString()} payments</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Order status distribution */}
          <div className="ak-card p-6">
            <p style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-1)' }}>Orders by Status</p>
            <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 3, marginBottom: 8 }}>All-time distribution</p>
            {statusRows.length > 0 ? (
              <AnalyticsStatusDonut
                labels={statusRows.map(([status]) => status.replaceAll('_', ' ').replace(/^\w/, (c) => c.toUpperCase()))}
                series={statusRows.map(([, count]) => count)}
              />
            ) : (
              <p style={{ fontSize: 12, color: 'var(--text-3)' }}>No orders yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* KPIs row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Repeat Customer Rate', value: `${repeatRate}%`, sub: 'Of paid orders' },
          { label: 'Fulfillment Rate', value: `${deliveredRate}%`, sub: 'Paid orders delivered' },
          { label: 'Cancellation Rate', value: `${cancelledRate}%`, sub: 'Of all orders' },
          { label: 'Payment Success', value: `${paymentSuccessRate}%`, sub: `${confirmed.length} of ${payments.length} payments` },
        ].map((kpi) => (
          <div key={kpi.label} className="ak-card p-5 text-center">
            <p style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 600, marginBottom: 8 }}>
              {kpi.label}
            </p>
            <p className="font-dm-sans" style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-1)', lineHeight: 1 }}>{kpi.value}</p>
            <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6 }}>{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* Sales rows — the template's per-order table under the charts. */}
      <div className="bg-surface rounded-2xl w-full">
        <div className="p-4 sm:p-6 pb-4 flex items-center justify-between gap-4">
          <h3 className="text-xl font-bold text-light-primary-text leading-7 font-public-sans">Sales</h3>
          <span className="text-xs text-light-secondary-text font-public-sans">
            {salesRows.length} most recent orders
          </span>
        </div>
        {salesRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <ShoppingBag size={28} className="text-gray-400" />
            <p className="text-sm font-semibold text-light-primary-text font-public-sans">No sales yet</p>
            <p className="text-xs text-light-secondary-text font-public-sans">Orders appear here as soon as they are placed.</p>
          </div>
        ) : (
          <div className="relative w-full overflow-auto">
            <table className="w-full caption-bottom text-sm">
              <thead>
                <tr className={TABLE_HEAD_ROW}>
                  <th className={TABLE_TH}>ID</th>
                  <th className={TABLE_TH}>Customer</th>
                  <th className={TABLE_TH}>Items</th>
                  <th className={TABLE_TH}>Amount</th>
                  <th className={TABLE_TH}>Tax</th>
                  <th className={TABLE_TH}>Status</th>
                  <th className={TABLE_TH}>Date</th>
                  <th className={TABLE_TH}>Action</th>
                </tr>
              </thead>
              <tbody>
                {salesRows.map((o) => (
                  <tr key={o.id} className={TABLE_ROW}>
                    <td className={`${TABLE_TD} text-sm text-light-secondary-text whitespace-nowrap`}>#{o.number}</td>
                    <td className={`${TABLE_TD} text-sm text-light-secondary-text whitespace-nowrap`}>{o.email || '—'}</td>
                    <td className={`${TABLE_TD} text-sm text-light-secondary-text tabular-nums whitespace-nowrap`}>
                      {o.items.reduce((sum, i) => sum + i.quantity, 0)}
                    </td>
                    <td className={`${TABLE_TD} text-sm font-semibold text-primary font-dm-sans whitespace-nowrap`}>
                      {orderMoney(o.grand_total, o.currency)}
                    </td>
                    <td className={`${TABLE_TD} text-sm text-light-secondary-text font-dm-sans whitespace-nowrap`}>
                      {orderMoney(o.tax_total, o.currency)}
                    </td>
                    <td className={`${TABLE_TD} whitespace-nowrap`}>
                      <StatusPill
                        label={o.status.replaceAll('_', ' ').replace(/^\w/, (c) => c.toUpperCase())}
                        tone={saleTone(o.status)}
                      />
                    </td>
                    <td className={`${TABLE_TD} text-sm text-light-secondary-text whitespace-nowrap`}>
                      {orderDate(o).toLocaleDateString(settings?.locale || 'en-US', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </td>
                    <td className={`${TABLE_TD} whitespace-nowrap`}>
                      <IconAction href={`/orders/${o.number}`} title="View order"><Eye size={16} /></IconAction>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

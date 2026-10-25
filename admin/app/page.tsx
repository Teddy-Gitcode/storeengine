import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { getDashboard, getInventory, getStoreSettings } from '@/lib/admin-api';
import type { DashboardData, DashboardKpi, StockItem } from '@/lib/admin-types';
import DashboardOrderStatusDonut, { ORDER_STATUS_PALETTE } from '@/components/sellzy/dashboard-order-status-donut';
import { countryName } from '@/lib/countries';
import Flag from '@/components/Flag';
import DashboardRevenueChart from '@/components/sellzy/dashboard-revenue-chart';
import { RecentOrdersTable, StockUpdateTable } from '@/components/sellzy/dashboard-tables';
import DashboardActionRequired from '@/components/sellzy/dashboard-action-required';

export const dynamic = 'force-dynamic';

// KPI tile backgrounds — exact rgba() fills from the Sellzy template's
// dashboard stat-card grid, in the same order the template renders them.
const KPI_META: { key: keyof DashboardData['kpis']; label: string; bg: string }[] = [
  { key: 'total_sales', label: 'Total Sales', bg: '#c6eeec' },
  { key: 'total_orders', label: 'Total Orders', bg: '#fff3a5' },
  { key: 'total_customers', label: 'Total Customers', bg: '#ffd9bd' },
  { key: 'shipping_delays', label: 'Shipping Delays', bg: '#ffe6f5' },
  // Refund requests and out-of-stock used to be tiles here too; they are in
  // "Needs attention" above as links to the rows, so they are not repeated.
  { key: 'abandoned_carts', label: 'Abandoned Carts', bg: '#c5f1aa' },
  { key: 'payment_failures', label: 'Payment Failures', bg: '#c7e9ff' },
];

export default async function DashboardPage() {
  const [data, settings, stockPage] = await Promise.all([
    getDashboard().catch(() => null as DashboardData | null),
    getStoreSettings(),
    getInventory({ page_size: 50 }).catch(() => null),
  ]);

  const money = new Intl.NumberFormat(settings?.locale || 'en-US', {
    style: 'currency', currency: settings?.currency_code || 'USD', maximumFractionDigits: 0,
  });
  const num = new Intl.NumberFormat(settings?.locale || 'en-US');

  if (!data) {
    return (
      <div className="bg-surface border border-warning rounded-2xl flex items-center gap-2 px-4 py-3">
        <span className="text-sm font-semibold font-public-sans text-warning-dark">
          The dashboard endpoint isn&apos;t available on the connected backend yet — deploy the latest backend, or point the admin at your local server.
        </span>
      </div>
    );
  }

  const kpiValue = (k: DashboardKpi) => (k.currency ? money.format(k.value) : num.format(k.value));
  const kpiSub = (k: DashboardKpi) => (k.delta === 0 ? '0%' : `${k.delta > 0 ? '+' : ''}${k.delta}%`);
  const kpiTrend = (k: DashboardKpi): 'up' | 'down' => (k.delta < 0 ? 'down' : 'up');

  const donutTotal = data.order_status.reduce((a, r) => a + r.count, 0);
  const countriesTotal = data.top_countries.reduce((a, c) => a + c.total, 0);
  const maxCountry = Math.max(1, ...data.top_countries.map((c) => c.total));

  // "Stock Update" panel — mirror the template, which lists stock items with a
  // computed status (In / Low / Out), not only low-stock ones. Sort by lowest
  // quantity first so at-risk items surface, then show the top few.
  const stockItems: StockItem[] = (stockPage?.results ?? [])
    .slice()
    .sort((a, b) => a.quantity_on_hand - b.quantity_on_hand)
    .slice(0, 12);

  // Single-store has no per-product vendor — the store itself is the vendor.
  const vendorName = settings?.business_name || 'Store';

  return (
    <div className="space-y-6 bg-surface p-4 sm:p-6 rounded-2xl">
      {/* ── What is waiting on someone, before how the store did ──── */}
      {data.action_required && <DashboardActionRequired counts={data.action_required} />}

      {/* ── KPI tiles ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {KPI_META.map(({ key, label, bg }) => {
          const k = data.kpis[key];
          const trend = kpiTrend(k);
          return (
            <div key={key} className="p-6 rounded-2xl flex flex-col justify-between relative" style={{ background: bg }}>
              <div>
                <p className="text-sm font-semibold font-public-sans text-[#495057] mb-2">{label}</p>
                <h3 className="text-2xl font-dm-sans font-bold text-[#212529]">{kpiValue(k)}</h3>
              </div>
              {/* No change is not news: a "0% ↑" chip on every tile read as
                  growth that wasn't there. */}
              {k.delta !== 0 && (
              <div className="absolute bottom-6 right-6 flex items-center gap-1 bg-white px-2 py-1 font-normal text-xs rounded-full">
                <span className={`text-xs font-bold font-public-sans ${trend === 'down' ? 'text-[#cb0233]' : 'text-[#088178]'}`}>
                  {kpiSub(k)}
                </span>
                <span className={trend === 'down' ? 'text-[#cb0233]' : 'text-[#088178]'}>
                  {trend === 'down' ? <ArrowDownRight size={16} /> : <ArrowUpRight size={16} />}
                </span>
              </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Order status · top countries · revenue · fulfillment ──── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Order Status — donut + legend */}
        <div className="sm:col-span-2 order-1">
          <div className="bg-surface border border-gray-300 rounded-2xl w-full">
            <div className="px-4 sm:px-6 py-4 flex items-start justify-between">
              <h3 className="text-lg font-bold leading-7 font-public-sans text-light-primary-text">Order Status</h3>
            </div>
            <div className="px-4 sm:px-6 pb-4 sm:pb-6">
              <div className="flex flex-col md:flex-row justify-between gap-8">
                <div className="w-full md:w-1/2 space-y-2">
                  {data.order_status.map((r, i) => (
                    <div key={r.label} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-3">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: ORDER_STATUS_PALETTE[i % ORDER_STATUS_PALETTE.length] }}
                        />
                        <span className="text-sm font-public-sans text-light-primary-text">{r.label}</span>
                      </div>
                      <span className="text-sm font-dm-sans leading-5.5 text-light-primary-text">{num.format(r.count)}</span>
                    </div>
                  ))}
                  {data.order_status.length === 0 && (
                    <p className="text-xs font-public-sans text-light-secondary-text">No orders yet.</p>
                  )}
                </div>
                <div className="w-full md:w-1/2 flex justify-center items-center">
                  {donutTotal > 0 ? (
                    <DashboardOrderStatusDonut
                      labels={data.order_status.map((r) => r.label)}
                      series={data.order_status.map((r) => r.count)}
                    />
                  ) : (
                    <p className="text-xs font-public-sans text-light-secondary-text">No data to chart yet.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Top Countries by Sales */}
        <div className="lg:col-span-1 order-4 lg:order-2">
          <div className="bg-surface border border-gray-300 rounded-2xl w-full">
            <div className="px-4 sm:px-6 py-4 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold leading-7 font-public-sans text-light-primary-text">Top Countries By sales</h3>
                <p className="text-sm font-public-sans text-light-secondary-text mt-1">Total Sale {money.format(countriesTotal)}</p>
              </div>
            </div>
            <div className="px-4 sm:px-6 pb-4 sm:pb-6">
              {data.top_countries.length === 0 ? (
                <p className="text-xs font-public-sans text-light-secondary-text pt-2">No sales with shipping destinations yet.</p>
              ) : (
                <div className="space-y-6 pt-4">
                  {data.top_countries.map((c) => (
                    <div key={c.country} className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 min-w-0">
                        <Flag code={c.country} className="h-6 w-8 rounded" />
                        <span className="font-semibold font-dm-sans text-light-primary-text text-sm truncate">
                          {countryName(c.country) || c.country}
                        </span>
                      </div>
                      <div className="flex-1 h-2 max-w-[80px] rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${Math.max(4, (c.total / maxCountry) * 100)}%` }}
                        />
                      </div>
                      <span className="font-semibold font-dm-sans text-sm text-light-primary-text shrink-0">{money.format(c.total)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Revenue */}
        <div className="sm:col-span-2 lg:col-span-3 order-2 lg:order-3">
          <div className="bg-surface border border-gray-300 rounded-2xl w-full">
            <div className="px-4 sm:px-6 py-4 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold leading-7 font-public-sans text-light-primary-text">Revenue</h3>
                <p className="text-sm font-public-sans text-light-secondary-text mt-1">This year, by month</p>
              </div>
            </div>
            <div className="px-2 sm:px-4 pb-4 sm:pb-6">
              <DashboardRevenueChart
                categories={data.revenue_monthly.map((m) => m.month)}
                data={data.revenue_monthly.map((m) => m.total)}
                currencyCode={settings?.currency_code || 'USD'}
                locale={settings?.locale || 'en-US'}
              />
            </div>
          </div>
        </div>

        {/* "Order Fulfillment Status" was the same counts as Order Status
            above, as bars; the donut keeps them. */}
      </div>

      {/* ── Recent orders ─────────────────────────────────────────── */}
      <div className="mt-4 sm:mt-6">
        <RecentOrdersTable
          orders={data.recent_orders}
          currencyCode={settings?.currency_code || 'USD'}
          locale={settings?.locale || 'en-US'}
        />
      </div>

      {/* ── Stock update ─────────────────────────────────────────── */}
      <div className="mt-4 sm:mt-6">
        <StockUpdateTable
          items={stockItems.map((i) => ({
            id: i.id,
            productId: i.product.id,
            name: i.product.name,
            slug: i.product.slug,
            category: i.product.category_slug,
            quantity: i.quantity_on_hand,
            reorder: i.reorder_level,
          }))}
          vendorName={vendorName}
        />
      </div>
    </div>
  );
}

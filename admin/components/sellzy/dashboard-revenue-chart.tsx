'use client';

import Chart from '@/components/Chart';

// Alternating teal / amber columns — matches the Sellzy template's
// "Accommodation Revenue" bar chart (colors rgba(255,193,7,.85) / rgba(8,129,120,.85)).
export default function DashboardRevenueChart({
  categories,
  data,
  currencyCode = 'USD',
  locale = 'en-US',
}: {
  categories: string[];
  data: number[];
  currencyCode?: string;
  locale?: string;
}) {
  const colors = data.map((_, i) => (i % 2 === 0 ? '#ffc107' : '#088178'));
  // Build the formatter here (client side) — functions can't cross the
  // server→client boundary, so we take serializable currency/locale instead.
  const fmt = new Intl.NumberFormat(locale, { style: 'currency', currency: currencyCode, maximumFractionDigits: 0 });

  return (
    <Chart
      type="bar"
      height={300}
      series={[{ name: 'Revenue', data }]}
      options={{
        chart: { toolbar: { show: false }, fontFamily: 'Public Sans, sans-serif' },
        colors,
        plotOptions: {
          bar: { columnWidth: '45%', borderRadius: 6, distributed: true },
        },
        dataLabels: { enabled: false },
        legend: { show: false },
        grid: { borderColor: '#f4f6f8', strokeDashArray: 4 },
        xaxis: {
          categories,
          axisBorder: { show: false },
          axisTicks: { show: false },
          labels: { style: { fontFamily: 'DM Sans, sans-serif', colors: 'var(--text-3)', fontSize: '12px' } },
        },
        yaxis: {
          labels: {
            style: { fontFamily: 'DM Sans, sans-serif', colors: 'var(--text-3)', fontSize: '12px' },
            formatter: (v: number) => fmt.format(v),
          },
        },
        tooltip: {
          style: { fontFamily: 'DM Sans, sans-serif' },
          y: { formatter: (v: number) => fmt.format(v) },
        },
      }}
    />
  );
}

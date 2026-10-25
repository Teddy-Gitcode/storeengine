'use client';

import Chart from '@/components/Chart';

/** Sales-reports.html renders an ApexCharts area chart for revenue.
 * Fed the dashboard's real `revenue_monthly` aggregate — no synthetic data. */
export default function AnalyticsRevenueChart({
  categories, series, currencyCode, locale,
}: {
  categories: string[];
  series: number[];
  currencyCode: string;
  locale: string;
}) {
  const money = new Intl.NumberFormat(locale, { style: 'currency', currency: currencyCode, maximumFractionDigits: 0 });

  return (
    <Chart
      type="area"
      height={300}
      series={[{ name: 'Revenue', data: series }]}
      options={{
        chart: { toolbar: { show: false }, fontFamily: 'Public Sans, sans-serif' },
        colors: ['#088178'],
        stroke: { curve: 'smooth', width: 3 },
        fill: { type: 'gradient', gradient: { opacityFrom: 0.4, opacityTo: 0 } },
        dataLabels: { enabled: false },
        grid: { borderColor: '#f4f6f8', strokeDashArray: 3 },
        xaxis: { categories, labels: { style: { colors: 'var(--text-3)', fontSize: '12px' } }, axisBorder: { show: false }, axisTicks: { show: false } },
        yaxis: { labels: { style: { colors: 'var(--text-3)', fontSize: '12px' }, formatter: (v: number) => money.format(v) } },
        tooltip: { y: { formatter: (v: number) => money.format(v) } },
      }}
    />
  );
}

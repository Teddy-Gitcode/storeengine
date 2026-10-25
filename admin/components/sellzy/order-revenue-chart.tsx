'use client';

import Chart from '@/components/Chart';

// Smooth teal area chart — matches the Sellzy orders-page revenue trend.
// Formatters are built here (client side) from serializable currency/locale,
// because functions can't be passed across the server→client boundary.
export default function OrderRevenueChart({
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
  const fmt = new Intl.NumberFormat(locale, { style: 'currency', currency: currencyCode, maximumFractionDigits: 0 });
  return (
    <Chart
      type="area"
      height={300}
      series={[{ name: 'Revenue', data }]}
      options={{
        chart: { toolbar: { show: false }, fontFamily: 'Public Sans, sans-serif' },
        colors: ['#088178'],
        stroke: { curve: 'smooth', width: 3 },
        fill: { type: 'gradient', gradient: { opacityFrom: 0.35, opacityTo: 0 } },
        dataLabels: { enabled: false },
        grid: { borderColor: '#f4f6f8' },
        xaxis: { categories },
        yaxis: { labels: { formatter: (v: number) => fmt.format(v) } },
        tooltip: { y: { formatter: (v: number) => fmt.format(v) } },
      }}
    />
  );
}

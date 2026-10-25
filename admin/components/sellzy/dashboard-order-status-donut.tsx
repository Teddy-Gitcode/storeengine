'use client';

import Chart from '@/components/Chart';

// Palette lifted 1:1 from the Sellzy template's "Order Status" donut
// (oops9 dashboard). Cycled across whatever statuses the backend returns,
// since the admin's status set doesn't match the template's fixed 9 labels.
const PALETTE = [
  '#2CD9C5', '#2D99FF', '#FFEF5A', '#E02D69', '#FF6C40',
  '#826AF9', '#CB0233', '#056D6E', '#00AAEC',
];

export { PALETTE as ORDER_STATUS_PALETTE };

export default function DashboardOrderStatusDonut({ labels, series }: { labels: string[]; series: number[] }) {
  return (
    <Chart
      type="donut"
      height={260}
      series={series}
      options={{
        chart: { fontFamily: 'Public Sans, sans-serif', toolbar: { show: false } },
        // Without these the hover tooltip named each slice by its index ("0", "1").
        labels,
        colors: series.map((_, i) => PALETTE[i % PALETTE.length]),
        legend: { show: false },
        dataLabels: { enabled: false },
        stroke: { width: 2, colors: ['#ffffff'] },
        plotOptions: {
          pie: { donut: { size: '65%', labels: { show: false } } },
        },
        tooltip: {
          style: { fontFamily: 'DM Sans, sans-serif' },
          y: { formatter: (v: number) => String(v) },
        },
      }}
    />
  );
}

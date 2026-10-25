'use client';

import Chart from '@/components/Chart';

const PALETTE = ['#088178', '#1890ff', '#ffc107', '#7c5cd6', '#cb0233', '#919eab'];

/** Order-status donut, matching the Sellzy template's radial/donut charts. */
export default function AnalyticsStatusDonut({ labels, series }: { labels: string[]; series: number[] }) {
  const total = series.reduce((a, b) => a + b, 0);

  return (
    <Chart
      type="donut"
      height={260}
      series={series}
      options={{
        labels,
        colors: PALETTE,
        chart: { fontFamily: 'Public Sans, sans-serif' },
        dataLabels: { enabled: false },
        stroke: { width: 2, colors: ['#fff'] },
        legend: { position: 'bottom', fontFamily: 'Public Sans, sans-serif', labels: { colors: 'var(--text-2)' } },
        plotOptions: {
          pie: {
            donut: {
              size: '70%',
              labels: {
                show: true,
                total: { show: true, label: 'Orders', formatter: () => String(total) },
              },
            },
          },
        },
      }}
    />
  );
}

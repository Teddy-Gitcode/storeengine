'use client';

// Shared ApexCharts wrapper — matches the Sellzy template's chart library.
// ApexCharts touches `window`, so it must be client-only (ssr:false).
import dynamic from 'next/dynamic';
import type { ApexOptions } from 'apexcharts';

const ReactApexChart = dynamic(() => import('react-apexcharts'), { ssr: false });

export type ChartProps = {
  type: 'line' | 'area' | 'bar' | 'donut' | 'pie' | 'radialBar';
  series: ApexOptions['series'];
  options: ApexOptions;
  height?: number | string;
  width?: number | string;
};

export default function Chart({ type, series, options, height = 300, width = '100%' }: ChartProps) {
  return (
    <ReactApexChart
      type={type}
      series={series as never}
      options={options}
      height={height}
      width={width}
    />
  );
}

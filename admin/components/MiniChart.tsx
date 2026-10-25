type SparklineProps = {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  fill?: boolean;
};

export function Sparkline({ data, width = 120, height = 32, color = 'var(--green)', fill = true }: SparklineProps) {
  if (!data.length) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const stepX = data.length > 1 ? width / (data.length - 1) : 0;
  const points = data.map((v, i) => {
    const x = i * stepX;
    const y = height - 2 - ((v - min) / range) * (height - 4);
    return [x, y] as const;
  });
  const linePath = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L${width.toFixed(1)},${height} L0,${height} Z`;

  return (
    <svg className="spark" width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {fill && <path className="area" d={areaPath} fill={color} />}
      <path className="line" d={linePath} stroke={color} />
    </svg>
  );
}

type BarChartProps = {
  data: { label: string; value: number }[];
  height?: number;
  formatValue?: (n: number) => string;
  color?: string;
};

export function BarChart({ data, height = 180, formatValue, color = 'var(--green)' }: BarChartProps) {
  const max = Math.max(...data.map((d) => d.value));
  return (
    <div className="flex items-end gap-2" style={{ height }}>
      {data.map((d, i) => {
        const h = Math.round((d.value / max) * (height - 36));
        const isMax = d.value === max;
        return (
          <div key={i} className="flex flex-col items-center gap-1.5 flex-1 group">
            <span className="text-[10px] tabular-nums" style={{ color: 'var(--text-3)' }}>
              {formatValue ? formatValue(d.value) : d.value}
            </span>
            <div
              className="w-full rounded-t-md transition-all"
              style={{
                height: `${h}px`,
                background: isMax ? color : 'var(--green-light)',
                border: `1px solid ${isMax ? color : 'var(--border)'}`,
              }}
            />
            <span className="text-[10px] whitespace-nowrap" style={{ color: 'var(--text-3)' }}>
              {d.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

type DonutProps = {
  data: { label: string; value: number; color: string }[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerSub?: string;
};

export function Donut({ data, size = 140, thickness = 16, centerLabel, centerSub }: DonutProps) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={thickness} />
        {data.map((d, i) => {
          const len = (d.value / total) * c;
          const off = c - acc;
          acc += len;
          return (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={d.color}
              strokeWidth={thickness}
              strokeDasharray={`${len} ${c - len}`}
              strokeDashoffset={off}
              strokeLinecap="butt"
            />
          );
        })}
      </svg>
      {(centerLabel || centerSub) && (
        <div className="absolute text-center">
          {centerLabel && (
            <p className="font-semibold tabular-nums" style={{ fontSize: 18, color: 'var(--text-1)', lineHeight: 1 }}>
              {centerLabel}
            </p>
          )}
          {centerSub && (
            <p className="mt-1" style={{ fontSize: 10, color: 'var(--text-3)' }}>
              {centerSub}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

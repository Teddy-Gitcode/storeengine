type Props = {
  width?: number | string;
  height?: number | string;
  className?: string;
  rounded?: 'sm' | 'md' | 'lg' | 'full';
};

export function Skeleton({ width, height = 14, className = '', rounded = 'sm' }: Props) {
  const radii = { sm: 4, md: 8, lg: 12, full: 999 };
  return (
    <span
      className={`ak-skeleton ${className}`}
      style={{
        width: width ?? '100%',
        height,
        borderRadius: radii[rounded],
      }}
      aria-hidden="true"
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="ak-card p-5">
      <Skeleton width={120} height={11} />
      <div className="mt-3"><Skeleton width="65%" height={28} rounded="md" /></div>
      <div className="mt-2"><Skeleton width={150} height={11} /></div>
    </div>
  );
}

export function SkeletonTableRow({ cols = 5 }: { cols?: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i}><Skeleton width={i === 0 ? 100 : i === cols - 1 ? 60 : '80%'} height={14} /></td>
      ))}
    </tr>
  );
}

export default Skeleton;

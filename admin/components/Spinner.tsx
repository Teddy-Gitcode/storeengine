type Size = 'sm' | 'md' | 'lg' | 'xl';

export function Spinner({ size = 'md', label }: { size?: Size; label?: string }) {
  return (
    <span
      className="inline-flex items-center gap-2"
      role="status"
      aria-live="polite"
      aria-label={label || 'Loading'}
    >
      <span className={`ak-spinner size-${size}`} aria-hidden />
      {label && <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{label}</span>}
    </span>
  );
}

export function Dots() {
  return (
    <span className="ak-dots" role="status" aria-label="Loading">
      <span /><span /><span />
    </span>
  );
}

export function FullPageSpinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center" style={{ minHeight: 'calc(100vh - 200px)' }}>
      <Spinner size="lg" />
      <p className="mt-3" style={{ fontSize: 13, color: 'var(--text-2)' }}>{label}</p>
    </div>
  );
}

export default Spinner;

export type BadgeVariant =
  | 'success' | 'warning' | 'error' | 'info'
  | 'neutral' | 'purple'  | 'gold'  | 'dark';

/* Background, ink and hairline all come from variables. They used to be a
   themed background with the light theme's ink and border baked in as hex,
   which read fine on white and collapsed to 2.1:1 once the tint went dark. */
const variantStyle: Record<BadgeVariant, React.CSSProperties> = {
  success: { background: 'var(--green-light)',  color: 'var(--badge-success-ink)', border: '1px solid var(--badge-success-line)' },
  warning: { background: 'var(--gold-light)',   color: 'var(--badge-warning-ink)', border: '1px solid var(--badge-warning-line)' },
  error:   { background: 'var(--error-light)',  color: 'var(--badge-error-ink)',   border: '1px solid var(--badge-error-line)' },
  info:    { background: 'var(--info-light)',   color: 'var(--badge-info-ink)',    border: '1px solid var(--badge-info-line)' },
  neutral: { background: 'var(--surface-2)',    color: 'var(--text-3)',            border: '1px solid var(--border)' },
  purple:  { background: 'var(--purple-light)', color: 'var(--badge-purple-ink)',  border: '1px solid var(--badge-purple-line)' },
  gold:    { background: 'var(--gold-light)',   color: 'var(--badge-warning-ink)', border: '1px solid var(--badge-warning-line)' },
  dark:    { background: 'var(--surface-2)',    color: 'var(--text-2)',            border: '1px solid var(--border-2)' },
};

export default function Badge({ label, variant = 'neutral' }: { label: string; variant?: BadgeVariant }) {
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap"
      style={{ ...variantStyle[variant], borderRadius: 4, letterSpacing: '0.02em' }}
    >
      {label}
    </span>
  );
}

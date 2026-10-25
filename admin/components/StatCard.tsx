import { ArrowUpRight, ArrowDownRight, type LucideIcon } from 'lucide-react';

type Accent = 'green' | 'gold' | 'red' | 'blue' | 'purple';
type Trend = 'up' | 'down' | 'neutral';

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  trend?: Trend;
  icon?: LucideIcon; // kept for API compatibility; Sellzy cards are icon-free
  accent?: Accent;
}

// Sellzy pastel fills, keyed by the accent the caller already passes.
const PASTEL: Record<Accent, string> = {
  green: 'var(--pastel-mint)',
  gold: 'var(--pastel-gold)',
  red: 'var(--pastel-pink)',
  blue: 'var(--pastel-blue)',
  purple: 'var(--pastel-peach)',
};

/* The chip these sit in is white at 70% over a pastel, in both themes, so
   these are inks and not theme tokens — `var(--text-2)` inverted to a pale
   grey on a near-white chip. */
const trendColor: Record<Trend, string> = {
  up: '#027A38',
  down: '#CB0233',
  neutral: '#343a40',
};

export default function StatCard({ label, value, sub, trend = 'neutral', accent = 'green' }: StatCardProps) {
  return (
    <div className="anim-rise p-5" style={{ background: PASTEL[accent], borderRadius: 'var(--radius-card)' }}>
      <p style={{ fontSize: 12.5, fontWeight: 600, color: 'rgba(23,48,44,0.60)' }}>{label}</p>
      <div className="mt-2.5 flex items-end justify-between gap-3">
        <p
          style={{
            fontSize: 30,
            fontWeight: 800,
            lineHeight: 1,
            letterSpacing: '-0.02em',
            color: '#173028',  // pastel fill never themes, so neither does its ink
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {value}
        </p>
        {sub && (
          <span
            className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1"
            style={{
              fontSize: 11,
              fontWeight: 700,
              background: 'rgba(255,255,255,0.7)',
              color: trendColor[trend],
            }}
          >
            {trend === 'up' && <ArrowUpRight size={12} />}
            {trend === 'down' && <ArrowDownRight size={12} />}
            {sub}
          </span>
        )}
      </div>
    </div>
  );
}

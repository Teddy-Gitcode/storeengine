import { Wrench } from 'lucide-react';

/**
 * Marks a page that renders placeholder/demo data and isn't wired to the
 * backend yet — so it doesn't read as "broken". Shown on the not-yet-built
 * pages (kept out of the main nav until real).
 */
export default function DemoBanner({ feature }: { feature: string }) {
  return (
    <div
      className="flex items-start gap-2.5 rounded-lg px-3.5 py-3 text-[13px]"
      style={{
        background: 'var(--gold-light)',
        border: '1px solid var(--gold-border)',
        color: 'var(--text-1)',
      }}
      role="status"
    >
      <Wrench size={15} style={{ color: 'var(--gold)', marginTop: 1, flexShrink: 0 }} />
      <span>
        <strong>Demo — not yet functional.</strong> {feature} isn&apos;t connected to the backend yet;
        the data and controls below are placeholders.
      </span>
    </div>
  );
}

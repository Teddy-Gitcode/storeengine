import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';

// Accent circle-icon stat tile — pixel match for the template's order/finance
// summary cards (`bg-accent-N/60 rounded-xl p-5 flex items-center gap-4`,
// white icon circle, label + big number).
//
// The pastel fills stay vivid in both themes. Text over them is pinned back to
// ink by a descendant rule in globals.css keyed on `bg-accent-*`, so the tokens
// below are correct for the pastels AND for the `info` variant, whose
// bg-info-lighter does follow the theme.
export type StatAccent = '1' | '2' | '3' | '4' | '5' | '6' | '7' | 'info';

const ACCENT_BG: Record<StatAccent, string> = {
  '1': 'bg-accent-1',
  '2': 'bg-accent-2',
  '3': 'bg-accent-3',
  '4': 'bg-accent-4',
  '5': 'bg-accent-5',
  '6': 'bg-accent-6',
  '7': 'bg-accent-7',
  info: 'bg-info-lighter',
};

export default function OrderStatTile({
  accent,
  icon: Icon,
  label,
  value,
  href,
}: {
  accent: StatAccent;
  icon: LucideIcon;
  label: string;
  value: string;
  /* A tile that states a number a merchant then wants to act on should take
     them to the rows behind it — "3 low stock" is a question, not a fact. */
  href?: string;
}) {
  const body = (
    <>
      <div className="bg-white size-12 shrink-0 lg:size-[60px] rounded-full flex items-center justify-center">
        <Icon size={20} className="text-light-primary-text" strokeWidth={1.75} />
      </div>
      <div className="min-w-0">
        <p className="text-sm mb-1 text-light-secondary-text font-semibold font-public-sans leading-tight line-clamp-2">{label}</p>
        <p className="text-2xl font-bold text-light-primary-text font-dm-sans tabular-nums">{value}</p>
      </div>
    </>
  );
  const shell = `${ACCENT_BG[accent]} rounded-xl p-5 flex items-center gap-4`;

  if (href) {
    return (
      <Link
        href={href}
        className={`${shell} transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary`}
      >
        {body}
      </Link>
    );
  }

  return (
    <div className={shell}>
      {body}
    </div>
  );
}

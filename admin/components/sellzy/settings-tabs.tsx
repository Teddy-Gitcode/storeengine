import Link from 'next/link';

export type SettingsTabKey = 'identity' | 'storefront' | 'payments' | 'seo' | 'maintenance';

const TABS: { key: SettingsTabKey; label: string }[] = [
  { key: 'identity', label: 'Identity' },
  { key: 'storefront', label: 'Storefront' },
  { key: 'payments', label: 'Payments' },
  { key: 'seo', label: 'SEO' },
  { key: 'maintenance', label: 'Maintenance' },
];

/** The settings sub-nav. One page, five tabs on `?tab=`, where there used to be
 *  five routes with near-identical headers and three of them editing the same
 *  fields. */
export default function SettingsTabs({ active }: { active: SettingsTabKey }) {
  return (
    <nav className="flex gap-6 overflow-x-auto sm:gap-10" style={{ borderBottom: '1px solid var(--border)' }}>
      {TABS.map((tab) => {
        const isActive = tab.key === active;
        return (
          <Link
            key={tab.key}
            href={tab.key === 'identity' ? '/settings' : `/settings?tab=${tab.key}`}
            aria-current={isActive ? 'page' : undefined}
            className="whitespace-nowrap py-3 text-sm font-semibold transition-colors"
            style={{
              borderBottom: `3px solid ${isActive ? 'var(--brand)' : 'transparent'}`,
              color: isActive ? 'var(--text-1)' : 'var(--text-3)',
            }}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

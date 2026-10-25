// Demo: answer the API from bundled fixtures, also while `next build` prerenders.
import '@/demo/server-fetch';
import type { Metadata } from 'next';
import './globals.css';
import Shell from '@/components/Shell';
import { getAdminMe, getAdminToken, getOrderStageCounts, getStoreSettings } from '@/lib/admin-api';
import type { Viewer } from '@/lib/admin-access';
import type { StageCounts } from '@/lib/order-stages';

export const metadata: Metadata = {
  title: 'Store Admin',
  description: 'Staff administration portal',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let businessName = 'Store Admin';
  // Who is signed in and what their roles reach, so the menu only offers pages
  // they can open. Null (API down) shows the full menu; the API still refuses.
  let viewer: Viewer = null;
  // How much work is waiting at each fulfilment stage, so the queues in the
  // menu carry their own number rather than having to be opened to find out.
  let stageCounts: StageCounts | null = null;
  try {
    if (await getAdminToken()) {
      const [settings, me, counts] = await Promise.all([
        getStoreSettings().catch(() => null),
        getAdminMe().catch(() => null),
        getOrderStageCounts().catch(() => null),
      ]);
      stageCounts = counts;
      businessName = settings?.business_name || businessName;
      if (me) {
        viewer = {
          name: me.full_name || me.username,
          email: me.email,
          avatarUrl: me.avatar_url,
          isSuperuser: me.is_superuser,
          roles: me.roles,
          access: me.access,
        };
      }
    }
  } catch {
    // Unauthenticated or API offline — fall back to the neutral name.
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Sellzy template fonts (Public Sans / DM Sans / Urbanist) are bundled
            locally via @font-face in globals.css — same woff2 files + Arial-metric
            fallbacks as the template, so no CDN and identical rendering. */}
        {/* Apply the saved theme before paint. Default is light (OS pref is
            intentionally not followed); dark is opt-in only. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var t=localStorage.getItem('admin-theme');document.documentElement.setAttribute('data-theme',t==='dark'?'dark':'light');}catch(e){}})();"
          }}
        />
      </head>
      <body className="antialiased">
        <Shell businessName={businessName} viewer={viewer} queueCounts={stageCounts?.queues ?? null}>
          {children}
        </Shell>
      </body>
    </html>
  );
}

// Demo: answer the API from bundled fixtures, also while `next build` prerenders.
import "@/demo/server-fetch";
import type { Metadata } from "next";
import { publicMediaUrl } from "@/lib/images";
import { Nunito_Sans, Raleway } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MobileBottomBar from "@/components/MobileBottomBar";
import ChromeGate from "@/components/ChromeGate";
import AwaitingPaymentBanner from "@/components/AwaitingPaymentBanner";
import AssistantLauncher from "@/components/AssistantLauncher";
import AuthHydrator from "@/components/AuthHydrator";
import PromoPopupModal from "@/components/PromoPopupModal";
import MarketingTags from "@/components/MarketingTags";
import MaintenanceScreen from "@/components/MaintenanceScreen";
import { getStoreSettings, themeCssVariables } from "@/lib/settings-api";
import { getPromoPopups } from "@/lib/content-api";
import { getMarketingTags } from "@/lib/marketing-api";
import { StoreProvider } from "@/lib/store-context";
import { cookies, headers } from "next/headers";

import { configureCurrency } from "@/lib/format";
import { CURRENCY_COOKIE, shopperCurrency } from "@/lib/shopper-currency";

/* Self-hosted rather than fetched from the Google CDN at runtime: next/font
   downloads the woff2 at build time, serves it same-origin behind the app's
   own cache headers, and generates a metric-matched local fallback so the
   swap costs no layout shift. It also drops two third-party preconnects and
   one render-blocking stylesheet from every page. */
/* The Shoppe pairing the app uses: Raleway, heavy, for anything that names a
   page or a section; Nunito Sans for everything a shopper reads or taps. */
const bodyFont = Nunito_Sans({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  display: "swap",
  variable: "--font-sans",
  fallback: ["system-ui", "sans-serif"],
});

const headingFont = Raleway({
  subsets: ["latin"],
  weight: ["700", "800"],
  display: "swap",
  variable: "--font-display",
  fallback: ["system-ui", "sans-serif"],
});

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getStoreSettings();
  // Settings → SEO wins where it is filled in; branding is the fallback.
  const fallbackTitle = settings.tagline
    ? `${settings.business_name} — ${settings.tagline}`
    : settings.business_name;
  const title = settings.meta_title || fallbackTitle;
  const description = settings.meta_description || settings.tagline || settings.business_name;
  // Absolute: a crawler reading these tags has no origin to resolve a path
  // against. Everything else on the page keeps the path — see `mediaSrc`.
  const image = publicMediaUrl(settings.og_image_url) || undefined;

  return {
    title: { default: title, template: `%s — ${settings.business_name}` },
    description,
    keywords: settings.meta_keywords || undefined,
    icons: settings.favicon_url ? { icon: settings.favicon_url } : undefined,
    openGraph: {
      title,
      description,
      siteName: settings.business_name,
      type: "website",
      images: image ? [image] : undefined
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      images: image ? [image] : undefined
    },
    verification: settings.google_site_verification
      ? { google: settings.google_site_verification }
      : undefined,
    // A closed store must not get its holding page indexed in place of the
    // real one — the maintenance window would outlive itself in search.
    robots: settings.maintenance_mode ? { index: false, follow: false } : undefined
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = await getStoreSettings();
  // The country the middleware worked out at the edge, which is also what the
  // delivery-country preselect reads. Currency follows it: a shopper at home
  // sees the prices as written, everyone else sees them converted — and
  // checkout charges the same way, from the same rule on the server.
  const jar = await cookies();
  // Vercel's own geolocation header first: it is on every request, whereas
  // the middleware's cookie is only written on /checkout and /account — so a
  // shopper just browsing from abroad was "unknown" and shown shillings.
  const edge = ((await headers()).get("x-vercel-ip-country") ?? "").trim().toUpperCase();
  const country = (/^[A-Z]{2}$/.test(edge) && !["XX", "T1"].includes(edge) ? edge : null)
    ?? jar.get("shopper_country")?.value
    ?? null;
  // A Kenyan shopper's KSh/USD pick (the header switch). Honoured only where
  // it is theirs to make — the same rule checkout applies on the server.
  const currencyChoice = jar.get(CURRENCY_COOKIE)?.value ?? null;
  const shopper = shopperCurrency(settings, country, currencyChoice);
  configureCurrency({ ...shopper, locale: settings.locale });

  // Maintenance replaces the entire storefront, so nothing below it is worth
  // fetching — no popups to show and no analytics worth firing on a page the
  // shopper cannot act on.
  const closed = settings.maintenance_mode;
  const [promoPopups, marketingTags] = closed
    ? [[], []]
    : await Promise.all([getPromoPopups(), getMarketingTags()]);

  // The document language follows the store's locale — "en-KE" is not "en",
  // and screen readers and translation both act on the difference.
  return (
    <html
      lang={settings.locale || "en"}
      className={`${bodyFont.variable} ${headingFont.variable}`}
      suppressHydrationWarning
    >
      <head>
        <style dangerouslySetInnerHTML={{ __html: themeCssVariables(settings) }} />
        {/* Set the saved theme before first paint to avoid a flash (FOUC). */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||t==='light')document.documentElement.setAttribute('data-theme',t);}catch(e){}})();"
          }}
        />
      </head>
      <body className={closed ? "bg-bg text-ink" : "bg-bg text-ink pb-16 lg:pb-0"}>
        {closed ? (
          <MaintenanceScreen settings={settings} />
        ) : (
          <>
            <MarketingTags tags={marketingTags} />
            <StoreProvider settings={settings} country={country} currencyChoice={currencyChoice}>
              <AuthHydrator />
              <PromoPopupModal popups={promoPopups} />
              <ChromeGate>
                <Header />
                {/* An order held unpaid, counting down — the way back to it. */}
                <AwaitingPaymentBanner />
              </ChromeGate>
              <main>{children}</main>
              <ChromeGate>
                <Footer />
                <MobileBottomBar />
                {/* Inside ChromeGate so it stays off checkout and the other
                    chrome-free routes, where a floating bubble would sit on top
                    of the payment step. */}
                <AssistantLauncher />
              </ChromeGate>
            </StoreProvider>
          </>
        )}
      </body>
    </html>
  );
}

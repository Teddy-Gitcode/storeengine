import Script from "next/script";
import type { MarketingTag } from "@/lib/marketing-api";

/* The vendor snippets, verbatim from each provider's install docs, with the id
   interpolated. Ids are already sanitised server-side; they're cleaned again
   here because this is where they enter an inline <script>. */

const clean = (value: string) => (value || "").replace(/[^A-Za-z0-9_-]/g, "");
const digits = (value: string) => (value || "").replace(/\D/g, "");

function GoogleAnalytics({ id }: { id: string }) {
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${id}`} strategy="afterInteractive" />
      <Script
        id="ga4-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${id}');`,
        }}
      />
    </>
  );
}

function GoogleTagManager({ id }: { id: string }) {
  return (
    <>
      <Script
        id="gtm-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${id}');`,
        }}
      />
      <noscript>
        <iframe
          src={`https://www.googletagmanager.com/ns.html?id=${id}`}
          height="0"
          width="0"
          style={{ display: "none", visibility: "hidden" }}
          title="Google Tag Manager"
        />
      </noscript>
    </>
  );
}

function MetaPixel({ id }: { id: string }) {
  return (
    <>
      <Script
        id="meta-pixel-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${id}');fbq('track','PageView');`,
        }}
      />
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height="1"
          width="1"
          alt=""
          style={{ display: "none" }}
          src={`https://www.facebook.com/tr?id=${id}&ev=PageView&noscript=1`}
        />
      </noscript>
    </>
  );
}

function TikTokPixel({ id }: { id: string }) {
  return (
    <Script
      id="tiktok-pixel-init"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: `!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=d.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=d.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};ttq.load('${id}');ttq.page();}(window,document,'ttq');`,
      }}
    />
  );
}

function Hotjar({ id }: { id: string }) {
  return (
    <Script
      id="hotjar-init"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: `(function(h,o,t,j,a,r){h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};h._hjSettings={hjid:${id},hjsv:6};a=o.getElementsByTagName('head')[0];r=o.createElement('script');r.async=1;r.src=t+h._hjSettings.hjid+j;a.appendChild(r);})(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');`,
      }}
    />
  );
}

/** Renders whatever the admin switched on under Marketing Tools; nothing at
 *  all for a store with no integrations configured. */
export default function MarketingTags({ tags }: { tags: MarketingTag[] }) {
  return (
    <>
      {tags.map((tag) => {
        switch (tag.key) {
          case "google-analytics": {
            const id = clean(tag.config.measurement_id);
            return id ? <GoogleAnalytics key={tag.key} id={id} /> : null;
          }
          case "google-tag-manager": {
            const id = clean(tag.config.container_id);
            return id ? <GoogleTagManager key={tag.key} id={id} /> : null;
          }
          case "meta-pixel": {
            const id = clean(tag.config.pixel_id);
            return id ? <MetaPixel key={tag.key} id={id} /> : null;
          }
          case "tiktok-pixel": {
            const id = clean(tag.config.pixel_id);
            return id ? <TikTokPixel key={tag.key} id={id} /> : null;
          }
          case "hotjar": {
            // hjid is used as a number in the snippet, never a string.
            const id = digits(tag.config.site_id);
            return id ? <Hotjar key={tag.key} id={id} /> : null;
          }
          default:
            return null;
        }
      })}
    </>
  );
}

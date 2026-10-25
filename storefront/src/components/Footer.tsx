import Link from "next/link";
import { getStoreSettings } from "@/lib/settings-api";
import { getLegalPage } from "@/lib/content-api";
import SocialIcon from "@/components/SocialIcon";

export default async function Footer() {
  // Link labels follow whatever the documents are called in the admin
  // (Content Management → Privacy Policy / Terms & Condition).
  const [settings, privacy, terms] = await Promise.all([
    getStoreSettings(),
    getLegalPage("privacy"),
    getLegalPage("terms"),
  ]);
  const year = new Date().getFullYear();
  const location = [settings.address, settings.city, settings.country].filter(Boolean).join(", ");
  const socials = Object.entries(settings.social_links || {}).filter(([, url]) => Boolean(url));

  return (
    <footer className="bg-[#202020] text-white mt-16">
      <div className="container-store grid grid-cols-2 md:grid-cols-4 gap-8 py-12">
        <div className="col-span-2 md:col-span-1">
          <Link href="/" className="inline-flex items-center mb-3" aria-label={`${settings.business_name} home`}>
            {settings.logo_url ? (
              // Plain <img>: the logo is a merchant-supplied URL from any host,
              // same as the header.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={settings.logo_url} alt="" className="h-9 w-auto" />
            ) : (
              <span className="text-[22px] font-bold uppercase">{settings.business_name}</span>
            )}
          </Link>
          <p className="text-sm opacity-70 max-w-xs">{settings.tagline}</p>
          {location && <p className="text-sm opacity-70 max-w-xs mt-2">{location}</p>}
          {/* The marks sit with the brand rather than in the Company column,
              where they were plain lowercase words ("facebook", "instagram")
              indistinguishable from the About and Contact links above them. */}
          {socials.length > 0 && (
            <ul className="flex flex-wrap items-center gap-2 mt-4">
              {socials.map(([name, url]) => (
                <li key={name}>
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={name.charAt(0).toUpperCase() + name.slice(1)}
                    title={name.charAt(0).toUpperCase() + name.slice(1)}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/85
                               transition-colors hover:bg-accent hover:text-accent-dark"
                  >
                    <SocialIcon name={name} className="h-[15px] w-[15px]" />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h3 className="text-[13px] font-semibold mb-3 uppercase tracking-wider opacity-85">Shop</h3>
          <ul className="flex flex-col gap-2 text-sm opacity-80">
            <li><Link href="/shop" className="hover:text-accent">All products</Link></li>
            <li><Link href="/offers" className="hover:text-accent">Offers</Link></li>
            <li><Link href="/cart" className="hover:text-accent">Cart</Link></li>
            <li><Link href="/track" className="hover:text-accent">Track order</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="text-[13px] font-semibold mb-3 uppercase tracking-wider opacity-85">Company</h3>
          <ul className="flex flex-col gap-2 text-sm opacity-80">
            <li><Link href="/about" className="hover:text-accent">About</Link></li>
            <li><Link href="/contact" className="hover:text-accent">Contact</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="text-[13px] font-semibold mb-3 uppercase tracking-wider opacity-85">Help</h3>
          <ul className="flex flex-col gap-2 text-sm opacity-80">
            <li><Link href="/contact#faq" className="hover:text-accent">FAQs</Link></li>
            <li><Link href="/track" className="hover:text-accent">Track order</Link></li>
            {settings.support_email && (
              <li>
                <a href={`mailto:${settings.support_email}`} className="hover:text-accent">
                  {settings.support_email}
                </a>
              </li>
            )}
            {settings.support_phone && (
              <li>
                <a href={`tel:${settings.support_phone}`} className="hover:text-accent">
                  {settings.support_phone}
                </a>
              </li>
            )}
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-store py-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-xs">
          <p className="opacity-60">© {year} {settings.business_name} · All rights reserved</p>
          <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 opacity-80">
            <Link href="/legal/privacy" className="hover:text-accent">
              {privacy?.title || "Privacy Policy"}
            </Link>
            <Link href="/legal/terms" className="hover:text-accent">
              {terms?.title || "Terms & Conditions"}
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}

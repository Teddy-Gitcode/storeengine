import Link from "next/link";
import { getStoreSettings } from "@/lib/settings-api";
import { getLegalPage } from "@/lib/content-api";
import LegalBody from "@/components/LegalBody";

// The tab title follows whatever the page is called in the admin.
export async function generateMetadata() {
  const managed = await getLegalPage("privacy");
  return { title: managed?.title || "Privacy Notice" };
}

export default async function PrivacyPage() {
  /* Edited in the admin under Promotions & Content → Privacy & Policy.

     The fallback used to be a complete notice — what we collect, how it is
     used, "we do not sell customer data", a cookie statement — written by the
     template rather than the merchant. A privacy notice is a legal
     undertaking; making one up on a merchant's behalf is the one thing this
     page must not do. It now says the notice is unpublished. */
  const [settings, managed] = await Promise.all([getStoreSettings(), getLegalPage("privacy")]);

  return (
    <div className="container-store py-10 max-w-3xl">
      <header className="mb-8">
        <p className="text-xs uppercase tracking-widest text-brand font-semibold">Legal</p>
        <h1 className="text-[32px] font-semibold leading-tight text-ink mt-2">
          {managed?.title || "Privacy Notice"}
        </h1>
      </header>

      {managed ? (
        <LegalBody document={managed} />
      ) : (
        <div className="rounded-2xl border border-line/10 bg-surface-alt px-6 py-8">
          <p className="text-[15px] leading-relaxed text-ink">
            Our privacy notice has not been published here yet. To ask what we hold about you, or to
            have it corrected or deleted, get in touch and we&apos;ll answer directly.
          </p>
          <p className="mt-4 text-[15px]">
            {settings.support_email ? (
              <a href={`mailto:${settings.support_email}`} className="text-brand underline">
                {settings.support_email}
              </a>
            ) : (
              <Link href="/contact" className="text-brand underline">Contact us</Link>
            )}
          </p>
        </div>
      )}
    </div>
  );
}

import Link from "next/link";
import { getStoreSettings } from "@/lib/settings-api";
import { getLegalPage } from "@/lib/content-api";
import LegalBody from "@/components/LegalBody";

// The tab title follows whatever the page is called in the admin.
export async function generateMetadata() {
  const managed = await getLegalPage("terms");
  return { title: managed?.title || "Conditions of Use" };
}

export default async function TermsPage() {
  /* Edited in the admin under Promotions & Content → Terms & Conditions.

     There used to be a full set of terms here as a fallback — a 7-day returns
     window, a cash-on-delivery clause, a tax statement — shown whenever the
     CMS was empty. They read as the merchant's own terms and were binding in
     tone while being written by nobody, which is worse than having no terms
     page at all. An unwritten document now says so and points at support. */
  const [settings, managed] = await Promise.all([getStoreSettings(), getLegalPage("terms")]);

  return (
    <div className="container-store py-10 max-w-3xl">
      <header className="mb-8">
        <p className="text-xs uppercase tracking-widest text-brand font-semibold">Legal</p>
        <h1 className="text-[32px] font-semibold leading-tight text-ink mt-2">
          {managed?.title || "Conditions of Use"}
        </h1>
      </header>

      {managed ? <LegalBody document={managed} /> : <Unpublished settings={settings} />}
    </div>
  );
}

function Unpublished({ settings }: { settings: { support_email: string } }) {
  return (
    <div className="rounded-2xl border border-line/10 bg-surface-alt px-6 py-8">
      <p className="text-[15px] leading-relaxed text-ink">
        Our conditions of use have not been published here yet. For anything about an order —
        pricing, payment, delivery or returns — get in touch before you buy and we&apos;ll confirm
        the terms that apply.
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
  );
}

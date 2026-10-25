import Link from "next/link";
import { getStoreSettings } from "@/lib/settings-api";
import { getCategories } from "@/lib/catalog-api";

export const metadata = { title: "About" };

/* This page used to be the template's own story — "an independent online
   store", "we pick products we believe in", a stat panel claiming a sub-day
   support response and a "100% curated" catalogue, and a wholesale quote the
   merchant had never offered. None of it came from the merchant and none of it
   was true of any particular one.

   What is left is only what the store itself can vouch for: its name and
   tagline, the ranges actually in its catalogue, and where to reach it. A
   merchant who wants a story writes one — until then the page says nothing
   on their behalf. */

export default async function AboutPage() {
  const [settings, categories] = await Promise.all([getStoreSettings(), getCategories()]);
  const name = settings.business_name;
  const contact = settings.support_email || settings.support_phone || settings.whatsapp;

  return (
    <div className="container-store py-10 max-w-3xl">
      <header className="mb-8">
        <p className="text-xs uppercase tracking-widest text-brand font-semibold">About {name}</p>
        {settings.tagline && (
          <h1 className="text-[36px] font-semibold leading-tight text-ink mt-2">{settings.tagline}</h1>
        )}
        {!settings.tagline && <h1 className="text-[36px] font-semibold leading-tight text-ink mt-2">{name}</h1>}
      </header>

      {categories.length > 0 && (
        <Section title="What we sell">
          <ul className="flex flex-wrap gap-2 mt-1">
            {categories.map((category) => (
              <li key={category.slug}>
                <Link
                  href={`/shop/${category.slug}`}
                  className="inline-block rounded-full border border-line/15 px-3.5 py-1.5 text-[13px] text-ink hover:border-brand hover:text-brand transition-colors"
                >
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Get in touch">
        <p className="text-[15px] leading-relaxed text-ink">
          For enquiries — including bulk and wholesale — use our{" "}
          <Link href="/contact" className="text-brand underline">contact page</Link>
          {contact ? (
            <>
              {" "}or reach us on <span className="font-medium">{contact}</span>
            </>
          ) : null}
          .
        </p>
      </Section>

      <Section title="Legal">
        <p className="text-[15px] leading-relaxed text-ink">
          Our{" "}
          <Link href="/legal/privacy" className="text-brand underline">privacy notice</Link> and{" "}
          <Link href="/legal/terms" className="text-brand underline">conditions of use</Link> set out
          how we handle your details and the terms your order is placed under.
        </p>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="my-10 scroll-mt-32">
      <h2 className="text-[22px] font-semibold text-ink mb-3">{title}</h2>
      {children}
    </section>
  );
}

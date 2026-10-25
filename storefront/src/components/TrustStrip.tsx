import Money from "@/components/ui/Money";
import { getStoreSettings } from "@/lib/settings-api";
import { shippingTerms } from "@/lib/shipping";

/* Every tile here is a promise made to a shopper in the merchant's name, so
   each one has to come from something the merchant actually filled in. The
   template shipped four fixed claims — free delivery "on qualifying orders"
   with no threshold behind it, a quality guarantee, a support line with no
   address to reach — none of which any store had agreed to. What is left is
   derived from settings, and a store that has configured none of it gets no
   strip rather than four invented guarantees.

   Flex rather than a fixed four-column grid: the row is however long the
   merchant's settings make it, and one filled tile beside three empty cells
   is what a grid would have given. */

export default async function TrustStrip() {
  const settings = await getStoreSettings();
  const { threshold, flatFee } = shippingTerms(settings);
  const supportContact = settings.support_email || settings.support_phone || settings.whatsapp;

  type Item = { title: string; sub: React.ReactNode };
  const candidates: (Item | false | "")[] = [
    threshold > 0 && { title: "Free delivery", sub: <>On orders over <Money amount={threshold} /></> },
    threshold <= 0 && flatFee > 0 && { title: "Delivery", sub: <>Flat rate of <Money amount={flatFee} /></> },
    supportContact && { title: "Talk to us", sub: supportContact },
  ];
  const items = candidates.filter((i): i is Item => Boolean(i));

  if (!items.length) return null;

  return (
    <section aria-label="Delivery and support" className="flex flex-wrap gap-3 my-8">
      {items.map((i) => (
        <div
          key={i.title}
          className="flex-1 min-w-[200px] bg-surface border border-line/5 rounded-lg p-4 text-center"
        >
          <div className="font-semibold text-[14px] text-ink mb-0.5">{i.title}</div>
          <div className="text-xs text-ink-muted break-words">{i.sub}</div>
        </div>
      ))}
    </section>
  );
}

import Link from "next/link";
import { ArrowRight, PackageX } from "lucide-react";

export const metadata = { title: "Product unavailable" };

/* A product link that leads nowhere — almost always one the shop has since
   taken down, reached from an old share, a search result or a bookmark. Say
   that, rather than a bare "404", and offer the way back to shopping. */
export default function ProductNotFound() {
  return (
    <div className="container-store py-20 text-center">
      <span className="mx-auto mb-5 grid h-20 w-20 place-items-center rounded-full bg-blob text-brand">
        <PackageX size={36} strokeWidth={1.6} aria-hidden />
      </span>
      <h1 className="font-display text-[26px] font-extrabold text-ink">This product is no longer available</h1>
      <p className="mx-auto mt-2 mb-6 max-w-md text-ink-muted">
        It may have sold out for good or been taken off the shop. Plenty more where it came from, though.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link href="/shop" className="btn-primary">Browse all products</Link>
        <Link href="/categories" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline">
          Shop by category <ArrowRight size={15} aria-hidden />
        </Link>
      </div>
    </div>
  );
}

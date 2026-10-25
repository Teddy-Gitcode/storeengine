import Link from "next/link";
import { ArrowRight } from "lucide-react";

export const metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <div className="container-store py-20 text-center">
      <div aria-hidden className="text-[96px] font-bold text-brand leading-none">404</div>
      <h1 className="text-[22px] font-semibold text-ink mt-2 mb-1">Page not found</h1>
      <p className="text-ink-muted mb-6">The page you were looking for has been moved or no longer exists.</p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link href="/shop" className="btn-primary">Browse all products</Link>
        <Link href="/categories" className="inline-flex items-center gap-1.5 text-sm text-brand font-semibold hover:underline">
          Shop by category <ArrowRight size={15} aria-hidden />
        </Link>
      </div>
    </div>
  );
}

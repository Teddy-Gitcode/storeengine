import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// Rounded pill pagination — pixel match for the template's page-number bar
// (`w-10 h-7.5 rounded-full …`, active page `bg-primary-lighter text-primary-dark`).
export default function OrderPagination({
  page,
  totalPages,
  makeHref,
}: {
  page: number;
  totalPages: number;
  makeHref: (page: number) => string;
}) {
  if (totalPages <= 1) return null;

  // Show a small window of page numbers around the current page (template
  // shows every page number, but real data can have many more pages).
  const windowSize = 5;
  let start = Math.max(1, page - Math.floor(windowSize / 2));
  const end = Math.min(totalPages, start + windowSize - 1);
  start = Math.max(1, end - windowSize + 1);
  const pages = Array.from({ length: end - start + 1 }, (_, i) => start + i);

  const arrowBtn = 'w-10 h-[30px] flex items-center justify-center rounded-full hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-gray-600';

  return (
    <div className="flex items-center gap-2">
      {page > 1 ? (
        <Link href={makeHref(page - 1)} className={arrowBtn} aria-label="Previous page">
          <ChevronLeft className="size-5" />
        </Link>
      ) : (
        <button disabled className={arrowBtn} aria-label="Previous page">
          <ChevronLeft className="size-5" />
        </button>
      )}
      <div className="flex items-center gap-1">
        {pages.map((p) => (
          <Link
            key={p}
            href={makeHref(p)}
            className={`w-10 h-[30px] flex items-center justify-center rounded-full text-sm transition-colors font-public-sans ${
              p === page ? 'bg-primary-lighter text-primary-dark font-semibold' : 'text-gray-600 hover:bg-gray-50 font-medium'
            }`}
          >
            {p}
          </Link>
        ))}
      </div>
      {page < totalPages ? (
        <Link href={makeHref(page + 1)} className={arrowBtn} aria-label="Next page">
          <ChevronRight className="size-5" />
        </Link>
      ) : (
        <button disabled className={arrowBtn} aria-label="Next page">
          <ChevronRight className="size-5" />
        </button>
      )}
    </div>
  );
}



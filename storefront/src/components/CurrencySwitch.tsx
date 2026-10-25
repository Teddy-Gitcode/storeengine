"use client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useShopperLocale } from "@/lib/store-context";
import { CURRENCY_COOKIE } from "@/lib/shopper-currency";

/* KSh | USD, for the shoppers who get a choice — those in the store's home
 * country (or whose country the edge couldn't tell). Everyone else sees one
 * currency and no switch, so this renders nothing for them.
 *
 * The pick is a cookie the root layout reads, so the next render — server and
 * client alike — prices everything in it, and checkout sends it on to the
 * server, which charges it only where it is allowed. */
export default function CurrencySwitch({ className = "" }: { className?: string }) {
  const { options, current } = useShopperLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  if (options.length < 2) return null;

  function pick(code: string) {
    if (code === current.code) return;
    document.cookie = `${CURRENCY_COOKIE}=${code}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    startTransition(() => router.refresh());
  }

  return (
    <div
      role="group"
      aria-label="Show prices in"
      className={`inline-flex items-center rounded-full bg-surface-alt p-0.5 text-[12px] font-bold ${
        pending ? "opacity-60" : ""
      } ${className}`}
    >
      {options.map((option) => {
        const active = option.code === current.code;
        return (
          <button
            key={option.code}
            type="button"
            onClick={() => pick(option.code)}
            aria-pressed={active}
            title={`Show prices in ${option.code}`}
            className={`rounded-full px-2.5 py-1 transition-colors ${
              active ? "bg-brand text-on-brand" : "text-ink-muted hover:text-ink"
            }`}
          >
            {option.code === "KES" ? "KSh" : option.code}
          </button>
        );
      })}
    </div>
  );
}

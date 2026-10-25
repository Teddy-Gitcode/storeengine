# Storefront conventions

Written 2026-09-08, after an audit found ~130 hand-rolled card variants across
four radii, five border opacities and six paddings; three implementations of a
star rating; three of the add-to-cart button pair; seven empty states; and a
shipping rule copied into six files. None of that was a decision — it was what
happens when every feature invents its own version of the last one.

The rule this file exists to enforce: **before writing markup, look for the
primitive.** If one exists, use it. If one nearly exists, extend it. Only when
neither is true do you write something new — and then it goes in `ui/`.

## Where things live

```
src/
  app/          routes only — page.tsx, loading.tsx, api/
  components/
    ui/         design-system primitives. Nothing here knows about products,
                carts or the API — it takes props and renders.
    product/    product-shaped components: cards, buy buttons
    pdp/        the product detail page's own parts (buy box, swatches, the
                selection context)
  lib/          data fetching (*-api.ts), stores (*-store.ts), hooks (use-*.ts),
                pure helpers (format, stock, shipping, product-tone)
```

Page-specific components that only one route uses belong beside that route, not
in the shared folder. (`Header`, `HeroShelf`, `QuickPicks`, `TrustStrip` and a
dozen others are still in the flat `components/` root — moving them is pending.)

## The primitives

| Use | For |
|---|---|
| `ui/Card` | any bordered panel. Tones: `surface`, `alt`, `dashed`, `quiet`. Paddings: `none`, `sm`, `md`, `lg` |
| `ui/Pill` | badges, chips, tags. Tones: `danger`, `accent`, `brand`, `neutral`, `outline`, `overlay` |
| `ui/Price` | any price. Handles the raised symbol and cents, and the struck-through was-price |
| `ui/SectionHeader` | a section title, with an optional "see all" action |
| `ui/Shelf` | a row you scroll sideways. Owns the bleed, the snapping and the hidden scrollbar |
| `ui/EmptyState` | "nothing here yet", with optional icon and CTA |
| `ui/Alert` | inline danger/info/success messages |
| `ui/Accordion` | a foldable section |
| `ui/RowLink` | a full-width row that leads somewhere |
| `ui/Breadcrumb` | Home › Shop › Category › This |
| `Stars` | a rating. Fractional — 4.4 and 4.6 must not draw the same |
| `product/ProductCard` | the grid card, with buy buttons |
| `product/ProductMiniCard` | the narrow card inside a `Shelf` |
| `product/BuyButtons` | the Add to cart / Buy now pair. Takes the result of `useBuy` |

In CSS (`globals.css`) only three utilities survive, because they have real
adoption: `.container-store`, `.btn-primary`/`.btn-ghost`, `.soft-input`. Reach
for those rather than retyping their class strings. Everything else that used to
live there had zero call sites and has been deleted.

## Logic that must not be re-derived

- **`lib/use-buy.ts`** — adding to the cart, the confirmation pause, the button
  label, and whether this product (or the chosen variation) can be bought.
- **`lib/use-payment-methods.ts`** — what the merchant accepts.
- **`lib/shipping.ts`** — `shippingTerms`, `shippingCost`, `freeShippingProgress`.
  Never read `settings.free_shipping_threshold` directly.
- **`lib/stock.ts`** — `stockStatus` and `stockToneClass` together. The colour of
  "only 2 left" is not a per-page decision.
- **`lib/format.ts`** — `money()` and `priceParts()`. Never `toFixed(2)` for display.
- **`lib/product-tone.ts`** — the pastel behind a product photo.

## Styling

- **Radius**: cards `rounded-xl`, controls and inputs `rounded-md`/`rounded-lg`,
  pills and CTAs `rounded-full`. Photos inside a card: `rounded-lg`.
- **Colour**: always tokens — `bg-surface`, `bg-surface-alt`, `text-ink`,
  `text-ink-muted`, `text-ink-faint`, `border-line`, `bg-brand`, `bg-accent`,
  `text-danger`. A raw hex will not follow dark mode or the merchant's brand
  colour. The only sanctioned hexes are the photo backdrops in `product-tone.ts`.
- **Type**: the storefront uses explicit pixel sizes (`text-[13px]`). Stay on the
  steps already in use — 11, 12, 12.5, 13, 13.5, 14, 15, 17, 21, 25, 30 — rather
  than adding a 32nd value.

## Data

- A **server component page** fetches and passes props down. A component that
  fetches its own data has no caller controlling it, and the home page currently
  fetches the same products three times because of it.
- **Client fetching** (`useEffect`) is for session-scoped things only: the cart,
  auth, wishlist, support threads, recommendations.
- **Stores** (`zustand`) hold browser state that outlives a page. **Context**
  holds state shared across one page's components — see `pdp/selection.tsx`.

## Still outstanding

- `app/account/page.tsx` is 1062 lines with 13 components defined inline; it
  wants breaking into `components/account/`.
- Single-use components still sit in the flat `components/` root.
- `HeroShelf`, `QuickPicks` and `TrustStrip` self-fetch instead of taking props.
- No `Button` or `TextField` primitive yet — buttons still use `.btn-primary`
  or inline classes, and `SelectField` lives inside the account page.

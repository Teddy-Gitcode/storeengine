# StoreEngine demo

A static, backend-free demo of StoreEngine, the white-label commerce platform in
[e-cormmece](https://github.com/Teddy-Gitcode/e-cormmece). It ships the real
Next.js storefront and the real staff admin, with the Django API swapped for
recorded responses.

| App | Folder | Suggested domain |
|---|---|---|
| Storefront | `storefront/` | storeengine.teddynova.com |
| Admin | `admin/` | storeengine-admin.teddynova.com |

## What's real and what isn't

- **Products, categories, photos and store settings** come from the live
  TedStore catalogue (133 products), rebranded as StoreEngine.
- **Customers, orders, payments, refunds, reviews and support tickets** are
  generated. Customers are `johndoe1` to `johndoe48` (`@example.com`) in ten
  countries. Kenyan orders are in KES, UK orders in GBP and the rest in USD;
  dashboard totals convert them all back to KES. Real checkout offers only the
  store currency and one other (USD), so the GBP orders are seeded directly.
  No real shopper data is in this repo.
- **Writes are never stored.** Saving in the admin succeeds and echoes the
  record back, but the next page load shows the original data. Any visitor
  could otherwise rewrite what the next one sees.
- **Checkout works end to end.** The order lives in the pay link's token. An
  M-Pesa or Paystack "payment" confirms itself after about six seconds, and
  cash on delivery confirms straight away. Coupons `WELCOME10` and `FREESHIP`
  apply.
- **Sign-in accepts any email and password** and signs you in as the demo
  shopper. The admin has no login wall.
- **Dates move with time.** Every timestamp shifts forward by the days since
  recording, so recent orders always look recent.

## How it works

Both apps set `NEXT_PUBLIC_API_BASE_URL` to `https://demo-api.storeengine.invalid/api`,
an address that doesn't exist (see each app's `.env`).

- **Server:** `demo/server-fetch.ts` patches `fetch` so requests to that address
  are answered by `demo/demo-api.ts`. It's installed from `instrumentation.ts`
  and from the root layout, because `next build` prerenders without running
  instrumentation.
- **Browser:** `instrumentation-client.ts` sends the same requests to the
  app's own `/demo-api/*` route, which runs the same code. The fixtures never
  reach the browser bundle.
- **Fixtures:** `fixtures/*.json` maps `path?query` to the recorded response.
  Lists hold every row, so paging, filtering, search and ordering happen
  locally.

`shared/` holds the shim, `fixtures/` the data and `media/` the product photos.
`scripts/sync-shared.mjs` copies them into each app before `dev` and `build`.
The copies are gitignored, so edit `shared/`, not `*/demo/`.

## Run locally

```sh
cd storefront && npm install && npm run dev   # http://localhost:3000
cd admin && npm install && npm run dev -- -p 3001
```

## Deploy on Vercel

Create **two projects** from this one repository:

1. **New Project** → import the repo → set **Root Directory** to `storefront`.
   Leave the build settings at their defaults. The `prebuild` script reads
   `../shared`, `../fixtures` and `../media`, which Vercel includes because
   "Include files outside the root directory" is on by default.
2. Repeat with **Root Directory** set to `admin`.
3. In each project, go to **Settings → Domains** and add its subdomain. Then,
   at the DNS provider for teddynova.com, add a `CNAME` record for each
   (`storeengine` and `storeengine-admin`) pointing to `cname.vercel-dns.com`.

No environment variables are needed: the committed `.env` files hold only the
placeholder API address and the two demo URLs. If you use different
subdomains, change `NEXT_PUBLIC_ADMIN_URL` in `storefront/.env` and
`NEXT_PUBLIC_STOREFRONT_URL` in `admin/.env`.

## Re-recording the fixtures

`tools/` holds the scripts that produced the fixtures. They need a copy of the
e-cormmece backend running on a scratch SQLite database.

1. `seed_demo.py`, `seed_extras.py` and `seed_after.py` (in that order, through
   `manage.py shell`) load the catalogue snapshot (`DEMO_SNAPSHOT`) and
   generate everything else.
2. `recorder.py` is a middleware that logs every JSON response while
   `crawl.mjs` visits every page of both apps.
3. `collect.py` turns those logs into `fixtures/*.json` (`DEMO_WORKDIR`).

After re-recording, update `RECORDED_AT` in `shared/demo-api.ts`.

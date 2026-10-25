"""Build the demo fixtures from the crawl recordings.

For every GET the crawl saw, fetch the full result set (page_size=200, no page)
so the demo can paginate and filter locally; then fetch every detail record
behind each collection. Output: one JSON per app, keyed by
"<path>?<sorted query without page/page_size>".
"""
import json
import re
import sys
import urllib.error
import urllib.parse
import urllib.request

import os

SP = os.environ["DEMO_WORKDIR"]  # holds record-admin.jsonl and be/record.jsonl
B = "http://127.0.0.1:8765"
PAGING = {"page", "page_size", "limit", "offset"}
SKIP = re.compile(r"^/api/(auth/(login|logout|register|admin-login|password|email|google)|storefront/(checkout|coupons|contact|assistant|payments)|geocode)")


def token(path, body):
    req = urllib.request.Request(B + path, data=json.dumps(body).encode(), headers={"Content-Type": "application/json"})
    return json.load(urllib.request.urlopen(req))["token"]


ADMIN = token("/api/auth/admin-login/", {"username": "demo.admin", "password": "demo-only-password"})
SHOPPER = token("/api/auth/login/", {"email": "demo@storeengine.demo", "password": "demo-shopper-password"})


def auth_for(path):
    if path.startswith("/api/admin") or path.startswith("/api/auth/admin"):
        return ADMIN
    if path.startswith("/api/storefront/my") or path.startswith("/api/auth/me") or path.startswith(
        ("/api/storefront/wishlist", "/api/storefront/addresses", "/api/storefront/orders")
    ):
        return SHOPPER
    return None


def get(path, query=""):
    url = B + path + (f"?{query}" if query else "")
    headers = {}
    tok = auth_for(path)
    if tok:
        headers["Authorization"] = f"Token {tok}"
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers=headers)) as r:
            return r.status, json.loads(r.read() or b"null")
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read() or b"null")
        except Exception:
            return e.code, None


def norm_query(query):
    pairs = [(k, v) for k, v in urllib.parse.parse_qsl(query, keep_blank_values=True) if k not in PAGING and v != ""]
    return urllib.parse.urlencode(sorted(pairs))


def key(path, query):
    q = norm_query(query)
    return path[4:] + (f"?{q}" if q else "")  # drop the /api prefix


def is_page(body):
    return isinstance(body, dict) and "results" in body and "count" in body


EXTRA = ["/auth/me/", "/storefront/payment-methods/", "/storefront/payment-methods/?country=KE&currency=KES",
         "/storefront/payment-methods/?currency=USD", "/content/promo-popups/?kind=banner", "/content/promo-popups/",
         "/storefront/marketing-tags/", "/content/slides/", "/storefront/orders/awaiting-payment/"]


def collect(record_files, out, store_only=False):
    seen = {}
    for f in record_files:
        for line in open(f):
            d = json.loads(line)
            if d["method"] == "GET" and not SKIP.match(d["path"]) and not (store_only and d["path"].startswith("/api/admin")):
                seen.setdefault(key(d["path"], d["query"]), (d["path"], d["query"]))
    for extra in EXTRA if store_only else []:
        path, _, query = extra.partition("?")
        seen.setdefault(key("/api" + path, query), ("/api" + path, query))
    fixtures = {}
    collections = {}
    for k, (path, query) in sorted(seen.items()):
        q = norm_query(query)
        status, body = get(path, q)
        if is_page(body):
            status, body = get(path, (q + "&" if q else "") + "page_size=200")
            if is_page(body) and body.get("next"):
                print("  WARNING more than 200 rows:", k, file=sys.stderr)
            if not q:
                collections[path] = body["results"]
        elif isinstance(body, list) and not q:
            collections[path] = body
        fixtures[k] = {"status": status, "body": body}
    # Every detail record behind each collection, by whichever key the API uses.
    for path, rows in collections.items():
        if not path.endswith("/") or not rows or not isinstance(rows[0], dict):
            continue
        for field in ("number", "reference", "slug", "id"):
            if field in rows[0]:
                break
        else:
            continue
        probe = f"{path}{rows[0][field]}/"
        if get(probe)[0] != 200:
            continue
        for row in rows:
            dp = f"{path}{urllib.parse.quote(str(row[field]))}/"
            k = key(dp, "")
            if k in fixtures:
                continue
            status, body = get(dp)
            if status == 200:
                fixtures[k] = {"status": status, "body": body}
    for row in collections.get("/api/catalog/products/", []):
        for sub in ("reviews/", "related/"):
            dp = f"/api/catalog/products/{row['slug']}/{sub}"
            status, body = get(dp)
            if is_page(body):
                status, body = get(dp, "page_size=200")
            fixtures[key(dp, "")] = {"status": status, "body": body}
    fixtures = {k: v for k, v in fixtures.items() if v["status"] < 400}
    raw = json.dumps(fixtures, separators=(",", ":"))
    raw = raw.replace("http://127.0.0.1:8765/media/", "/media/").replace("http://localhost:8765/media/", "/media/").replace("https://api.teddylan.com/media/", "/media/")
    open(out, "w").write(raw)
    print(out, len(fixtures), "fixtures,", round(len(raw) / 1e6, 2), "MB")


collect([f"{SP}/record-admin.jsonl"], f"{SP}/fixtures-admin.json")
collect([f"{SP}/be/record.jsonl"], f"{SP}/fixtures-store.json", store_only=True)

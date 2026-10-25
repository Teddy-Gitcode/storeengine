// Crawl an app breadth-first, visiting one URL per route pattern, and report
// page errors, failed requests and console errors. Usage:
//   node crawl.mjs <base> <outDir> <seedPathsJson> [adminToken] [shopper]
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW || 'playwright');

const [base, outDir, seedsFile, adminToken, shopper] = process.argv.slice(2);
const seeds = JSON.parse(fs.readFileSync(seedsFile, 'utf8'));
const max = Number(process.env.MAX_PAGES || 300);
fs.mkdirSync(outDir, { recursive: true });

const routes = JSON.parse(fs.readFileSync(process.env.ROUTES, 'utf8'));
const KEEP = new Set(['tab', 'stage', 'status', 'exception', 'kind', 'type', 'view']);
const pattern = (path) => {
  const [p, q = ''] = path.split('?');
  const ps = p.replace(/\/$/, '').split('/');
  const tpl =
    routes.find((t) => {
      const ts = t.split('/');
      return ts.length === ps.length && ts.every((seg, i) => seg.startsWith('[') || seg === ps[i]);
    }) ?? p;
  const kept = [...new URLSearchParams(q).entries()].filter(([k]) => KEEP.has(k)).map(([k, v]) => `${k}=${v}`).sort();
  return tpl + (kept.length ? `?${kept.join('&')}` : '');
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const origin = new URL(base);
if (adminToken) {
  await ctx.addCookies([{ name: 'admin_token', value: adminToken, domain: origin.hostname, path: '/' }]);
}
const page = await ctx.newPage();
if (shopper) {
  const [email, password] = shopper.split(':');
  await page.goto(`${base}/signin`, { waitUntil: 'networkidle' });
  await page.fill('input[type=email], input[name=email]', email);
  await page.fill('input[type=password]', password);
  await Promise.all([page.waitForLoadState('networkidle'), page.click('button[type=submit]')]);
}

const queue = [...seeds];
const seen = new Set();
const report = [];
let n = 0;
while (queue.length && n < max) {
  const path = queue.shift();
  const pat = pattern(path);
  if (seen.has(pat)) continue;
  seen.add(pat);
  n++;
  const errors = [];
  const onPageError = (e) => errors.push(`pageerror: ${e.message.split('\n')[0]}`);
  const onConsole = (m) => m.type() === 'error' && errors.push(`console: ${m.text().slice(0, 200)}`);
  const onResponse = (r) => {
    const u = new URL(r.url());
    if (r.status() >= 400 && !u.pathname.startsWith('/_next') && !u.pathname.includes('favicon'))
      errors.push(`http ${r.status()} ${r.request().method()} ${u.pathname}${u.search}`);
  };
  page.on('pageerror', onPageError);
  page.on('console', onConsole);
  page.on('response', onResponse);
  let status = 0;
  try {
    const resp = await page.goto(base + path, { waitUntil: 'networkidle', timeout: 45000 });
    status = resp?.status() ?? 0;
    await page.waitForTimeout(400);
  } catch (e) {
    errors.push(`goto: ${e.message.split('\n')[0]}`);
  }
  const title = await page.title().catch(() => '');
  const bodyText = (await page.locator('body').innerText().catch(() => '')).slice(0, 300).replace(/\s+/g, ' ');
  const shot = `${outDir}/${String(n).padStart(3, '0')}${pat.replace(/[^a-z0-9]+/gi, '_').slice(0, 80)}.png`;
  await page.screenshot({ path: shot }).catch(() => {});
  const links = await page
    .$$eval('a[href]', (as) => as.map((a) => a.getAttribute('href')))
    .catch(() => []);
  for (const href of links) {
    if (!href || !href.startsWith('/') || href.startsWith('//') || href.startsWith('/_next') || href.startsWith('/media')) continue;
    const clean = href.split('#')[0];
    if (!seen.has(pattern(clean))) queue.push(clean);
  }
  page.off('pageerror', onPageError);
  page.off('console', onConsole);
  page.off('response', onResponse);
  report.push({ path, status, title, errors: [...new Set(errors)], text: bodyText, shot });
  process.stdout.write(`${status} ${errors.length ? 'ERR' : 'ok '} ${path}\n`);
}
fs.writeFileSync(`${outDir}/report.json`, JSON.stringify(report, null, 1));
await browser.close();

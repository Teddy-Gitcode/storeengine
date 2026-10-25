import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_PATHS = ['/login'];

// Routes that moved. Redirecting here rather than from the page keeps it a real
// HTTP redirect: a redirect() inside a streamed render cannot set the status,
// so the old URL answered 200 and only moved once the browser had hydrated.
const MOVED: Record<string, string> = {
  '/orders/return-and-refund': '/refunds',
  // Five settings routes became one page with tabs. Three of them edited the
  // same fields, and "Payment API" held no API.
  '/settings/general': '/settings',
  '/settings/shop': '/settings?tab=storefront',
  '/settings/seo': '/settings?tab=seo',
  '/settings/maintenance': '/settings?tab=maintenance',
  '/settings/payment-api': '/settings?tab=payments',
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const movedTo = MOVED[pathname];
  if (movedTo) {
    const url = new URL(movedTo, request.url);
    // A destination that names its own tab keeps it; anything else carries the
    // original query string across.
    if (!movedTo.includes('?')) url.search = request.nextUrl.search;
    return NextResponse.redirect(url, 308);
  }

  // Demo: everyone is signed in as the demo admin. There is no login wall to
  // get past, and nothing the session can reach is real.
  if (!request.cookies.get('admin_token')?.value) {
    const response = pathname === '/login' ? NextResponse.redirect(new URL('/', request.url)) : NextResponse.next();
    response.cookies.set('admin_token', 'demo-admin-token', { path: '/', sameSite: 'lax' });
    return response;
  }

  const isPublic = PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
  const hasToken = Boolean(request.cookies.get('admin_token')?.value);

  if (!isPublic && !hasToken) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname === '/login' && hasToken) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|assets/|images/|favicon.ico|logo.png).*)'],
};

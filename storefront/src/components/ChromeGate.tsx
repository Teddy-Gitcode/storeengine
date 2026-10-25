"use client";
import { usePathname } from "next/navigation";

// Full-screen, focused routes that should render without the site header,
// footer, or mobile bottom bar — just the page itself.
const BARE_ROUTES = ["/signin", "/signup", "/forgot-password", "/reset-password"];

function isBare(pathname: string | null): boolean {
  if (!pathname) return false;
  return BARE_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`));
}

/** Renders the site chrome (header/footer/etc.) everywhere except bare routes. */
export default function ChromeGate({ children }: { children: React.ReactNode }) {
  if (isBare(usePathname())) return null;
  return <>{children}</>;
}

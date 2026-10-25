import type { ComponentType } from "react";
import { Globe } from "lucide-react";
import {
  SiFacebook,
  SiInstagram,
  SiPinterest,
  SiSnapchat,
  SiTelegram,
  SiThreads,
  SiTiktok,
  SiWhatsapp,
  SiX,
  SiYoutube,
} from "react-icons/si";
import { FaLinkedinIn } from "react-icons/fa6";

/* Brand marks for the merchant's social links.
 *
 * These are the one class of icon lucide deliberately does not carry — a logo
 * is someone's trademark, not a drawing — so they come from Simple Icons
 * (`react-icons/si`), which is exactly that: the official marks, monochrome,
 * on a shared 24px grid. LinkedIn is the exception; Simple Icons dropped it
 * over trademark policy, so it comes from Font Awesome's set instead.
 *
 * `social_links` is a free-form JSON dict on StoreSettings — the admin offers
 * four fields but nothing stops a merchant adding a fifth key — so an unknown
 * name has to degrade to something rather than crash or render blank. */
const MARKS: Record<string, ComponentType<{ className?: string }>> = {
  facebook: SiFacebook,
  instagram: SiInstagram,
  x: SiX,
  twitter: SiX,
  tiktok: SiTiktok,
  youtube: SiYoutube,
  whatsapp: SiWhatsapp,
  linkedin: FaLinkedinIn,
  pinterest: SiPinterest,
  snapchat: SiSnapchat,
  telegram: SiTelegram,
  threads: SiThreads,
};

/** True when we hold a real mark for this key — callers that want an
 *  icon-only row can use it to decide whether a text label is still needed. */
export function hasSocialIcon(name: string): boolean {
  return name.trim().toLowerCase() in MARKS;
}

export default function SocialIcon({
  name,
  className = "",
}: {
  /** The `social_links` key, e.g. `instagram`. Case and spacing are forgiven. */
  name: string;
  className?: string;
}) {
  const Mark = MARKS[name.trim().toLowerCase()] ?? Globe;
  return <Mark className={className} aria-hidden />;
}

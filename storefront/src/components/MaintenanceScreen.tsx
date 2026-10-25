import type { StoreSettings } from "@/lib/settings-api";
import { Wrench } from "lucide-react";

const DEFAULT_MESSAGE =
  "We're making some improvements and will be back shortly. Thanks for your patience!";

/**
 * Shown in place of the whole storefront while maintenance mode is on
 * (admin → Settings → Maintains Settings). No header, nav, cart or footer:
 * every one of those leads somewhere that is also closed.
 */
export default function MaintenanceScreen({ settings }: { settings: StoreSettings }) {
  const message = settings.maintenance_message?.trim() || DEFAULT_MESSAGE;

  return (
    <main className="min-h-screen flex items-center justify-center px-5 py-16 bg-bg">
      <div className="w-full max-w-md text-center">
        {settings.logo_url ? (
          // Plain <img>: the logo is a merchant-supplied URL from any host,
          // same as the header.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={settings.logo_url}
            alt={settings.business_name}
            className="h-11 w-auto mx-auto mb-8"
          />
        ) : (
          <p className="text-[22px] font-extrabold tracking-tight text-brand mb-8">
            {settings.business_name}
          </p>
        )}

        <div className="rounded-2xl border border-line/10 bg-surface px-6 py-10 shadow-card">
          <span
            aria-hidden
            className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand mb-5"
          >
            <Wrench size={22} aria-hidden />
          </span>
          <h1 className="text-[22px] font-semibold text-ink">Back soon</h1>
          {/* Plain text, never HTML — this is merchant-authored copy. */}
          <p className="mt-3 text-[15px] leading-relaxed text-ink-muted whitespace-pre-line">
            {message}
          </p>

          {(settings.support_email || settings.support_phone) && (
            <div className="mt-7 pt-6 border-t border-line/10 text-sm text-ink-muted">
              <p className="font-semibold text-ink mb-1">Need us in the meantime?</p>
              {settings.support_email && (
                <p>
                  <a href={`mailto:${settings.support_email}`} className="text-brand hover:underline">
                    {settings.support_email}
                  </a>
                </p>
              )}
              {settings.support_phone && (
                <p>
                  <a href={`tel:${settings.support_phone}`} className="text-brand hover:underline">
                    {settings.support_phone}
                  </a>
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

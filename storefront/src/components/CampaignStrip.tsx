import Link from "next/link";
import type { StorefrontCampaign } from "@/lib/content-api";

function campaignCode(campaign: StorefrontCampaign) {
  return campaign.promotions.find((promo) => promo.code)?.code || "";
}

function assetLabel(campaign: StorefrontCampaign) {
  const asset = campaign.creative_assets[0];
  if (!asset) return "Homepage";
  if (asset.asset_type === "short_reel") return "Short reel";
  if (asset.asset_type === "video") return "Video";
  if (asset.asset_type === "document") return "Guide";
  return "Creative";
}

export default function CampaignStrip({ campaigns }: { campaigns: StorefrontCampaign[] }) {
  const visible = campaigns.slice(0, 3);
  if (!visible.length) return null;
  // "OFFERS" used to stand in when a campaign carried no promo code, so the
  // panel invited shoppers to type a code that fails at checkout. No code, no
  // plate.
  const leadCode = campaignCode(visible[0]);

  return (
    <section className="mt-8 grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
      <Link
        href="/offers"
        className="relative overflow-hidden rounded-lg border border-line/5 bg-gradient-to-br from-[#101820] via-[#173B32] to-[#0F6E56] p-5 text-white shadow-card group"
      >
        <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-accent/20 blur-2xl" aria-hidden />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-sm bg-accent px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-accent-dark">
              Live promo
            </div>
            <h2 className="font-display text-[25px] font-extrabold leading-tight sm:text-[32px]">
              {visible[0].headline || visible[0].name}
            </h2>
            {visible[0].audience && (
              <p className="mt-2 max-w-lg text-sm text-white/78">{visible[0].audience}</p>
            )}
          </div>
          {leadCode && (
            <div className="min-w-[160px] rounded-md border border-white/15 bg-surface/10 p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">Use code</p>
              <p className="mt-1 font-mono text-2xl font-black text-accent">{leadCode}</p>
              <p className="mt-2 text-xs text-white/70">View eligible products</p>
            </div>
          )}
        </div>
      </Link>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
        {visible.slice(1).map((campaign) => (
          <Link
            key={campaign.id}
            href="/offers"
            className="rounded-lg border border-line/5 bg-surface p-4 shadow-card transition hover:-translate-y-0.5 hover:shadow-cardHover"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-brand">{assetLabel(campaign)}</span>
                <h3 className="mt-1 line-clamp-2 text-[15px] font-bold leading-tight text-ink">{campaign.headline || campaign.name}</h3>
                <p className="mt-2 text-xs text-ink-muted">{campaignCode(campaign) || campaign.objective_label}</p>
              </div>
              <span className="rounded-sm bg-brand-50 px-2 py-1 text-[10px] font-bold uppercase text-brand">
                {campaign.objective_label}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

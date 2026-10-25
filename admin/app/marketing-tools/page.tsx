import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  BarChart2,
  Image as ImageIcon,
  Megaphone,
  Plus,
  Target,
  Upload,
  Zap,
} from 'lucide-react';
import {
  createCreativeAsset,
  createMarketingCampaign,
  getCreativeAssets,
  getMarketingCampaigns,
  getMarketingTools,
  getPromotions,
  getStoreSettings,
  getStorefrontSlides,
  updateMarketingCampaign,
  updateMarketingTool,
} from '@/lib/admin-api';
import MarketingStatusToggle from '@/components/sellzy/marketing-status-toggle';
import MarketingToolsCard from '@/components/sellzy/marketing-tools-card';
import SubmitButton from '@/components/sellzy/submit-button';

export const dynamic = 'force-dynamic';

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-primary/16 text-primary-dark',
  scheduled: 'bg-secondary/16 text-secondary-dark',
  paused: 'bg-warning/16 text-warning-dark',
  draft: 'bg-gray-200 text-gray-700',
};

function statusBadge(status: string) {
  return STATUS_BADGE[status] ?? 'bg-gray-200 text-gray-700';
}

const OBJECTIVE_BADGE: Record<string, string> = {
  launch: 'bg-secondary/16 text-secondary-dark',
  retention: 'bg-info/16 text-info-dark',
  wholesale: 'bg-gray-200 text-gray-700',
  awareness: 'bg-warning/16 text-warning-dark',
  sales: 'bg-primary/16 text-primary-dark',
};

function objectiveBadge(objective: string) {
  return OBJECTIVE_BADGE[objective] ?? 'bg-primary/16 text-primary-dark';
}

/** Store currency, so the figures read in KSh (or whatever Settings says)
    rather than the template's dollars. */
function moneyFormatter(currencyCode: string, locale: string) {
  const fmt = new Intl.NumberFormat(locale, {
    style: 'currency', currency: currencyCode, maximumFractionDigits: 0,
  });
  return (value: string | number) => fmt.format(Number(value || 0));
}

function formIds(formData: FormData, key: string) {
  return formData
    .getAll(key)
    .map((id) => Number(id))
    .filter((id) => Number.isFinite(id));
}

async function createCampaignAction(formData: FormData) {
  'use server';

  const starts = String(formData.get('starts_at') || '');
  const ends = String(formData.get('ends_at') || '');
  try {
    await createMarketingCampaign({
      name: String(formData.get('name') || ''),
      objective: String(formData.get('objective') || 'sales'),
      status: String(formData.get('status') || 'draft'),
      headline: String(formData.get('headline') || ''),
      audience: String(formData.get('audience') || ''),
      budget: String(formData.get('budget') || '0'),
      starts_at: starts ? new Date(starts).toISOString() : null,
      ends_at: ends ? new Date(ends).toISOString() : null,
      promotion_ids: formIds(formData, 'promotion_ids'),
      placement_ids: formIds(formData, 'placement_ids'),
      creative_asset_ids: formIds(formData, 'creative_asset_ids'),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not create the campaign.';
    redirect(`/marketing-tools?error=${encodeURIComponent(message)}`);
  }

  revalidatePath('/marketing-tools');
}

async function createCreativeAssetAction(formData: FormData) {
  'use server';

  try {
    await createCreativeAsset({
      name: String(formData.get('name') || ''),
      asset_type: String(formData.get('asset_type') || 'image'),
      source_type: 'external_url',
      url: String(formData.get('url') || ''),
      alt_text: String(formData.get('alt_text') || ''),
      status: String(formData.get('status') || 'approved'),
      usage_notes: String(formData.get('usage_notes') || ''),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not save the asset.';
    redirect(`/marketing-tools?error=${encodeURIComponent(message)}`);
  }

  revalidatePath('/marketing-tools');
}

async function saveMarketingToolsAction(
  formData: FormData,
): Promise<{ error?: string; saved?: number } | void> {
  'use server';

  let tools;
  try {
    tools = (await getMarketingTools()).results;
  } catch {
    return { error: 'Could not load the current tool settings. Try again.' };
  }

  // An unchecked switch posts nothing, so absence means "off".
  const changed = tools.filter((tool) => formData.has(`tool_${tool.id}`) !== tool.is_enabled);
  try {
    await Promise.all(
      changed.map((tool) => updateMarketingTool(tool.id, { is_enabled: !tool.is_enabled })),
    );
  } catch {
    return { error: 'Some tools could not be saved. Reload the page and try again.' };
  }

  revalidatePath('/marketing-tools');
  return { saved: changed.length };
}

async function activateCampaignAction(id: number) {
  'use server';
  await updateMarketingCampaign(id, { status: 'active' });
  revalidatePath('/marketing-tools');
}

async function pauseCampaignAction(id: number) {
  'use server';
  await updateMarketingCampaign(id, { status: 'paused' });
  revalidatePath('/marketing-tools');
}

const inputClass =
  'h-11 w-full rounded-full border border-gray-500/20 bg-surface px-4 text-sm font-public-sans text-light-primary-text placeholder:text-light-disabled-text focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary';

export default async function MarketingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;
  const [campaignPage, promotionsPage, slidesPage, creativePage, toolsPage, settings] = await Promise.all([
    getMarketingCampaigns(),
    getPromotions(),
    getStorefrontSlides(),
    getCreativeAssets(),
    // Only exists on backends carrying the integrations app.
    getMarketingTools().catch(() => null),
    getStoreSettings().catch(() => null),
  ]);

  const money = moneyFormatter(settings?.currency_code || 'USD', settings?.locale || 'en-US');

  const campaigns = campaignPage.results;
  const promotions = promotionsPage.results;
  const slides = slidesPage.results;
  const creativeAssets = creativePage.results;
  const active = campaigns.filter((campaign) => campaign.status === 'active').length;
  const totalRevenue = campaigns.reduce((sum, campaign) => sum + Number(campaign.revenue || 0), 0);
  const totalClicks = campaigns.reduce((sum, campaign) => sum + campaign.clicks, 0);
  const avgCtr = campaigns.length
    ? campaigns.reduce((sum, campaign) => sum + Number(campaign.ctr || 0), 0) / campaigns.length
    : 0;

  const STAT_CARDS = [
    { label: 'Active Campaigns', value: String(active), bg: 'bg-accent-1', icon: Megaphone },
    { label: 'Revenue Attributed', value: money(totalRevenue), bg: 'bg-accent-5', icon: BarChart2 },
    { label: 'Creative Assets', value: String(creativeAssets.length), bg: 'bg-accent-4', icon: ImageIcon },
    { label: 'Average CTR', value: `${avgCtr.toFixed(1)}%`, bg: 'bg-accent-6', icon: Target },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      {sp.error && (
        <p className="rounded-2xl bg-error/10 px-4 py-3 text-sm font-semibold text-error font-public-sans">
          {sp.error}
        </p>
      )}
      {toolsPage && (
        <MarketingToolsCard tools={toolsPage.results} saveAction={saveMarketingToolsAction} />
      )}

      <div className="bg-surface rounded-2xl w-full p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 sm:mb-6">
          <div>
            <h3 className="text-xl font-bold font-public-sans text-light-primary-text leading-7">Growth</h3>
            <p className="text-sm font-public-sans text-light-secondary-text mt-1">
              Campaigns connect discounts, creative assets, and storefront placements
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/content"
              className="rounded-full inline-flex items-center gap-1.5 justify-center cursor-pointer font-bold font-public-sans transition-colors focus:outline-none border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-1 h-9 text-sm leading-6"
            >
              <ImageIcon size={13} />
              Content placements
            </Link>
            <Link
              href="/coupon"
              className="rounded-full inline-flex items-center gap-1.5 justify-center cursor-pointer font-bold font-public-sans transition-colors focus:outline-none border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-1 h-9 text-sm leading-6"
            >
              <Zap size={13} />
              Discount rules
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {STAT_CARDS.map(({ label, value, bg, icon: Icon }) => (
            <div key={label} className={`rounded-2xl p-5 flex items-center gap-4 ${bg}`}>
              <div className="size-14 rounded-full flex items-center justify-center shrink-0 bg-surface text-primary">
                <Icon size={24} />
              </div>
              <div>
                <h4 className="text-light-primary-text text-sm font-semibold font-public-sans mb-1">{label}</h4>
                <div className="text-2xl font-bold font-dm-sans text-light-primary-text">{value}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Active campaigns — Sellzy "Advanced Settings" toggle-card pattern ── */}
      <div className="bg-surface rounded-2xl p-4 sm:p-6 border border-gray-500/20">
        <h4 className="text-lg font-bold font-public-sans text-light-primary-text mb-4 sm:mb-6">Campaigns</h4>
        {campaigns.length === 0 ? (
          <p className="text-sm font-public-sans text-light-secondary-text">No campaigns yet — create one below.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
            {campaigns.map((campaign) => (
              <div key={campaign.id} className="bg-gray-100 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2 gap-2">
                  <h5 className="font-semibold font-public-sans text-light-primary-text text-base truncate">{campaign.name}</h5>
                  <MarketingStatusToggle
                    active={campaign.status === 'active'}
                    onActivate={activateCampaignAction.bind(null, campaign.id)}
                    onPause={pauseCampaignAction.bind(null, campaign.id)}
                  />
                </div>
                <p className="text-sm font-public-sans text-light-secondary-text mb-4 leading-5.5 line-clamp-2">
                  {campaign.headline || 'No headline set for this campaign yet.'}
                </p>
                <div className="mb-3 flex flex-wrap gap-1.5">
                  <span className={`px-2 py-1 h-5.5 inline-flex items-center justify-center font-public-sans rounded-full text-xs font-medium ${objectiveBadge(campaign.objective)}`}>
                    {campaign.objective_label}
                  </span>
                  <span className={`px-2 py-1 h-5.5 inline-flex items-center justify-center font-public-sans rounded-full text-xs font-medium ${statusBadge(campaign.status)}`}>
                    {campaign.status_label}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs font-public-sans text-light-secondary-text bg-surface rounded-xl p-3">
                  <span>
                    <b className="font-dm-sans text-light-primary-text block text-sm">{campaign.clicks.toLocaleString()}</b>
                    clicks
                  </span>
                  <span>
                    <b className="font-dm-sans text-light-primary-text block text-sm">{campaign.ctr}%</b>
                    CTR
                  </span>
                  <span>
                    <b className="font-dm-sans text-light-primary-text block text-sm">{money(campaign.revenue)}</b>
                    revenue
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── New campaign / new creative asset ── */}
      <div className="grid gap-4 sm:gap-6 xl:grid-cols-2">
        <form data-manage action={createCampaignAction} className="bg-surface rounded-2xl p-4 sm:p-6 border border-gray-500/20">
          <h4 className="text-lg font-bold font-public-sans text-light-primary-text mb-4 sm:mb-6">New Campaign</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input name="name" className={inputClass} placeholder="Campaign name" required />
            <select name="objective" className={inputClass} defaultValue="sales">
              <option value="sales">Sales</option>
              <option value="launch">Launch</option>
              <option value="retention">Retention</option>
              <option value="wholesale">Wholesale</option>
              <option value="awareness">Awareness</option>
            </select>
            <input name="headline" className={`${inputClass} md:col-span-2`} placeholder="Headline / internal campaign promise" />
            <input name="audience" className={inputClass} placeholder="Audience e.g. repeat buyers" />
            <input name="budget" className={inputClass} type="number" step="0.01" placeholder="Budget" />
            <select name="status" className={inputClass} defaultValue="draft">
              <option value="draft">Draft</option>
              <option value="scheduled">Scheduled</option>
              <option value="active">Active</option>
            </select>
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-semibold font-public-sans uppercase tracking-wide text-light-secondary-text">Starts</span>
              <input name="starts_at" type="datetime-local" className={inputClass} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-semibold font-public-sans uppercase tracking-wide text-light-secondary-text">Ends</span>
              <input name="ends_at" type="datetime-local" className={inputClass} />
            </label>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div>
              <p className="mb-2 text-[11px] font-semibold font-public-sans uppercase tracking-wide text-light-secondary-text">Attach discounts</p>
              <div className="max-h-36 space-y-1 overflow-auto rounded-2xl border border-gray-500/20 bg-surface p-3">
                {promotions.length === 0 && <p className="text-xs font-public-sans text-light-disabled-text">No discounts yet.</p>}
                {promotions.map((promo) => (
                  <label key={promo.id} className="flex items-center gap-2 text-xs font-public-sans text-light-secondary-text">
                    <input type="checkbox" name="promotion_ids" value={promo.id} className="h-3.5 w-3.5" />
                    <span>{promo.code || promo.name}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-[11px] font-semibold font-public-sans uppercase tracking-wide text-light-secondary-text">Attach placements</p>
              <div className="max-h-36 space-y-1 overflow-auto rounded-2xl border border-gray-500/20 bg-surface p-3">
                {slides.length === 0 && <p className="text-xs font-public-sans text-light-disabled-text">No placements yet.</p>}
                {slides.map((slide) => (
                  <label key={slide.id} className="flex items-center gap-2 text-xs font-public-sans text-light-secondary-text">
                    <input type="checkbox" name="placement_ids" value={slide.id} className="h-3.5 w-3.5" />
                    <span>{slide.title}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-[11px] font-semibold font-public-sans uppercase tracking-wide text-light-secondary-text">Attach creatives</p>
              <div className="max-h-36 space-y-1 overflow-auto rounded-2xl border border-gray-500/20 bg-surface p-3">
                {creativeAssets.length === 0 && <p className="text-xs font-public-sans text-light-disabled-text">No creative assets yet.</p>}
                {creativeAssets.map((asset) => (
                  <label key={asset.id} className="flex items-center gap-2 text-xs font-public-sans text-light-secondary-text">
                    <input type="checkbox" name="creative_asset_ids" value={asset.id} className="h-3.5 w-3.5" />
                    <span>{asset.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <SubmitButton
              className="rounded-full inline-flex items-center gap-1.5 justify-center cursor-pointer font-bold font-public-sans transition-colors focus:outline-none bg-primary text-white hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed px-8 py-1 h-9 text-sm leading-6"
              pendingLabel="Creating…"
            >
              <Plus size={14} />
              Create campaign
            </SubmitButton>
          </div>
        </form>

        <form data-manage action={createCreativeAssetAction} className="bg-surface rounded-2xl p-4 sm:p-6 border border-gray-500/20">
          <h4 className="text-lg font-bold font-public-sans text-light-primary-text mb-4 sm:mb-6">Creative Library Asset</h4>
          <div className="grid gap-4">
            <input name="name" className={inputClass} placeholder="Asset name" required />
            <select name="asset_type" className={inputClass} defaultValue="image">
              <option value="image">Image</option>
              <option value="video">Video</option>
              <option value="short_reel">Short reel</option>
              <option value="document">Document</option>
            </select>
            <input name="url" className={inputClass} placeholder="Image/video URL" required />
            <input name="alt_text" className={inputClass} placeholder="Alt text" />
            <select name="status" className={inputClass} defaultValue="approved">
              <option value="approved">Approved</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
            <textarea
              name="usage_notes"
              placeholder="Usage notes"
              rows={3}
              className="w-full rounded-2xl border border-gray-500/20 bg-surface px-4 py-3 text-sm font-public-sans text-light-primary-text placeholder:text-light-disabled-text focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary resize-none"
            />
          </div>
          <div className="mt-6 flex justify-end">
            <SubmitButton
              className="rounded-full inline-flex items-center gap-1.5 justify-center cursor-pointer font-bold font-public-sans transition-colors focus:outline-none bg-primary text-white hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed px-8 py-1 h-9 text-sm leading-6"
              pendingLabel="Saving…"
            >
              <Upload size={14} />
              Save asset
            </SubmitButton>
          </div>
        </form>
      </div>

      {/* ── Growth pipeline ── */}
      <div className="bg-surface rounded-2xl w-full">
        <div className="p-4 sm:p-6 pb-4">
          <h3 className="text-lg font-bold font-public-sans text-light-primary-text leading-7">Growth Pipeline</h3>
        </div>
        <div className="relative w-full overflow-auto">
          <table className="w-full caption-bottom text-sm">
            <thead>
              <tr className="bg-gray-100 border-y border-gray-500/20">
                {['Campaign', 'Objective', 'Audience', 'Linked Rules', 'Placements', 'CTR', 'Revenue', 'Status'].map((h) => (
                  <th key={h} className="h-12 p-3 first:pl-6 whitespace-nowrap last:pr-6 text-left align-middle text-light-primary-text text-sm font-semibold font-public-sans">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {campaigns.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-sm font-public-sans text-light-secondary-text">
                    No campaigns yet.
                  </td>
                </tr>
              ) : (
                campaigns.map((campaign) => (
                  <tr key={campaign.id} className="border-b last:border-0 border-gray-500/20 hover:bg-gray-50/50 transition-colors">
                    <td className="px-3 py-3.5 pl-6 align-middle text-sm font-semibold font-public-sans text-light-primary-text whitespace-nowrap">
                      {campaign.name}
                    </td>
                    <td className="px-3 py-3.5 align-middle whitespace-nowrap">
                      <span className={`px-2 py-1 h-5.5 inline-flex items-center justify-center font-public-sans rounded-full text-xs font-medium ${objectiveBadge(campaign.objective)}`}>
                        {campaign.objective_label}
                      </span>
                    </td>
                    <td className="px-3 py-3.5 align-middle text-sm font-public-sans text-light-secondary-text whitespace-nowrap">
                      {campaign.audience || 'All shoppers'}
                    </td>
                    <td className="px-3 py-3.5 align-middle text-sm font-public-sans text-light-secondary-text whitespace-nowrap">
                      {campaign.promotions.map((promo) => promo.code || promo.name).join(', ') || 'None'}
                    </td>
                    <td className="px-3 py-3.5 align-middle text-sm font-public-sans text-light-secondary-text whitespace-nowrap">
                      {campaign.placements.map((slide) => slide.title).join(', ') || 'None'}
                    </td>
                    <td className="px-3 py-3.5 align-middle text-sm font-dm-sans text-light-primary-text whitespace-nowrap">{campaign.ctr}%</td>
                    <td className="px-3 py-3.5 align-middle text-sm font-dm-sans font-semibold text-light-primary-text whitespace-nowrap">{money(campaign.revenue)}</td>
                    <td className="px-3 py-3.5 pr-6 align-middle whitespace-nowrap">
                      <span className={`px-2 py-1 h-5.5 inline-flex items-center justify-center font-public-sans rounded-full text-xs font-medium ${statusBadge(campaign.status)}`}>
                        {campaign.status_label}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="p-4 sm:p-6 border-t border-gray-500/20">
          <span className="text-xs font-public-sans text-light-secondary-text">
            {campaigns.length} campaign{campaigns.length !== 1 ? 's' : ''} · {totalClicks.toLocaleString()} tracked clicks
          </span>
        </div>
      </div>
    </div>
  );
}

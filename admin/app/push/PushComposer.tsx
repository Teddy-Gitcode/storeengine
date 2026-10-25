'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BellRing, ImagePlus, Loader2 } from 'lucide-react';
import type { PushOverview, PushTemplate } from '@/lib/admin-types';
import { saveCampaign } from './actions';

/** Somewhere a notification can open in the app, and the picture it has. */
export type LinkTarget = { group: string; label: string; path: string; image: string };

/** The app's own screens worth sending someone to. Paths match apps/mobile's
 *  router; anything else is still possible through "Another path". */
const SCREENS: LinkTarget[] = [
  { group: 'Screens', label: 'Offers', path: '/offers', image: '' },
  { group: 'Screens', label: 'Shop', path: '/shop', image: '' },
  { group: 'Screens', label: 'Search', path: '/search', image: '' },
  { group: 'Screens', label: 'Cart', path: '/cart', image: '' },
  { group: 'Screens', label: 'Wishlist', path: '/wishlist', image: '' },
  { group: 'Screens', label: 'My orders', path: '/orders', image: '' },
  { group: 'Screens', label: 'Messages', path: '/messages', image: '' },
];
const OTHER = '__other__';

/** Compose a campaign: pick a template, edit everything, save or schedule.
 *
 * Client-side because picking a template rewrites the form in place, and the
 * phone preview updates as you type — both need state the server can't hold. */
export default function PushComposer({
  overview,
  storeName,
  linkTargets = [],
}: {
  overview: PushOverview;
  /** The preview shows the sender the way a phone does — the store's own name. */
  storeName: string;
  /** Categories and products a notification can open. */
  linkTargets?: LinkTarget[];
}) {
  const targets = [...SCREENS, ...linkTargets];
  const groups = Array.from(new Set(targets.map((t) => t.group)));
  const router = useRouter();
  const [template, setTemplate] = useState<PushTemplate>(
    overview.templates.find((t) => t.key === 'custom') ?? overview.templates[0],
  );
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [link, setLink] = useState('');
  // Typing a path by hand — only when it isn't one of the choices.
  const [customLink, setCustomLink] = useState(false);
  const [audience, setAudience] = useState(overview.default_audience);
  const [repeat, setRepeat] = useState('once');
  const [scheduledFor, setScheduledFor] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function applyTemplate(key: string) {
    const picked = overview.templates.find((t) => t.key === key);
    if (!picked) return;
    setTemplate(picked);
    // Everything the template suggests, all still editable afterwards.
    setName(picked.name === 'Write my own' ? '' : picked.name);
    setTitle(picked.title);
    setBody(picked.body);
    setLink(picked.link);
    setCustomLink(Boolean(picked.link) && !targets.some((t) => t.path === picked.link));
    setAudience(picked.audience);
    setRepeat(picked.repeat);
  }

  const segment = overview.segments.find((s) => s.key === audience);
  const target = customLink ? undefined : targets.find((t) => t.path === link);

  async function submit(status: 'draft' | 'scheduled') {
    setBusy(true);
    setError(null);
    const result = await saveCampaign({
      name: name.trim() || title.trim() || 'Untitled campaign',
      title: title.trim(),
      body: body.trim(),
      image_url: imageUrl.trim(),
      link: link.trim(),
      audience,
      template_key: template.key === 'custom' ? '' : template.key,
      repeat,
      status,
      // Resolved to UTC here rather than in the server action: the input gives
      // a bare "2026-08-01T08:01" with no timezone, and only the browser knows
      // which timezone the admin meant by it.
      scheduled_for: status === 'scheduled' && scheduledFor
        ? new Date(scheduledFor).toISOString()
        : null,
    });
    setBusy(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    setTitle('');
    setBody('');
    setImageUrl('');
    setName('');
    setScheduledFor('');
    router.refresh();
  }

  const labelStyle = 'text-[11px] font-semibold uppercase tracking-wide';
  const inputClass =
    'w-full rounded-md border border-[var(--border)] bg-surface px-3 py-2 text-sm outline-none focus:border-[var(--brand)]';

  return (
    <section className="ak-card p-4">
      <h3 className="mb-1 font-semibold flex items-center gap-1.5" style={{ color: 'var(--text-1)' }}>
        <BellRing size={15} /> New campaign
      </h3>
      <p className="mb-4 text-xs" style={{ color: 'var(--text-3)' }}>
        Start from a template or write your own. Nothing sends until you press Send on the list below.
      </p>

      <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1 md:col-span-2">
            <span className={labelStyle} style={{ color: 'var(--text-3)' }}>Template</span>
            <select
              value={template.key}
              onChange={(e) => applyTemplate(e.target.value)}
              className={inputClass}
            >
              {overview.templates.map((t) => (
                <option key={t.key} value={t.key}>{t.name}</option>
              ))}
            </select>
            {template.hint && (
              <span className="block text-[11px]" style={{ color: 'var(--text-3)' }}>{template.hint}</span>
            )}
          </label>

          <label className="space-y-1 md:col-span-2">
            <span className={labelStyle} style={{ color: 'var(--text-3)' }}>Campaign name (internal)</span>
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="Only you see this" />
          </label>

          <label className="space-y-1 md:col-span-2">
            <span className={labelStyle} style={{ color: 'var(--text-3)' }}>Notification title</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} maxLength={120} />
          </label>

          <label className="space-y-1 md:col-span-2">
            <span className={labelStyle} style={{ color: 'var(--text-3)' }}>Message</span>
            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} className={inputClass} maxLength={600} />
          </label>

          <label className="space-y-1">
            <span className={labelStyle} style={{ color: 'var(--text-3)' }}>Picture URL (optional)</span>
            <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className={inputClass} placeholder="https://…" />
            <span className="block text-[11px]" style={{ color: 'var(--text-3)' }}>
              Shown as a big picture when the notification is expanded.
            </span>
            {target?.image && target.image !== imageUrl && (
              <button
                type="button"
                onClick={() => setImageUrl(target.image)}
                className="mt-1 inline-flex items-center gap-2 rounded-md border border-[var(--border)] px-2 py-1 text-xs font-semibold hover:border-[var(--brand)]"
                style={{ color: 'var(--text-1)' }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={target.image} alt="" className="h-6 w-6 rounded object-cover" />
                <ImagePlus size={13} /> Use {target.label}&apos;s picture
              </button>
            )}
          </label>

          <div className="space-y-1">
            <label htmlFor="push-link" className={`block ${labelStyle}`} style={{ color: 'var(--text-3)' }}>Opens in the app</label>
            <select
              id="push-link"
              value={customLink ? OTHER : link}
              onChange={(e) => {
                const value = e.target.value;
                if (value === OTHER) {
                  setCustomLink(true);
                  return;
                }
                setCustomLink(false);
                setLink(value);
              }}
              className={inputClass}
            >
              <option value="">Home screen</option>
              {groups.map((g) => (
                <optgroup key={g} label={g}>
                  {targets.filter((t) => t.group === g).map((t) => (
                    <option key={t.path} value={t.path}>{t.label}</option>
                  ))}
                </optgroup>
              ))}
              <option value={OTHER}>Another path…</option>
            </select>
            {customLink && (
              <input
                value={link}
                onChange={(e) => setLink(e.target.value)}
                className={inputClass}
                placeholder="/product/classic-crewneck-tee"
                aria-label="In-app path"
              />
            )}
            <span className="block text-[11px]" style={{ color: 'var(--text-3)' }}>
              {customLink
                ? <>An in-app path such as <code>/product/&lt;slug&gt;</code> or <code>/category/&lt;slug&gt;</code>.</>
                : 'The screen a tap on the notification opens.'}
            </span>
          </div>

          <label className="space-y-1">
            <span className={labelStyle} style={{ color: 'var(--text-3)' }}>Audience</span>
            <select value={audience} onChange={(e) => setAudience(e.target.value)} className={inputClass}>
              {overview.segments.map((s) => (
                <option key={s.key} value={s.key}>{s.label} ({s.devices})</option>
              ))}
            </select>
            {segment && (
              <span className="block text-[11px]" style={{ color: 'var(--text-3)' }}>{segment.description}</span>
            )}
          </label>

          <label className="space-y-1">
            <span className={labelStyle} style={{ color: 'var(--text-3)' }}>Repeat</span>
            <select value={repeat} onChange={(e) => setRepeat(e.target.value)} className={inputClass}>
              <option value="once">Send once</option>
              <option value="daily">Every day</option>
              <option value="weekly">Every week</option>
              <option value="monthly">Every month</option>
            </select>
          </label>

          <label className="space-y-1 md:col-span-2">
            <span className={labelStyle} style={{ color: 'var(--text-3)' }}>Send at (leave blank to save as a draft)</span>
            <input
              type="datetime-local"
              value={scheduledFor}
              onChange={(e) => setScheduledFor(e.target.value)}
              className={inputClass}
            />
            {scheduledFor && !Number.isNaN(Date.parse(scheduledFor)) && (
              <span className="block text-[11px]" style={{ color: 'var(--text-3)' }}>
                Sends {new Date(scheduledFor).toLocaleString(undefined, {
                  weekday: 'short', day: '2-digit', month: 'short',
                  hour: '2-digit', minute: '2-digit',
                })}{' '}
                ({Intl.DateTimeFormat().resolvedOptions().timeZone}).
              </span>
            )}
          </label>

          {error && (
            <p className="md:col-span-2 text-sm" style={{ color: 'var(--error)' }}>{error}</p>
          )}

          <div className="md:col-span-2 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              className="ak-btn-secondary"
              disabled={busy}
              onClick={() => submit('draft')}
            >
              {busy && <Loader2 size={13} className="animate-spin" />} Save as draft
            </button>
            <button
              type="button"
              className="ak-btn-primary"
              disabled={busy || !scheduledFor}
              title={scheduledFor ? 'Schedule it' : 'Pick a send time first'}
              onClick={() => submit('scheduled')}
            >
              {busy && <Loader2 size={13} className="animate-spin" />} Schedule
            </button>
          </div>
        </div>

        {/* Roughly what lands on the phone — enough to catch copy that's too long. */}
        <div>
          <span className={labelStyle} style={{ color: 'var(--text-3)' }}>Preview</span>
          <div className="mt-1 rounded-2xl p-3" style={{ background: 'var(--text-1)' }}>
            <div className="rounded-xl bg-surface p-3 shadow">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>
                <BellRing size={10} /> {storeName} · now
              </div>
              <div className="mt-1 text-sm font-bold leading-snug" style={{ color: 'var(--text-1)' }}>
                {title || 'Notification title'}
              </div>
              <div className="text-xs leading-snug" style={{ color: 'var(--text-2)' }}>
                {body || 'Your message shows here.'}
              </div>
              {imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element -- arbitrary remote URL, not in next.config images
                <img src={imageUrl} alt="" className="mt-2 w-full rounded-lg object-cover" style={{ maxHeight: 120 }} />
              )}
            </div>
          </div>
          <p className="mt-2 text-[11px]" style={{ color: 'var(--text-3)' }}>
            Reaches <strong>{segment?.devices ?? 0}</strong> device{(segment?.devices ?? 0) === 1 ? '' : 's'} right now.
          </p>
        </div>
      </div>
    </section>
  );
}

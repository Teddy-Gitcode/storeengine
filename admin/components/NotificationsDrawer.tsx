'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { X, AlertTriangle, ShoppingBag, CreditCard, Truck, MessageCircle, Package, Check, RefreshCw } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type Notif = {
  id: string;
  title: string;
  desc: string;
  created_at: string | null;
  href: string;
  type: 'order' | 'payment' | 'stock' | 'shipment' | 'support' | 'alert';
};

const ICONS: Record<Notif['type'], LucideIcon> = {
  order: ShoppingBag,
  payment: CreditCard,
  stock: Package,
  shipment: Truck,
  support: MessageCircle,
  alert: AlertTriangle,
};

const COLORS: Record<Notif['type'], string> = {
  order: 'var(--green)',
  payment: 'var(--info)',
  stock: 'var(--gold)',
  shipment: 'var(--purple)',
  support: 'var(--error)',
  alert: 'var(--error)',
};

/* Read state is the one thing a derived feed can't carry, so it lives in the
   browser. Ids are stable (`stock:12`, `refund:3`), so a signal stays read
   until the underlying record changes. */
const READ_KEY = 'admin-notifications-read';

function loadRead(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(READ_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function saveRead(ids: string[]) {
  try {
    // Keep the list from growing forever as old signals resolve.
    window.localStorage.setItem(READ_KEY, JSON.stringify(ids.slice(-500)));
  } catch {
    /* Private mode or a full quota — read state is a nicety, not a blocker. */
  }
}

function timeAgo(iso: string | null): string {
  if (!iso) return '';
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? 'yesterday' : `${days} days ago`;
}

export default function NotificationsDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [items, setItems] = useState<Notif[]>([]);
  const [read, setRead] = useState<string[]>([]);
  const [tab, setTab] = useState<'all' | 'unread' | 'alerts'>('all');
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const res = await fetch('/api/notifications', { cache: 'no-store' });
      const data = await res.json();
      setItems(Array.isArray(data.results) ? data.results : []);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setRead(loadRead());
    load();
  }, [open, load]);

  // Escape closes the drawer, same as the command palette.
  useEffect(() => {
    if (!open) return;
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [open, onClose]);

  if (!open) return null;

  const isUnread = (n: Notif) => !read.includes(n.id);
  const unreadCount = items.filter(isUnread).length;
  const shown = items.filter((n) =>
    tab === 'unread' ? isUnread(n) : tab === 'alerts' ? n.type === 'alert' || n.type === 'stock' : true,
  );

  function markAllRead() {
    const ids = items.map((n) => n.id);
    setRead(ids);
    saveRead(ids);
  }

  function markRead(id: string) {
    setRead((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      saveRead(next);
      return next;
    });
  }

  return (
    <>
      <div className="ak-drawer-overlay" onClick={onClose} />
      <div className="ak-drawer" role="dialog" aria-modal="true" aria-label="Notifications">
        <div className="ak-drawer-header">
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>Notifications</p>
            <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>
              {loading ? 'Loading…' : `${unreadCount} unread · ${items.length} total`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="ak-icon-btn"
              onClick={load}
              title="Refresh"
              aria-label="Refresh notifications"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : undefined} />
            </button>
            <button
              className="ak-btn-secondary"
              style={{ padding: '5px 10px', fontSize: 11 }}
              onClick={markAllRead}
              disabled={unreadCount === 0}
            >
              <Check size={12} />Mark all read
            </button>
            <button className="ak-icon-btn" onClick={onClose} aria-label="Close notifications"><X size={15} /></button>
          </div>
        </div>

        <div className="px-4 pt-3 pb-2">
          <div className="ak-segmented">
            <button className={tab === 'all' ? 'is-active' : ''} onClick={() => setTab('all')}>All</button>
            <button className={tab === 'unread' ? 'is-active' : ''} onClick={() => setTab('unread')}>Unread</button>
            <button className={tab === 'alerts' ? 'is-active' : ''} onClick={() => setTab('alerts')}>Alerts</button>
          </div>
        </div>

        <div className="ak-drawer-body">
          {failed && (
            <p style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--error)', fontSize: 13 }}>
              Could not load notifications.
            </p>
          )}
          {!failed && !loading && shown.length === 0 && (
            <p style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
              {items.length === 0
                ? 'Nothing needs attention — no low stock, unpaid orders or open tickets.'
                : 'Nothing in this tab.'}
            </p>
          )}
          {shown.map((n) => {
            const Icon = ICONS[n.type] ?? AlertTriangle;
            const unread = isUnread(n);
            return (
              <Link
                key={n.id}
                href={n.href}
                onClick={() => { markRead(n.id); onClose(); }}
                className={`ak-notif ${unread ? 'is-unread' : ''}`}
                style={{ textDecoration: 'none', cursor: 'pointer' }}
              >
                <span className="dot" style={{ background: unread ? COLORS[n.type] : 'transparent' }} />
                <span
                  className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: 'var(--surface-2)', color: COLORS[n.type] }}
                >
                  <Icon size={13} />
                </span>
                <div className="body">
                  <p className="title">{n.title}</p>
                  <p className="desc">{n.desc}</p>
                  <p className="time">{timeAgo(n.created_at)}</p>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="ak-drawer-footer">
          <Link
            href="/settings/general"
            onClick={onClose}
            className="ak-btn-secondary flex-1"
            style={{ justifyContent: 'center' }}
          >
            View notification settings
          </Link>
        </div>
      </div>
    </>
  );
}

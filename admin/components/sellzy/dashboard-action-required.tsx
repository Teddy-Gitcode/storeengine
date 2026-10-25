import { AlertTriangle, CheckCircle2, CreditCard, PackageCheck, PackageX,
  Boxes, RotateCcw, LifeBuoy, ClipboardList, Send, Truck } from 'lucide-react';
import OrderStatTile, { type StatAccent } from '@/components/sellzy/order-stat-tile';
import type { DashboardData } from '@/lib/admin-types';

/* The dashboard answered "how did the store do", which is a question a merchant
   asks weekly. "What is waiting on me" is the one they ask every morning, and
   it was answerable only by opening four queues in turn to see whether any had
   rows. Every number here is a link to the rows behind it — counted by the
   dashboard endpoint with the same predicates those pages filter on.

   The tiles are `OrderStatTile`, the same pastel stat card the order, finance
   and stock pages use. This panel had grown its own bordered boxes and a row of
   text pills, so the first thing on the dashboard was the one part of the admin
   that looked like nothing else in it. */

type ActionRequired = NonNullable<DashboardData['action_required']>;

type Tile = {
  key: keyof ActionRequired;
  label: string;
  href: string;
  icon: typeof CreditCard;
  accent: StatAccent;
};

// The fulfilment pipeline, in the order work moves through it. Kept in step
// with the sidebar's numbered Fulfilment group and the backend's ORDER_QUEUES.
// Accents 1–4 run left to right so the stage a number belongs to is readable
// by colour once someone has used the page twice.
const PIPELINE: Tile[] = [
  { key: 'payments_to_verify', label: '1 · Verify payment', href: '/finance-queue', icon: CreditCard, accent: '1' },
  { key: 'to_pack', label: '2 · To pack', href: '/warehouse', icon: PackageCheck, accent: '2' },
  { key: 'to_dispatch', label: '3 · To dispatch', href: '/logistics', icon: Send, accent: '3' },
  { key: 'in_transit', label: '4 · In transit', href: '/in-transit', icon: Truck, accent: '4' },
];

// Everything else that stalls if nobody looks. Shown only when non-zero: a row
// of permanent zeroes trains people to stop reading the panel.
const ELSEWHERE: Tile[] = [
  { key: 'out_of_stock', label: 'Out of stock', href: '/products/stocks?level=out', icon: PackageX, accent: '4' },
  { key: 'low_stock', label: 'Low on stock', href: '/products/stocks?level=low', icon: Boxes, accent: '6' },
  { key: 'refunds_to_review', label: 'Refunds to review', href: '/refunds', icon: RotateCcw, accent: '3' },
  { key: 'open_tickets', label: 'Open support tickets', href: '/inbox', icon: LifeBuoy, accent: '5' },
  { key: 'restock_requests_open', label: 'Restock requests open', href: '/inventory', icon: ClipboardList, accent: '7' },
];

export default function DashboardActionRequired({ counts }: { counts: ActionRequired }) {
  const pipelineTotal = PIPELINE.reduce((sum, s) => sum + (counts[s.key] || 0), 0);
  const elsewhere = ELSEWHERE.filter((e) => (counts[e.key] || 0) > 0);
  const allClear = pipelineTotal === 0 && elsewhere.length === 0;

  return (
    <section className="bg-surface border border-gray-300 rounded-2xl" aria-labelledby="needs-attention">
      <div className="px-4 sm:px-6 py-4 flex items-center gap-2 border-b border-gray-200">
        {allClear
          ? <CheckCircle2 size={18} className="text-primary" />
          : <AlertTriangle size={18} className="text-warning-dark" />}
        <h2 id="needs-attention" className="text-lg font-bold leading-7 font-public-sans text-light-primary-text">
          Needs attention
        </h2>
      </div>

      <div className="p-4 sm:p-6">
        {allClear ? (
          <p className="text-sm text-light-secondary-text font-public-sans">
            Every queue is clear — no orders waiting, no stock below its reorder level, nothing unanswered.
          </p>
        ) : (
          /* Pipeline and the rest share one grid so the tiles line up on the
             same 4-up rhythm as the KPI row below, rather than a card row
             followed by a ragged strip of pills. A stage with nothing in it
             stays visible: the shape of the day is what makes it legible. */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {[...PIPELINE, ...elsewhere].map((t) => (
              <OrderStatTile
                key={t.key}
                accent={t.accent}
                icon={t.icon}
                label={t.label}
                value={String(counts[t.key] || 0)}
                href={t.href}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

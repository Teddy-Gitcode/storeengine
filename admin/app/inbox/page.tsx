import { revalidatePath } from 'next/cache';
import { getPromotions, getSupportTickets, replyToTicket, updateTicket } from '@/lib/admin-api';
import InboxClient from './InboxClient';

export const dynamic = 'force-dynamic';

/* The one place support conversations are worked.
 *
 * There used to be two: /support drew the same tickets as a table with triage
 * controls, /inbox drew them as a chat with none. Both called
 * getSupportTickets() — one dataset, two half-views, so answering someone meant
 * the chat and changing their status meant the table. They are merged here, and
 * /support redirects. */

function revalidateAll() {
  revalidatePath('/inbox');
}

async function replyAction(formData: FormData) {
  'use server';
  const reference = String(formData.get('reference') || '');
  const body = String(formData.get('body') || '').trim();
  const voucher = String(formData.get('voucher_code') || '').trim();
  // A voucher on its own is a reply: the backend writes the line for it.
  if (!reference || (!body && !voucher)) return;
  await replyToTicket(reference, body, voucher || undefined);
  revalidateAll();
}

async function setStatusAction(reference: string, status: string) {
  'use server';
  await updateTicket(reference, { status });
  revalidateAll();
}

async function setPriorityAction(reference: string, priority: string) {
  'use server';
  await updateTicket(reference, { priority });
  revalidateAll();
}

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ ticket?: string }>;
}) {
  const { ticket } = await searchParams;
  const [page, promotions] = await Promise.all([
    getSupportTickets({ page_size: 200 }).catch(() => null),
    getPromotions().catch(() => null),
  ]);
  // Codes that checkout would take right now — the only ones worth offering.
  const now = Date.now();
  const vouchers = (promotions?.results ?? [])
    .filter(
      (p) =>
        p.code &&
        p.status === 'active' &&
        (!p.starts_at || Date.parse(p.starts_at) <= now) &&
        (!p.ends_at || Date.parse(p.ends_at) >= now) &&
        (p.usage_remaining === null || p.usage_remaining > 0) &&
        ['percentage', 'fixed', 'free_shipping'].includes(p.promotion_type),
    )
    .map((p) => ({ code: p.code, name: p.name }));
  // The API already orders by last activity; no client-side re-sort.
  const tickets = page?.results ?? [];

  return (
    <InboxClient
      tickets={tickets}
      // Deep links from the old /support/[reference] route, and from
      // notifications, land on a specific thread.
      initialReference={ticket}
      replyAction={replyAction}
      vouchers={vouchers}
      setStatusAction={setStatusAction}
      setPriorityAction={setPriorityAction}
    />
  );
}

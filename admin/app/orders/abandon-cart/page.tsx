import { revalidatePath } from 'next/cache';
import { getAbandonedCarts, remindAbandonedCart } from '@/lib/admin-api';
import ResourceList from '@/components/sellzy/resource-list';
import { StatusPill } from '@/components/sellzy/product-ui';

export const dynamic = 'force-dynamic';

async function remindAction(formData: FormData) {
  'use server';
  const id = Number(formData.get('cart_id'));
  if (!id) return;
  await remindAbandonedCart(id);
  revalidatePath('/orders/abandon-cart');
}

export default async function AbandonedCartPage() {
  const page = await getAbandonedCarts().catch(() => null);
  const carts = page?.results ?? [];

  return (
    <ResourceList
      title="Abandoned cart"
      columns={[
        { key: 'id', label: 'ID' },
        { key: 'customer', label: 'Customer' },
        { key: 'items', label: 'Items' },
        { key: 'amount', label: 'Amount' },
        { key: 'status', label: 'Status' },
        { key: 'date', label: 'Date' },
        { key: 'remind', label: '' },
      ]}
      statusFilter={{ label: 'All status', options: [
        { value: 'active', label: 'Active' },
        { value: 'abandoned', label: 'Abandoned' },
        { value: 'recovered', label: 'Recovered' },
      ] }}
      rows={carts.map((c) => ({
        id: c.id,
        search: `${c.reference} ${c.customer_name} ${c.email}`,
        status: c.status,
        cells: {
          id: <span className="whitespace-nowrap">{c.reference}</span>,
          customer: (
            <span className="flex flex-col">
              <span className="font-semibold text-light-primary-text">{c.customer_name}</span>
              {c.email && <span className="text-xs">{c.email}</span>}
            </span>
          ),
          items: <span className="font-dm-sans">{c.item_count}</span>,
          amount: <span className="font-dm-sans">{c.currency} {c.subtotal}</span>,
          status: <StatusPill label={c.status_label} tone={c.status === 'recovered' ? 'success' : c.status === 'abandoned' ? 'warning' : 'info'} />,
          date: <span className="whitespace-nowrap">{new Date(c.last_activity_at).toLocaleDateString()}</span>,
          remind: (
            <form data-manage action={remindAction}>
              <input type="hidden" name="cart_id" value={c.id} />
              <button type="submit" className="rounded-full border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50 font-public-sans">
                {c.reminder_sent_at ? 'Remind again' : 'Send reminder'}
              </button>
            </form>
          ),
        },
      }))}
      emptyMessage="No abandoned carts — they appear here as shoppers leave items behind."
    />
  );
}

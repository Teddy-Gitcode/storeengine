import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { ArrowLeft, MapPin, Pencil, ShoppingBag, User } from 'lucide-react';
import { deleteCustomer, getCustomer, getOrders, getStoreSettings } from '@/lib/admin-api';
import type { AdminOrder } from '@/lib/admin-types';
import {
  IconAction, StatusPill, TABLE_HEAD_ROW, TABLE_ROW, TABLE_TD, TABLE_TH, type PillTone,
} from '@/components/sellzy/product-ui';
import DeactivateCustomer from './DeactivateCustomer';

export const dynamic = 'force-dynamic';

function orderTone(status: string): PillTone {
  if (status === 'delivered' || status === 'paid') return 'success';
  if (status === 'cancelled' || status === 'refunded') return 'error';
  if (status === 'pending') return 'warning';
  return 'info';
}

function titleCase(value: string) {
  return value.replaceAll('_', ' ').replace(/^\w/, (c) => c.toUpperCase());
}

async function deleteCustomerAction(formData: FormData): Promise<{ error?: string } | void> {
  'use server';
  const id = Number(formData.get('id'));
  try {
    await deleteCustomer(id);
  } catch (err) {
    const message = err instanceof Error ? err.message : '';
    return { error: message.split(' — ')[1] || 'The customer could not be removed.' };
  }
  revalidatePath('/customers');
  redirect('/customers');
}

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const customer = await getCustomer(Number(id));
  if (!customer) notFound();

  const [ordersPage, settings] = await Promise.all([
    // `q` searches order number, name and email, so the exact match is re-checked below.
    customer.user.email
      ? getOrders({ q: customer.user.email, page_size: 200 }).catch(() => null)
      : Promise.resolve(null),
    getStoreSettings().catch(() => null),
  ]);

  const orders: AdminOrder[] = (ordersPage?.results ?? []).filter(
    (o) => o.email.toLowerCase() === customer.user.email.toLowerCase(),
  );
  const money = new Intl.NumberFormat(settings?.locale || 'en-US', {
    style: 'currency',
    currency: settings?.currency_code || 'USD',
    maximumFractionDigits: 0,
  });
  const spent = orders
    .filter((o) => o.payment_status === 'paid')
    .reduce((sum, o) => sum + Number(o.grand_total), 0);

  const fullName = `${customer.user.first_name} ${customer.user.last_name}`.trim() || customer.user.username;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* ─── Header ─────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Link
            href="/customers"
            className="flex size-8 items-center justify-center rounded-full text-light-primary-text transition-colors hover:bg-gray-200"
            aria-label="Back to customers"
          >
            <ArrowLeft size={20} />
          </Link>
          <h2 className="text-lg font-bold text-light-primary-text font-public-sans sm:text-xl">Customer Details</h2>
        </div>
        <div className="flex items-center gap-2">
          <StatusPill
            label={customer.user.is_active ? 'Active' : 'Inactive'}
            tone={customer.user.is_active ? 'primary' : 'neutral'}
          />
          <Link
            href={`/customers/edit/${customer.id}`}
            className="inline-flex h-7.5 items-center gap-1.5 rounded-full border border-gray-300 px-4 py-1 text-[13px] font-bold text-light-secondary-text transition-colors hover:bg-gray-50 font-public-sans"
          >
            <Pencil size={13} />Edit
          </Link>
        </div>
      </div>

      {/* ─── Basic Information ──────────────────── */}
      <div className="rounded-2xl border border-gray-500/20 bg-surface">
        <h3 className="border-b border-gray-500/20 px-4 py-4 text-lg font-bold text-light-primary-text sm:px-6 font-public-sans">
          Basic Information
        </h3>
        <div className="p-4 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-100">
              {customer.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element -- backend media host, not in next.config images
                <img src={customer.avatar_url} alt={fullName} className="size-full object-cover" />
              ) : (
                <User size={26} className="text-gray-400" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-bold text-light-primary-text font-public-sans">{fullName}</h2>
              <p className="text-sm text-light-secondary-text font-public-sans">{customer.user.email}</p>
              <p className="text-sm text-light-secondary-text font-public-sans">{customer.phone || 'No phone number'}</p>
            </div>
          </div>

          <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: 'Orders', value: String(customer.orders_count) },
              { label: 'Total Spent', value: money.format(spent) },
              { label: 'Marketing', value: customer.marketing_opt_in ? 'Subscribed' : 'Not subscribed' },
              {
                label: 'Customer Since',
                value: new Date(customer.user.date_joined).toLocaleDateString(settings?.locale || 'en-US', {
                  day: 'numeric', month: 'short', year: 'numeric',
                }),
              },
            ].map((item) => (
              <div key={item.label}>
                <dt className="text-xs text-light-secondary-text font-public-sans">{item.label}</dt>
                <dd className="text-sm font-bold text-light-primary-text font-public-sans">{item.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {/* ─── Addresses ──────────────────────────── */}
      <div className="rounded-2xl border border-gray-500/20 bg-surface">
        <h3 className="border-b border-gray-500/20 px-4 py-4 text-lg font-bold text-light-primary-text sm:px-6 font-public-sans">
          Addresses
        </h3>
        <div className="p-4 sm:p-6">
          {customer.addresses.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
              <MapPin size={26} className="text-gray-400" />
              <p className="text-sm font-semibold text-light-primary-text font-public-sans">No saved addresses</p>
              <p className="text-xs text-light-secondary-text font-public-sans">
                Addresses appear here once the customer saves one at checkout.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {customer.addresses.map((address) => (
                <div key={address.id} className="rounded-xl border border-gray-500/20 p-4">
                  <div className="mb-1 flex items-center gap-2">
                    <p className="text-sm font-semibold text-light-primary-text font-public-sans">{address.full_name}</p>
                    {address.is_default && <StatusPill label="Default" tone="success" />}
                  </div>
                  <p className="text-xs text-light-secondary-text font-public-sans">
                    {address.line1}, {address.city}, {address.country_code}
                  </p>
                  <p className="text-xs text-light-secondary-text font-public-sans">{address.phone}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── Order History ──────────────────────── */}
      <div className="w-full rounded-2xl bg-surface">
        <div className="flex items-center justify-between gap-4 p-4 pb-4 sm:p-6">
          <h3 className="text-xl font-bold leading-7 text-light-primary-text font-public-sans">Order History</h3>
          <span className="text-xs text-light-secondary-text font-public-sans">{orders.length} orders</span>
        </div>
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <ShoppingBag size={28} className="text-gray-400" />
            <p className="text-sm font-semibold text-light-primary-text font-public-sans">No orders yet</p>
            <p className="text-xs text-light-secondary-text font-public-sans">
              This customer has not placed an order.
            </p>
          </div>
        ) : (
          <div className="relative w-full overflow-auto">
            <table className="w-full caption-bottom text-sm">
              <thead>
                <tr className={TABLE_HEAD_ROW}>
                  <th className={TABLE_TH}>ID</th>
                  <th className={TABLE_TH}>Product</th>
                  <th className={TABLE_TH}>Items</th>
                  <th className={TABLE_TH}>Amount</th>
                  <th className={TABLE_TH}>Payment status</th>
                  <th className={TABLE_TH}>Status</th>
                  <th className={TABLE_TH}>Date</th>
                  <th className={TABLE_TH}>Action</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => {
                  const items = o.items.reduce((sum, i) => sum + i.quantity, 0);
                  const first = o.items[0]?.name ?? '—';
                  return (
                    <tr key={o.id} className={TABLE_ROW}>
                      <td className={`${TABLE_TD} whitespace-nowrap text-sm text-light-secondary-text`}>#{o.number}</td>
                      <td className={`${TABLE_TD} max-w-[220px] truncate text-sm text-light-secondary-text`} title={first}>
                        {first}
                        {o.items.length > 1 && ` +${o.items.length - 1}`}
                      </td>
                      <td className={`${TABLE_TD} whitespace-nowrap text-sm tabular-nums text-light-secondary-text`}>{items}</td>
                      <td className={`${TABLE_TD} whitespace-nowrap font-dm-sans text-sm font-semibold text-primary`}>
                        {money.format(Number(o.grand_total))}
                      </td>
                      <td className={`${TABLE_TD} whitespace-nowrap`}>
                        <StatusPill
                          label={titleCase(o.payment_status)}
                          tone={o.payment_status === 'paid' ? 'success' : o.payment_status === 'refunded' ? 'error' : 'warning'}
                        />
                      </td>
                      <td className={`${TABLE_TD} whitespace-nowrap`}>
                        <StatusPill label={titleCase(o.status)} tone={orderTone(o.status)} />
                      </td>
                      <td className={`${TABLE_TD} whitespace-nowrap text-sm text-light-secondary-text`}>
                        {new Date(o.placed_at || o.created_at).toLocaleDateString(settings?.locale || 'en-US', {
                          day: 'numeric', month: 'short', year: 'numeric',
                        })}
                      </td>
                      <td className={`${TABLE_TD} whitespace-nowrap`}>
                        <IconAction href={`/orders/${o.number}`} title="View order"><ShoppingBag size={16} /></IconAction>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <DeactivateCustomer
        id={customer.id}
        hasOrders={customer.orders_count > 0}
        isActive={customer.user.is_active}
        action={deleteCustomerAction}
      />
    </div>
  );
}

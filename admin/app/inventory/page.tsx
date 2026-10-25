import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { Plus } from 'lucide-react';
import { getStockOrderRequests, getSuppliers, getWarehouses, receiveStockOrderRequest } from '@/lib/admin-api';
import ResourceList from '@/components/sellzy/resource-list';
import { StatusPill } from '@/components/sellzy/product-ui';

export const dynamic = 'force-dynamic';

async function receiveAction(formData: FormData) {
  'use server';
  const id = Number(formData.get('request_id'));
  if (!id) return;
  await receiveStockOrderRequest(id);
  revalidatePath('/inventory');
  revalidatePath('/products/stocks');
}

function toneForRequest(status: string) {
  if (status === 'received') return 'success' as const;
  if (status === 'approved') return 'info' as const;
  if (status === 'cancelled') return 'neutral' as const;
  return 'warning' as const;
}

export default async function ManageInventoryPage() {
  const [requests, warehouses, suppliers] = await Promise.all([
    getStockOrderRequests().catch(() => null),
    getWarehouses().catch(() => null),
    getSuppliers().catch(() => null),
  ]);

  const tiles = [
    { label: 'Warehouses', value: warehouses?.results.length ?? 0, href: '/inventory/warehouses' },
    { label: 'Suppliers', value: suppliers?.results.length ?? 0, href: '/inventory/suppliers' },
    { label: 'Open requests', value: (requests?.results ?? []).filter((r) => r.status !== 'received' && r.status !== 'cancelled').length },
    { label: 'Received', value: (requests?.results ?? []).filter((r) => r.status === 'received').length },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {tiles.map((t) => {
          const body = (
            <>
              <p className="text-xs font-semibold uppercase tracking-wide text-light-secondary-text font-public-sans">{t.label}</p>
              <p className="mt-2 text-2xl font-bold text-light-primary-text font-dm-sans">{t.value}</p>
            </>
          );
          const shell = 'rounded-2xl border border-gray-500/20 bg-surface p-4 sm:p-6';
          return t.href ? (
            <Link key={t.label} href={t.href} className={`${shell} block transition-shadow hover:shadow-md`}>{body}</Link>
          ) : (
            <div key={t.label} className={shell}>{body}</div>
          );
        })}
      </div>

      <ResourceList
        title="Stock Order Requests"
        createHref="/products/stocks/order-request"
        createLabel="New Order Request"
        columns={[
          { key: 'ref', label: 'Reference' },
          { key: 'product', label: 'Product' },
          { key: 'qty', label: 'Quantity' },
          { key: 'supplier', label: 'Supplier' },
          { key: 'warehouse', label: 'Warehouse' },
          { key: 'priority', label: 'Priority' },
          { key: 'status', label: 'Status' },
          { key: 'receive', label: '' },
        ]}
        rows={(requests?.results ?? []).map((r) => ({
          id: r.id,
          search: `${r.reference} ${r.product?.name ?? ''} ${r.supplier_name}`,
          status: r.status,
          cells: {
            ref: <span className="font-semibold text-light-primary-text">{r.reference}</span>,
            product: r.product?.name ?? '—',
            qty: <span className="font-dm-sans">{r.quantity} {r.unit}</span>,
            supplier: r.supplier_name || '—',
            warehouse: r.warehouse_name || '—',
            priority: r.priority_label,
            status: <StatusPill label={r.status_label} tone={toneForRequest(r.status)} />,
            receive: r.status === 'received' || r.status === 'cancelled' ? null : (
              <form data-manage action={receiveAction}>
                <input type="hidden" name="request_id" value={r.id} />
                <button type="submit" className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-primary-dark font-public-sans">
                  Receive
                </button>
              </form>
            ),
          },
        }))}
        statusFilter={{ label: 'All status', options: [
          { value: 'requested', label: 'Requested' },
          { value: 'approved', label: 'Approved' },
          { value: 'received', label: 'Received' },
          { value: 'cancelled', label: 'Cancelled' },
        ] }}
        emptyMessage="No stock order requests yet."
      />

      <div className="rounded-2xl border border-gray-500/20 bg-surface p-4 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-xl font-bold text-light-primary-text font-public-sans">Warehouses</h3>
          <div className="flex items-center gap-2">
            <Link
              href="/inventory/warehouses"
              className="rounded-full border border-gray-500/30 px-3 py-1.5 text-xs font-semibold text-light-primary-text transition-colors hover:bg-gray-100 font-public-sans"
            >
              Manage
            </Link>
            <Link
              href="/inventory/warehouses/add"
              className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-primary-dark font-public-sans"
            >
              <Plus size={14} />Add warehouse
            </Link>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(warehouses?.results ?? []).map((w) => (
            <Link
              key={w.id}
              href={`/inventory/warehouses/edit/${w.id}`}
              className="block rounded-xl border border-gray-500/20 p-4 transition-shadow hover:shadow-md"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-light-primary-text font-public-sans">{w.name}</p>
                {w.is_default && <StatusPill label="Default" tone="success" />}
              </div>
              <p className="mt-1 text-sm text-light-secondary-text font-public-sans">
                {[w.city, w.country].filter(Boolean).join(', ') || 'No location set'}
              </p>
              <p className="mt-2 text-xs text-light-secondary-text font-public-sans">{w.stock_item_count} stock records</p>
            </Link>
          ))}
          {(warehouses?.results ?? []).length === 0 && (
            <p className="text-sm text-light-secondary-text font-public-sans">
              No warehouses yet — stock sits on a single unnamed location until you add one.
            </p>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-gray-500/20 bg-surface p-4 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-xl font-bold text-light-primary-text font-public-sans">Suppliers</h3>
          <div className="flex items-center gap-2">
            <Link
              href="/inventory/suppliers"
              className="rounded-full border border-gray-500/30 px-3 py-1.5 text-xs font-semibold text-light-primary-text transition-colors hover:bg-gray-100 font-public-sans"
            >
              Manage
            </Link>
            <Link
              href="/inventory/suppliers/add"
              className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-primary-dark font-public-sans"
            >
              <Plus size={14} />Add supplier
            </Link>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(suppliers?.results ?? []).map((s) => (
            <Link
              key={s.id}
              href={`/inventory/suppliers/edit/${s.id}`}
              className="block rounded-xl border border-gray-500/20 p-4 transition-shadow hover:shadow-md"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-light-primary-text font-public-sans">{s.name}</p>
                {!s.is_active && <StatusPill label="Inactive" tone="neutral" />}
              </div>
              <p className="mt-1 text-sm text-light-secondary-text font-public-sans">
                {s.contact_name || s.email || 'No contact set'}
              </p>
              <p className="mt-2 text-xs text-light-secondary-text font-public-sans">
                {s.lead_time_days ? `${s.lead_time_days} day lead time` : 'No lead time set'}
              </p>
            </Link>
          ))}
          {(suppliers?.results ?? []).length === 0 && (
            <p className="text-sm text-light-secondary-text font-public-sans">
              No suppliers yet — a restock request cannot say who it is being ordered from until you add one.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

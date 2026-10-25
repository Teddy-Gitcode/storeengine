import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createStockOrderRequest, getProducts, getSuppliers, getWarehouses } from '@/lib/admin-api';
import ResourceForm from '@/components/sellzy/resource-form';

export const dynamic = 'force-dynamic';

const ORDER_TYPES = [
  { value: 'restock', label: 'Restock' },
  { value: 'new_stock', label: 'New stock' },
  { value: 'replacement', label: 'Replacement' },
];

const PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

async function createAction(formData: FormData) {
  'use server';
  const productId = Number(formData.get('product_id'));
  if (!productId) return { error: 'Pick the product to order.' };
  const supplier = Number(formData.get('supplier'));
  const warehouse = Number(formData.get('warehouse'));
  try {
    await createStockOrderRequest({
      product_id: productId,
      quantity: Number(formData.get('quantity') || 1),
      unit: String(formData.get('unit') || 'pcs'),
      order_type: String(formData.get('order_type') || 'restock'),
      priority: String(formData.get('priority') || 'normal'),
      supplier: supplier || null,
      warehouse: warehouse || null,
      note: String(formData.get('note') || '').trim(),
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Could not raise the request.' };
  }
  revalidatePath('/inventory');
  revalidatePath('/products/stocks');
  redirect('/inventory');
}

export default async function StockOrderRequestPage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string; qty?: string }>;
}) {
  const { product: productParam, qty: qtyParam } = await searchParams;
  const [products, suppliers, warehouses] = await Promise.all([
    getProducts({ page_size: 200 }).catch(() => null),
    getSuppliers().catch(() => null),
    getWarehouses().catch(() => null),
  ]);

  /* Arriving from a stock row's "Order Now": that row already knew which
     product and roughly how many, and making the merchant find it again in a
     200-option select was the whole complaint. Only preselect an id that is
     actually in the list, so a stale link degrades to the blank form. */
  const requestedId = Number(productParam);
  const preselected = (products?.results ?? []).some((p) => p.id === requestedId) ? requestedId : '';
  const requestedQty = Number(qtyParam);
  const defaultQty = Number.isFinite(requestedQty) && requestedQty > 0 ? Math.trunc(requestedQty) : 1;

  const defaultWarehouse = (warehouses?.results ?? []).find((w) => w.is_default)?.id ?? '';

  return (
    <ResourceForm
      title="New Order Request"
      backHref="/products/stocks"
      submitLabel="Save"
      fields={[
        {
          kind: 'select', name: 'product_id', label: 'Product', defaultValue: preselected,
          options: [
            { value: '', label: 'Select a product' },
            ...(products?.results ?? []).map((p) => ({
              value: p.id,
              label: `${p.name}${p.sku ? ` (${p.sku})` : ''} — ${p.stock?.quantity_on_hand ?? 0} in stock`,
            })),
          ],
        },
        {
          kind: 'number', name: 'quantity', label: 'Quantity', defaultValue: defaultQty, half: true,
          hint: productParam ? 'Suggested to bring this product to twice its reorder level.' : undefined,
        },
        { kind: 'text', name: 'unit', label: 'Unit', defaultValue: 'pcs', half: true },
        { kind: 'select', name: 'order_type', label: 'Order Type', defaultValue: 'restock', options: ORDER_TYPES, half: true },
        { kind: 'select', name: 'priority', label: 'Priority', defaultValue: 'normal', options: PRIORITIES, half: true },
        {
          kind: 'select', name: 'supplier', label: 'Supplier',
          options: [
            { value: '', label: (suppliers?.results ?? []).length ? 'No supplier' : 'No suppliers added yet' },
            ...(suppliers?.results ?? []).map((s) => ({ value: s.id, label: s.name })),
          ],
          half: true,
          hint: (suppliers?.results ?? []).length ? undefined : 'Add suppliers under Catalog → Stock → Suppliers.',
        },
        {
          kind: 'select', name: 'warehouse', label: 'Location/Warehouse', defaultValue: defaultWarehouse,
          options: [
            { value: '', label: (warehouses?.results ?? []).length ? 'No warehouse' : 'No warehouses added yet' },
            ...(warehouses?.results ?? []).map((w) => ({ value: w.id, label: w.name })),
          ],
          half: true,
          hint: (warehouses?.results ?? []).length ? undefined : 'Add warehouses under Catalog → Stock → Warehouses.',
        },
        { kind: 'textarea', name: 'note', label: 'Short Description', rows: 4 },
      ]}
      action={createAction}
    />
  );
}

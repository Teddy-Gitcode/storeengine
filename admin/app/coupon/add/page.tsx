import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createPromotion, getProducts } from '@/lib/admin-api';
import ResourceForm from '@/components/sellzy/resource-form';
import EntityPicker from '@/components/sellzy/entity-picker';
import { couponPayload, PROMOTION_TYPES, SITEWIDE_OPTIONS } from '../coupon-payload';

export const dynamic = 'force-dynamic';

async function createAction(formData: FormData) {
  'use server';
  const payload = couponPayload(formData);
  if (!payload) return { error: 'The coupon needs a title.' };
  try {
    await createPromotion(payload);
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Could not create the coupon.' };
  }
  revalidatePath('/coupon');
  redirect('/coupon');
}

export default async function AddCouponPage() {
  const products = await getProducts({ page_size: 200 });

  return (
    <ResourceForm
      title="Create New Coupon"
      backHref="/coupon"
      submitLabel="Create Coupon"
      status={{
        name: 'status',
        defaultValue: 'draft',
        publishedValue: 'active',
        draftValue: 'draft',
        publishedLabel: 'Active',
        draftLabel: 'Draft',
      }}
      fields={[
        { kind: 'text', name: 'name', label: 'Title', required: true, half: true },
        { kind: 'text', name: 'code', label: 'Coupon Code', half: true },
        { kind: 'select', name: 'promotion_type', label: 'Coupon Type', options: PROMOTION_TYPES, half: true },
        { kind: 'number', name: 'value', label: 'Coupon Amount', half: true },
        { kind: 'number', name: 'min_order_amount', label: 'Min Amount', half: true },
        { kind: 'number', name: 'usage_limit', label: 'User Limit', half: true },
        { kind: 'datetime-local', name: 'starts_at', label: 'Start Date', half: true },
        { kind: 'datetime-local', name: 'ends_at', label: 'End Date', half: true },
        { kind: 'select', name: 'is_sitewide', label: 'Visibility', options: SITEWIDE_OPTIONS, half: true },
        { kind: 'textarea', name: 'applies_to', label: 'Short Description', rows: 3 },
      ]}
      action={createAction}
    >
      <div className="rounded-2xl border border-gray-500/20 p-4 sm:p-6">
        <h2 className="mb-6 text-lg font-bold text-gray-900 font-public-sans">Add Product for Coupon</h2>
        <EntityPicker
          items={products.results.map((p) => ({ id: p.id, name: p.name }))}
          name="product_ids"
          label="Select Products"
          emptyLabel="All products added"
          chooseLabel="Choose a product…"
        />
        <p className="mt-3 text-xs text-light-secondary-text font-public-sans">
          Leave empty to let the coupon apply to the whole basket.
        </p>
      </div>
    </ResourceForm>
  );
}

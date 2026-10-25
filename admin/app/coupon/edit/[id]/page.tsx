import { notFound, redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getProducts, getPromotion, updatePromotion } from '@/lib/admin-api';
import ResourceForm from '@/components/sellzy/resource-form';
import EntityPicker from '@/components/sellzy/entity-picker';
import { couponPayload, PROMOTION_TYPES, SITEWIDE_OPTIONS, toLocalInput } from '../../coupon-payload';

export const dynamic = 'force-dynamic';

async function saveAction(formData: FormData) {
  'use server';
  const id = Number(formData.get('id'));
  const payload = couponPayload(formData);
  if (!id || !payload) return { error: 'The coupon needs a title.' };
  try {
    await updatePromotion(id, {
      ...payload,
      starts_at: payload.starts_at || null,
      ends_at: payload.ends_at || null,
      usage_limit: payload.usage_limit ? Number(payload.usage_limit) : null,
      min_order_amount: payload.min_order_amount || '0',
      // The picker always posts its marker, so an emptied list clears the products.
      product_ids: payload.product_ids,
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Could not save the coupon.' };
  }
  revalidatePath('/coupon');
  redirect('/coupon');
}

export default async function EditCouponPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [promo, products] = await Promise.all([
    getPromotion(Number(id)),
    getProducts({ page_size: 200 }),
  ]);
  if (!promo) notFound();

  return (
    <ResourceForm
      title="Edit Coupon"
      backHref="/coupon"
      submitLabel="Save Coupon"
      status={{
        name: 'status',
        defaultValue: promo.status === 'active' ? 'active' : 'draft',
        publishedValue: 'active',
        draftValue: 'draft',
        publishedLabel: 'Active',
        draftLabel: 'Draft',
      }}
      fields={[
        { kind: 'hidden', name: 'id', value: promo.id },
        { kind: 'text', name: 'name', label: 'Title', defaultValue: promo.name, required: true, half: true },
        { kind: 'text', name: 'code', label: 'Coupon Code', defaultValue: promo.code, half: true },
        {
          kind: 'select',
          name: 'promotion_type',
          label: 'Coupon Type',
          defaultValue: promo.promotion_type,
          options: PROMOTION_TYPES,
          half: true,
        },
        { kind: 'number', name: 'value', label: 'Coupon Amount', defaultValue: promo.value, half: true },
        {
          kind: 'number',
          name: 'min_order_amount',
          label: 'Min Amount',
          defaultValue: promo.min_order_amount ?? '',
          half: true,
        },
        {
          kind: 'number',
          name: 'usage_limit',
          label: 'User Limit',
          defaultValue: promo.usage_limit ?? '',
          half: true,
        },
        {
          kind: 'datetime-local',
          name: 'starts_at',
          label: 'Start Date',
          defaultValue: toLocalInput(promo.starts_at),
          half: true,
        },
        {
          kind: 'datetime-local',
          name: 'ends_at',
          label: 'End Date',
          defaultValue: toLocalInput(promo.ends_at),
          half: true,
        },
        {
          kind: 'select',
          name: 'is_sitewide',
          label: 'Visibility',
          defaultValue: promo.is_sitewide ? 'yes' : 'no',
          options: SITEWIDE_OPTIONS,
          half: true,
        },
        {
          kind: 'textarea',
          name: 'applies_to',
          label: 'Short Description',
          defaultValue: promo.applies_to,
          rows: 3,
        },
      ]}
      action={saveAction}
    >
      <div className="rounded-2xl border border-gray-500/20 p-4 sm:p-6">
        <h2 className="mb-6 text-lg font-bold text-gray-900 font-public-sans">Add Product for Coupon</h2>
        <EntityPicker
          items={products.results.map((p) => ({ id: p.id, name: p.name }))}
          selectedIds={(promo.products ?? []).map((p) => p.id)}
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

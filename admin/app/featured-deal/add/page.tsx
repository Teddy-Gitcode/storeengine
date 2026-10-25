import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createDeal, getProducts } from '@/lib/admin-api';
import { linkCategories } from '@/lib/link-targets';
import ResourceForm from '@/components/sellzy/resource-form';
import { DEAL_STATUS_PILL, dealFields, dealPayload } from '@/components/sellzy/deal-pages';

export const dynamic = 'force-dynamic';

async function createAction(formData: FormData) {
  'use server';
  const payload = dealPayload('featured', formData);
  if (!payload) return { error: 'The title is required.' };
  try {
    await createDeal(payload);
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Could not save the deal.' };
  }
  revalidatePath('/featured-deal');
  redirect('/featured-deal');
}

export default async function AddFeaturedDealPage() {
  const [products, categories] = await Promise.all([
    getProducts({ page_size: 200 }).catch(() => null),
    linkCategories(),
  ]);

  return (
    <ResourceForm
      title="Create New Featured Deal"
      backHref="/featured-deal"
      submitLabel="Create"
      status={{ ...DEAL_STATUS_PILL, defaultValue: 'draft' }}
      fields={dealFields('featured', products?.results ?? [], undefined, categories)}
      action={createAction}
    />
  );
}

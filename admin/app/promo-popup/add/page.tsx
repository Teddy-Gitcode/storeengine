import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createPromoPopup } from '@/lib/admin-api';
import ResourceForm from '@/components/sellzy/resource-form';
import { linkCategories, linkProducts } from '@/lib/link-targets';
import { popupPayload, POPUP_KINDS, POPUP_FREQUENCIES } from '../popup-payload';

export const dynamic = 'force-dynamic';

async function createAction(formData: FormData) {
  'use server';
  const payload = popupPayload(formData);
  if (!payload) return { error: 'The title is required.' };
  try {
    await createPromoPopup(payload);
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Could not save the promo.' };
  }
  revalidatePath('/promo-popup');
  redirect('/promo-popup');
}

export default async function AddPromoPopupPage() {
  const [categories, products] = await Promise.all([linkCategories(), linkProducts()]);
  return (
    <ResourceForm
      title="Create New Promo"
      backHref="/promo-popup"
      submitLabel="Create Promo"
      status={{ name: 'status', defaultValue: 'published', publishedValue: 'published', draftValue: 'draft' }}
      fields={[
        { kind: 'image', name: 'image', label: 'Upload Image' },
        { kind: 'text', name: 'title', label: 'Internal name', required: true, half: true },
        { kind: 'number', name: 'sort_order', label: 'Short Order', defaultValue: 0, half: true },
        { kind: 'select', name: 'kind', label: 'Type', options: POPUP_KINDS, half: true },
        { kind: 'text', name: 'headline', label: 'Headline (shown to shoppers)', defaultValue: '', hint: 'Leave every copy field empty to show the image on its own, as promos did before.' },
        { kind: 'text', name: 'body', label: 'Supporting line', defaultValue: '' },
        { kind: 'text', name: 'cta_label', label: 'Button label', defaultValue: '', half: true },
        { kind: 'link', name: 'link_url', label: 'Link goes to', categories, products, noneLabel: 'No link' },
        { kind: 'select', name: 'frequency', label: 'Show', options: POPUP_FREQUENCIES, half: true },
        { kind: 'datetime-local', name: 'starts_at', label: 'Start Date', half: true },
        { kind: 'datetime-local', name: 'ends_at', label: 'End Date', half: true },
      ]}
      action={createAction}
    />
  );
}

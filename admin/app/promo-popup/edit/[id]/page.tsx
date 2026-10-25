import { revalidatePath } from 'next/cache';
import { notFound, redirect } from 'next/navigation';
import { getPromoPopup, updatePromoPopup } from '@/lib/admin-api';
import ResourceForm from '@/components/sellzy/resource-form';
import { linkCategories, linkProducts } from '@/lib/link-targets';
import { popupPayload, POPUP_KINDS, POPUP_FREQUENCIES, toLocalInput } from '../../popup-payload';

export const dynamic = 'force-dynamic';

export default async function EditPromoPopupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [popup, categories, products] = await Promise.all([
    getPromoPopup(Number(id)).catch(() => null),
    linkCategories(),
    linkProducts(),
  ]);
  if (!popup) notFound();

  async function updateAction(formData: FormData) {
    'use server';
    const payload = popupPayload(formData);
    if (!payload) return { error: 'The title is required.' };
    try {
      await updatePromoPopup(Number(id), payload);
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Could not save the promo.' };
    }
    revalidatePath('/promo-popup');
    redirect('/promo-popup');
  }

  return (
    <ResourceForm
      title="Edit Promo"
      backHref="/promo-popup"
      status={{ name: 'status', defaultValue: popup.status, publishedValue: 'published', draftValue: 'draft' }}
      fields={[
        { kind: 'image', name: 'image', label: 'Upload Image', currentUrl: popup.image_url || undefined },
        { kind: 'text', name: 'title', label: 'Internal name', defaultValue: popup.title, required: true, half: true, hint: 'For your list and the image alt text — not shown as a heading.' },
        { kind: 'number', name: 'sort_order', label: 'Short Order', defaultValue: popup.sort_order, half: true },
        { kind: 'select', name: 'kind', label: 'Type', defaultValue: popup.kind, options: POPUP_KINDS, half: true },
        { kind: 'text', name: 'headline', label: 'Headline (shown to shoppers)', defaultValue: popup.headline, hint: 'Leave every copy field empty to show the image on its own, as promos did before.' },
        { kind: 'text', name: 'body', label: 'Supporting line', defaultValue: popup.body },
        { kind: 'text', name: 'cta_label', label: 'Button label', defaultValue: popup.cta_label, half: true },
        { kind: 'link', name: 'link_url', label: 'Link goes to', defaultValue: popup.link_url, categories, products, noneLabel: 'No link' },
        { kind: 'select', name: 'frequency', label: 'Show', defaultValue: popup.frequency, options: POPUP_FREQUENCIES, half: true },
        { kind: 'datetime-local', name: 'starts_at', label: 'Start Date', defaultValue: toLocalInput(popup.starts_at), half: true },
        { kind: 'datetime-local', name: 'ends_at', label: 'End Date', defaultValue: toLocalInput(popup.ends_at), half: true },
      ]}
      action={updateAction}
    />
  );
}

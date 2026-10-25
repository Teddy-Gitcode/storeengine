/* Multipart builder for the promo-popup form (it carries an image upload).
   No `instanceof File` — the File global doesn't exist in this Node runtime. */
export function popupPayload(formData: FormData): FormData | null {
  const title = String(formData.get('title') || '').trim();
  if (!title) return null;
  const fd = new FormData();
  fd.set('title', title);
  fd.set('kind', String(formData.get('kind') || 'popup'));
  // What the shopper reads. Blank is valid and means the promo shows as a
  // bare image, which is how every promo behaved before these existed.
  fd.set('headline', String(formData.get('headline') || '').trim());
  fd.set('body', String(formData.get('body') || '').trim());
  fd.set('cta_label', String(formData.get('cta_label') || '').trim());
  fd.set('link_url', String(formData.get('link_url') || '').trim());
  fd.set('sort_order', String(Number(formData.get('sort_order') || 0)));
  fd.set('status', String(formData.get('status')) === 'draft' ? 'draft' : 'published');
  fd.set('frequency', String(formData.get('frequency') || 'once_per_session'));
  fd.set('starts_at', String(formData.get('starts_at') || ''));
  fd.set('ends_at', String(formData.get('ends_at') || ''));
  const image = formData.get('image');
  if (image && typeof image !== 'string' && image.size > 0) fd.set('image', image);
  return fd;
}

export const POPUP_KINDS = [
  { value: 'popup', label: 'Popup Promo' },
  { value: 'banner', label: 'Banner' },
];

export const POPUP_FREQUENCIES = [
  { value: 'once_per_session', label: 'Once per browser session' },
  { value: 'once_ever', label: 'Once, then never again' },
  { value: 'every_visit', label: 'Every page load' },
];

/** `datetime-local` wants `YYYY-MM-DDTHH:mm`; the API returns full ISO. */
export function toLocalInput(iso: string | null) {
  return iso ? iso.slice(0, 16) : '';
}

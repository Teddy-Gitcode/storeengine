/* Multipart builder for the payment-method form (carries a logo upload). */
export function methodPayload(formData: FormData): FormData | null {
  const name = String(formData.get('name') || '').trim();
  if (!name) return null;
  const fd = new FormData();
  fd.set('name', name);
  fd.set('body_text', String(formData.get('body_text') || '').trim());
  fd.set('provider', String(formData.get('provider') || ''));
  fd.set('sort_order', String(Number(formData.get('sort_order') || 0)));
  fd.set('is_active', String(formData.get('is_active')) === 'inactive' ? 'false' : 'true');
  const logo = formData.get('logo');
  if (logo && typeof logo !== 'string' && logo.size > 0) fd.set('logo', logo);
  return fd;
}

export const PROVIDERS = [
  { value: '', label: 'Not linked' },
  { value: 'mobile_money', label: 'Mobile Money' },
  { value: 'stripe', label: 'Stripe' },
  { value: 'paypal', label: 'PayPal' },
  { value: 'manual', label: 'Manual' },
];

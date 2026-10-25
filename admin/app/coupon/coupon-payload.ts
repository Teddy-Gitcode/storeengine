/** Shared field reading for the coupon add/edit forms. */
export function couponPayload(formData: FormData) {
  const name = String(formData.get('name') || '').trim();
  if (!name) return null;
  return {
    name,
    code: String(formData.get('code') || '').trim(),
    promotion_type: String(formData.get('promotion_type') || 'percentage'),
    status: String(formData.get('status') || 'draft'),
    value: String(formData.get('value') || '0'),
    applies_to: String(formData.get('applies_to') || '').trim(),
    starts_at: String(formData.get('starts_at') || ''),
    ends_at: String(formData.get('ends_at') || ''),
    usage_limit: String(formData.get('usage_limit') || ''),
    min_order_amount: String(formData.get('min_order_amount') || ''),
    product_ids: formData.getAll('product_ids').map(Number).filter(Boolean),
    is_sitewide: String(formData.get('is_sitewide') || '') === 'yes',
  };
}

export const PROMOTION_TYPES = [
  { value: 'percentage', label: 'Percentage' },
  { value: 'fixed', label: 'Fixed amount' },
  { value: 'free_shipping', label: 'Free shipping' },
  { value: 'bogo', label: 'Buy one get one' },
  { value: 'featured', label: 'Featured' },
];

export const SITEWIDE_OPTIONS = [
  { value: 'no', label: 'Code only' },
  { value: 'yes', label: 'Sitewide banner' },
];

/** `datetime-local` wants `YYYY-MM-DDTHH:mm`; the API returns full ISO. */
export function toLocalInput(iso: string | null) {
  return iso ? iso.slice(0, 16) : '';
}

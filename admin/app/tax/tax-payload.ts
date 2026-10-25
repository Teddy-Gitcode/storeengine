export function taxPayload(formData: FormData): Record<string, unknown> | null {
  const name = String(formData.get('name') || '').trim();
  if (!name) return null;
  return {
    name,
    location: String(formData.get('location') || '').trim(),
    rate_type: String(formData.get('rate_type') || 'vat'),
    rate_percent: String(formData.get('rate_percent') || '0'),
    is_active: String(formData.get('is_active')) !== 'inactive',
    notes: String(formData.get('notes') || '').trim(),
  };
}

/* The backend matches `location` against the delivery city, state or country
   code, and a comma-separated list counts as one rule covering all of them.
   The old hint said none of that and used a US example on a Kenyan store. */
export const LOCATION_HINT =
  'Matched against the delivery address — a city, a state, or a country code. '
  + 'Comma-separate spellings of the same place ("Kenya, KE"). Leave blank to tax every order.';

export const RATE_TYPES = [
  { value: 'vat', label: 'VAT' },
  { value: 'sales_tax', label: 'Sales tax' },
  { value: 'gst', label: 'GST' },
  { value: 'custom', label: 'Custom' },
];

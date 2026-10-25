import type { ResourceField } from '@/components/sellzy/resource-form';
import type { AdminWarehouse, AdminSupplier } from '@/lib/admin-types';

/* Shared by the add and edit pages so a field added to one cannot go missing
   from the other — the defect that kept losing what merchants typed. */

/* The map pin submits empty strings when no point is set. Django's
   DecimalField takes a number or null and rejects "", so the empty case has to
   become null here rather than at the API. */
function coordinate(formData: FormData, name: string): number | null {
  const raw = String(formData.get(name) || '').trim();
  if (!raw) return null;
  const value = Number(raw);
  // Six places, as the columns keep (the API rounds too; this keeps the two
  // in agreement about what was sent).
  return Number.isFinite(value) ? Math.round(value * 1e6) / 1e6 : null;
}

export function warehousePayload(formData: FormData): Record<string, unknown> | null {
  const name = String(formData.get('name') || '').trim();
  if (!name) return null;
  const latitude = coordinate(formData, 'location_latitude');
  const longitude = coordinate(formData, 'location_longitude');
  const located = latitude !== null && longitude !== null;
  return {
    name,
    code: String(formData.get('code') || '').trim(),
    address: String(formData.get('address') || '').trim(),
    city: String(formData.get('city') || '').trim(),
    country: String(formData.get('country') || '').trim(),
    // Sent as a set or not at all. A lone coordinate is not a location, and a
    // source without a point claims a precision the record does not have.
    latitude: located ? latitude : null,
    longitude: located ? longitude : null,
    geocode_source: located ? String(formData.get('location_source') || '').trim() : '',
    is_default: formData.get('is_default') === 'true',
    is_active: formData.get('is_active') !== 'inactive',
  };
}

export function warehouseFields(w?: AdminWarehouse): ResourceField[] {
  return [
    { kind: 'text', name: 'name', label: 'Warehouse Name', defaultValue: w?.name, required: true, half: true },
    {
      kind: 'text', name: 'code', label: 'Code', defaultValue: w?.code, half: true,
      hint: 'A short label for pick lists and exports, e.g. NBO-1. Optional.',
    },
    { kind: 'text', name: 'address', label: 'Address', defaultValue: w?.address },
    { kind: 'text', name: 'city', label: 'City', defaultValue: w?.city, half: true },
    { kind: 'text', name: 'country', label: 'Country', defaultValue: w?.country, half: true },
    {
      kind: 'geo', name: 'location', label: 'Location on the map',
      // The API sends decimals as strings; the picker wants numbers.
      latitude: w?.latitude != null ? Number(w.latitude) : null,
      longitude: w?.longitude != null ? Number(w.longitude) : null,
      source: w?.geocode_source ?? '',
      hint: 'Used to work out which location a delivery should leave from. Optional — a warehouse without a pin still works, it just cannot be compared by distance.',
    },
    {
      kind: 'select', name: 'is_default', label: 'Default location',
      defaultValue: w?.is_default ? 'true' : 'false',
      options: [
        { value: 'false', label: 'No' },
        { value: 'true', label: 'Yes — preselect this when receiving stock' },
      ],
      hint: 'Only one location can be the default; setting this one clears the other.',
    },
  ];
}

export function supplierPayload(formData: FormData): Record<string, unknown> | null {
  const name = String(formData.get('name') || '').trim();
  if (!name) return null;
  const lead = Number(formData.get('lead_time_days'));
  return {
    name,
    contact_name: String(formData.get('contact_name') || '').trim(),
    email: String(formData.get('email') || '').trim(),
    phone: String(formData.get('phone') || '').trim(),
    address: String(formData.get('address') || '').trim(),
    lead_time_days: Number.isFinite(lead) && lead >= 0 ? Math.trunc(lead) : 0,
    notes: String(formData.get('notes') || '').trim(),
    is_active: formData.get('is_active') !== 'inactive',
  };
}

export function supplierFields(s?: AdminSupplier): ResourceField[] {
  return [
    { kind: 'text', name: 'name', label: 'Supplier Name', defaultValue: s?.name, required: true, half: true },
    { kind: 'text', name: 'contact_name', label: 'Contact Person', defaultValue: s?.contact_name, half: true },
    { kind: 'text', name: 'email', label: 'Email', defaultValue: s?.email, half: true },
    { kind: 'text', name: 'phone', label: 'Phone', defaultValue: s?.phone, half: true },
    { kind: 'text', name: 'address', label: 'Address', defaultValue: s?.address },
    {
      kind: 'number', name: 'lead_time_days', label: 'Lead Time (days)',
      defaultValue: s?.lead_time_days ?? 0, half: true,
      hint: 'How long this supplier usually takes to deliver, shown when you raise a restock request.',
    },
    { kind: 'textarea', name: 'notes', label: 'Notes', defaultValue: s?.notes, rows: 4 },
  ];
}

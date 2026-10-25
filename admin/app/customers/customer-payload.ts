/** Shared field reading for the customer add/edit forms. */
export function customerPayload(formData: FormData) {
  const name = String(formData.get('name') || '').trim();
  const email = String(formData.get('email') || '').trim();
  if (!name || !email) return null;
  return {
    name,
    email,
    phone: String(formData.get('phone') || '').trim(),
    marketing_opt_in: String(formData.get('marketing_opt_in') || '') === 'yes',
    is_active: String(formData.get('is_active') || 'active') === 'active',
  };
}

/** The picked avatar file, or null when the field was left alone. */
export function customerAvatar(formData: FormData): File | null {
  const avatar = formData.get('avatar');
  return avatar && typeof avatar !== 'string' && avatar.size > 0 ? avatar : null;
}

/* Multipart version of the payload, for the edit form once it carries an
   avatar. Booleans go as strings; the serializer's HtmlBooleanSafeMixin only
   writes the ones actually present. */
export function customerFormData(formData: FormData): FormData | null {
  const payload = customerPayload(formData);
  if (!payload) return null;
  const fd = new FormData();
  fd.set('name', payload.name);
  fd.set('email', payload.email);
  fd.set('phone', payload.phone);
  fd.set('marketing_opt_in', String(payload.marketing_opt_in));
  fd.set('is_active', String(payload.is_active));
  const avatar = customerAvatar(formData);
  if (avatar) fd.set('avatar', avatar);
  return fd;
}

export const OPT_IN_OPTIONS = [
  { value: 'no', label: 'Not subscribed' },
  { value: 'yes', label: 'Subscribed to marketing' },
];

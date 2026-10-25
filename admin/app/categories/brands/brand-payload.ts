/*
 * Shared multipart builder for the brand add/edit forms.
 * Note: no `instanceof File` — the File global doesn't exist in this Node
 * runtime; multipart entries are still File-shaped Blobs.
 */
function fileFrom(formData: FormData, key: string): Blob | null {
  const value = formData.get(key);
  if (!value || typeof value === 'string') return null;
  return value.size > 0 ? value : null;
}

export function brandPayload(formData: FormData): FormData | null {
  const name = String(formData.get('name') || '').trim();
  if (!name) return null;

  const fd = new FormData();
  fd.set('name', name);
  fd.set('description', String(formData.get('description') || '').trim());
  fd.set('website', String(formData.get('website') || '').trim());
  fd.set('sort_order', String(Number(formData.get('sort_order') || 0)));
  fd.set('is_active', String(formData.get('is_active')) === 'false' ? 'false' : 'true');

  // Blank slug lets the backend derive one from the name.
  const slug = String(formData.get('slug') || '').trim();
  if (slug) fd.set('slug', slug);

  const logo = fileFrom(formData, 'logo');
  if (logo) fd.set('logo', logo);
  const banner = fileFrom(formData, 'banner');
  if (banner) fd.set('banner', banner);

  return fd;
}

export function brandErrorMessage(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  if (/slug/i.test(message) && /exist|unique|already/i.test(message)) {
    return 'That slug is already taken — pick a different one.';
  }
  return message || 'Could not save the brand.';
}

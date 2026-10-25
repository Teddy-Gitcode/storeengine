import type { ResourceField } from '@/components/sellzy/resource-form';
import type { AdminCategory, AdminCategoryGroup } from '@/lib/admin-types';

/* Multipart builder — the panel carries a background image upload.
   No `instanceof File`: the File global doesn't exist in this Node runtime. */
export function groupPayload(formData: FormData): FormData | null {
  const title = String(formData.get('title') || '').trim();
  if (!title) return null;

  const fd = new FormData();
  fd.set('title', title);
  fd.set('subtitle', String(formData.get('subtitle') || '').trim());
  fd.set('overlay_color', hex(formData, 'overlay_color'));
  fd.set('text_color', hex(formData, 'text_color'));
  fd.set('sort_order', String(Number(formData.get('sort_order') || 0)));
  fd.set('status', String(formData.get('status')) === 'draft' ? 'draft' : 'published');

  /* Repeated keys, which DRF reads as a list. The blank the checkbox list
     always submits is kept: it is what tells the server "none selected"
     rather than "field omitted, leave the categories alone". */
  const ids = formData
    .getAll('category_ids')
    .map((v) => Number(String(v).trim()))
    .filter((v) => Number.isFinite(v) && v > 0);
  if (ids.length === 0) fd.append('category_ids', '');
  for (const id of ids) fd.append('category_ids', String(id));

  const image = formData.get('background_image');
  if (image && typeof image !== 'string' && image.size > 0) fd.set('background_image', image);
  return fd;
}

/** Drops anything that isn't a hex colour, so a typo saves as blank
    (= keep the storefront default) rather than reaching its CSS. */
function hex(formData: FormData, name: string): string {
  const raw = String(formData.get(name) || '').trim().replace(/^#/, '');
  return /^[0-9a-fA-F]{6}$/.test(raw) ? `#${raw.toUpperCase()}` : '';
}

export function groupFields(categories: AdminCategory[], group?: AdminCategoryGroup): ResourceField[] {
  return [
    { kind: 'image', name: 'background_image', label: 'Background Image', currentUrl: group?.background_image_url },
    { kind: 'text', name: 'title', label: 'Title', defaultValue: group?.title, required: true, half: true },
    { kind: 'number', name: 'sort_order', label: 'Short Order', defaultValue: group?.sort_order ?? 0, half: true },
    { kind: 'text', name: 'subtitle', label: 'Subtitle', defaultValue: group?.subtitle, hint: 'Small line under the title. Optional.' },
    {
      kind: 'multiselect',
      name: 'category_ids',
      label: 'Categories',
      defaultValue: (group?.categories ?? []).map((c) => c.id),
      options: categories.map((c) => ({ value: c.id, label: c.name })),
      hint: 'Four per panel reads best. They appear in the order set on the Categories page.',
    },
    { kind: 'color', name: 'overlay_color', label: 'Overlay Colour', defaultValue: group?.overlay_color, placeholder: '#0B1A17', half: true, hint: 'Darkens the background so the cards stay readable.' },
    { kind: 'color', name: 'text_color', label: 'Text Colour', defaultValue: group?.text_color, placeholder: '#FFFFFF', half: true },
  ];
}

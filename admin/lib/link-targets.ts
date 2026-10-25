import { getCategories, getProducts } from '@/lib/admin-api';
import type { LinkCategory, LinkProduct } from '@/app/content/CtaLinkField';

/** Active categories for a link picker, each with the picture it could lend. */
export async function linkCategories(): Promise<LinkCategory[]> {
  const page = await getCategories({ page_size: 200 }).catch(() => null);
  return (page?.results ?? [])
    .filter((c) => c.is_active)
    .map((c) => ({ slug: c.slug, name: c.name, image: c.image_url || '' }));
}

/** Products for a link picker's "Hand-picked products" list. */
export async function linkProducts(): Promise<LinkProduct[]> {
  const page = await getProducts({ page_size: 200 }).catch(() => null);
  return (page?.results ?? []).map((p) => ({ id: p.id, name: p.name }));
}

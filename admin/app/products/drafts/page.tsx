import { getCategories, getProducts, getStoreSettings } from '@/lib/admin-api';
import ProductsClient from '../ProductsClient';

export const dynamic = 'force-dynamic';

// "Draft Products" — same product list, preset to the Draft status filter.
export default async function DraftProductsPage() {
  const [page, categories, settings] = await Promise.all([
    getProducts({ page_size: 200 }),
    getCategories({ page_size: 200 }),
    getStoreSettings().catch(() => null),
  ]);
  return (
    <ProductsClient
      initialProducts={page.results}
      categories={categories.results.map((c) => ({ id: c.id, name: c.name }))}
      initialStatus="draft"
      heading="Draft Products"
      currencyCode={settings?.currency_code || 'USD'}
      locale={settings?.locale || 'en-US'}
    />
  );
}

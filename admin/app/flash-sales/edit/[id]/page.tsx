import { revalidatePath } from 'next/cache';
import { notFound, redirect } from 'next/navigation';
import { getDeal, getProducts, updateDeal } from '@/lib/admin-api';
import { linkCategories } from '@/lib/link-targets';
import ResourceForm from '@/components/sellzy/resource-form';
import { DEAL_STATUS_PILL, dealFields, dealPayload } from '@/components/sellzy/deal-pages';

export const dynamic = 'force-dynamic';

export default async function EditFlashSalesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [deal, products, categories] = await Promise.all([
    getDeal(Number(id)).catch(() => null),
    getProducts({ page_size: 200 }).catch(() => null),
    linkCategories(),
  ]);
  if (!deal) notFound();

  async function updateAction(formData: FormData) {
    'use server';
    const payload = dealPayload('flash', formData);
    if (!payload) return { error: 'The title is required.' };
    try {
      await updateDeal(Number(id), payload);
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Could not save the deal.' };
    }
    revalidatePath('/flash-sales');
    redirect('/flash-sales');
  }

  return (
    <ResourceForm
      title="Edit Flash Sale"
      backHref="/flash-sales"
      status={{ ...DEAL_STATUS_PILL, defaultValue: deal.status }}
      fields={dealFields('flash', products?.results ?? [], deal, categories)}
      action={updateAction}
    />
  );
}

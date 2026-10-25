import { revalidatePath } from 'next/cache';
import { deleteDeal } from '@/lib/admin-api';
import DealListPage from '@/components/sellzy/deal-pages';

export const dynamic = 'force-dynamic';

async function deleteAction(formData: FormData): Promise<{ error?: string } | void> {
  'use server';
  const id = Number(formData.get('id'));
  if (!id) return;
  try {
    await deleteDeal(id);
  } catch (err) {
    const message = err instanceof Error ? err.message : '';
    return { error: message.split(' — ')[1] || 'The deal could not be deleted.' };
  }
  revalidatePath('/featured-deal');
}

export default function FeaturedDealPage() {
  return <DealListPage kind="featured" deleteAction={deleteAction} />;
}

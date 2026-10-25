import { revalidatePath } from 'next/cache';
import { deleteLegalPage } from '@/lib/admin-api';
import LegalListPage from '@/components/sellzy/legal-pages';

export const dynamic = 'force-dynamic';

async function deleteAction(formData: FormData): Promise<{ error?: string } | void> {
  'use server';
  const id = Number(formData.get('id'));
  if (!id) return;
  try {
    await deleteLegalPage(id);
  } catch (err) {
    const message = err instanceof Error ? err.message : '';
    return { error: message.split(' — ')[1] || 'The document could not be deleted.' };
  }
  revalidatePath('/terms-and-conditions');
}

export default function TermsPage() {
  return <LegalListPage kind="terms" deleteAction={deleteAction} />;
}

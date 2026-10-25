import { revalidatePath } from 'next/cache';
import { notFound, redirect } from 'next/navigation';
import { getLegalPage, updateLegalPage } from '@/lib/admin-api';
import ResourceForm from '@/components/sellzy/resource-form';
import { legalFields, legalPayload } from '@/components/sellzy/legal-pages';

export const dynamic = 'force-dynamic';

export default async function EditTermsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const doc = await getLegalPage(Number(id)).catch(() => null);
  if (!doc) notFound();

  async function updateAction(formData: FormData) {
    'use server';
    const payload = legalPayload('terms', formData);
    if (!payload) return { error: 'The title is required.' };
    try {
      await updateLegalPage(Number(id), payload);
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Could not save the document.' };
    }
    revalidatePath('/terms-and-conditions');
    redirect('/terms-and-conditions');
  }

  return (
    <ResourceForm
      title="Edit Terms"
      backHref="/terms-and-conditions"
      status={{ name: 'status', defaultValue: doc.status, publishedValue: 'published', draftValue: 'draft' }}
      fields={legalFields(doc)}
      action={updateAction}
    />
  );
}

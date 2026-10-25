import { revalidatePath } from 'next/cache';
import { notFound, redirect } from 'next/navigation';
import { getLegalPage, updateLegalPage } from '@/lib/admin-api';
import ResourceForm from '@/components/sellzy/resource-form';
import { legalFields, legalPayload } from '@/components/sellzy/legal-pages';

export const dynamic = 'force-dynamic';

export default async function EditPrivacyPolicyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const doc = await getLegalPage(Number(id)).catch(() => null);
  if (!doc) notFound();

  async function updateAction(formData: FormData) {
    'use server';
    const payload = legalPayload('privacy', formData);
    if (!payload) return { error: 'The title is required.' };
    try {
      await updateLegalPage(Number(id), payload);
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Could not save the document.' };
    }
    revalidatePath('/privacy-and-policy');
    redirect('/privacy-and-policy');
  }

  return (
    <ResourceForm
      title="Edit Policy"
      backHref="/privacy-and-policy"
      status={{ name: 'status', defaultValue: doc.status, publishedValue: 'published', draftValue: 'draft' }}
      fields={legalFields(doc)}
      action={updateAction}
    />
  );
}

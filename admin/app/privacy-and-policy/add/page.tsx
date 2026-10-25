import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createLegalPage } from '@/lib/admin-api';
import ResourceForm from '@/components/sellzy/resource-form';
import { legalFields, legalPayload } from '@/components/sellzy/legal-pages';

export const dynamic = 'force-dynamic';

async function createAction(formData: FormData) {
  'use server';
  const payload = legalPayload('privacy', formData);
  if (!payload) return { error: 'The title is required.' };
  try {
    await createLegalPage(payload);
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Could not save the document.' };
  }
  revalidatePath('/privacy-and-policy');
  redirect('/privacy-and-policy');
}

export default function AddPrivacyPolicyPage() {
  return (
    <ResourceForm
      title="Create New Policy"
      backHref="/privacy-and-policy"
      submitLabel="Create"
      status={{ name: 'status', defaultValue: 'published', publishedValue: 'published', draftValue: 'draft' }}
      fields={legalFields()}
      action={createAction}
    />
  );
}

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createFaq } from '@/lib/admin-api';
import ResourceForm from '@/components/sellzy/resource-form';
import { faqPayload } from '../faq-payload';

export const dynamic = 'force-dynamic';

async function createAction(formData: FormData) {
  'use server';
  const payload = faqPayload(formData);
  if (!payload) return { error: 'The question is required.' };
  try {
    await createFaq(payload);
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Could not save the FAQ.' };
  }
  revalidatePath('/faq');
  redirect('/faq');
}

export default function AddFaqPage() {
  return (
    <ResourceForm
      title="Create New FAQ"
      backHref="/faq"
      submitLabel="Create FAQ"
      status={{ name: 'status', defaultValue: 'published', publishedValue: 'published', draftValue: 'draft' }}
      fields={[
        { kind: 'text', name: 'question', label: 'FAQ Question', required: true },
        { kind: 'number', name: 'sort_order', label: 'Short Order', defaultValue: 0, half: true },
        { kind: 'textarea', name: 'answer', label: 'Short Description', rows: 5 },
      ]}
      action={createAction}
    />
  );
}

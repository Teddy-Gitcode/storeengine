import { revalidatePath } from 'next/cache';
import { notFound, redirect } from 'next/navigation';
import { getFaq, updateFaq } from '@/lib/admin-api';
import ResourceForm from '@/components/sellzy/resource-form';
import { faqPayload } from '../../faq-payload';

export const dynamic = 'force-dynamic';

export default async function EditFaqPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const faq = await getFaq(Number(id)).catch(() => null);
  if (!faq) notFound();

  async function updateAction(formData: FormData) {
    'use server';
    const payload = faqPayload(formData);
    if (!payload) return { error: 'The question is required.' };
    try {
      await updateFaq(Number(id), payload);
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Could not save the FAQ.' };
    }
    revalidatePath('/faq');
    redirect('/faq');
  }

  return (
    <ResourceForm
      title="Edit FAQ"
      backHref="/faq"
      status={{ name: 'status', defaultValue: faq.status, publishedValue: 'published', draftValue: 'draft' }}
      fields={[
        { kind: 'text', name: 'question', label: 'FAQ Question', defaultValue: faq.question, required: true },
        { kind: 'number', name: 'sort_order', label: 'Short Order', defaultValue: faq.sort_order, half: true },
        { kind: 'textarea', name: 'answer', label: 'Short Description', defaultValue: faq.answer, rows: 5 },
      ]}
      action={updateAction}
    />
  );
}

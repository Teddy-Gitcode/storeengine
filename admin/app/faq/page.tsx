import { revalidatePath } from 'next/cache';
import { getFaqs, deleteFaq } from '@/lib/admin-api';
import ResourceList from '@/components/sellzy/resource-list';
import { StatusPill } from '@/components/sellzy/product-ui';

export const dynamic = 'force-dynamic';

async function deleteAction(formData: FormData): Promise<{ error?: string } | void> {
  'use server';
  const id = Number(formData.get('id'));
  if (!id) return;
  try {
    await deleteFaq(id);
  } catch (err) {
    const message = err instanceof Error ? err.message : '';
    return { error: message.split(' — ')[1] || 'The FAQ could not be deleted.' };
  }
  revalidatePath('/faq');
}

export default async function FaqPage() {
  const page = await getFaqs().catch(() => null);
  const faqs = page?.results ?? [];

  return (
    <ResourceList
      title="FAQ"
      createHref="/faq/add"
      createLabel="Create FAQ"
      columns={[
        { key: 'id', label: 'ID' },
        { key: 'question', label: 'FAQ Question' },
        { key: 'answer', label: 'FAQ Answer' },
        { key: 'status', label: 'Status' },
      ]}
      statusFilter={{ label: 'All status', options: [
        { value: 'published', label: 'Published' },
        { value: 'draft', label: 'Draft' },
      ] }}
      rows={faqs.map((f) => ({
        id: f.id,
        search: `${f.question} ${f.answer}`,
        status: f.status,
        cells: {
          id: <span className="whitespace-nowrap">#{f.id}</span>,
          question: <span className="font-semibold text-light-primary-text">{f.question}</span>,
          answer: <span className="line-clamp-2 max-w-md">{f.answer || '—'}</span>,
          status: <StatusPill label={f.status_label} tone={f.status === 'published' ? 'success' : 'neutral'} />,
        },
      }))}
      editHrefBase="/faq/edit"
      deleteAction={deleteAction}
      emptyMessage="No FAQs yet — click “Create FAQ” to add one."
    />
  );
}

import { revalidatePath } from 'next/cache';
import { notFound, redirect } from 'next/navigation';
import { getPaymentMethod, updatePaymentMethod } from '@/lib/admin-api';
import ResourceForm from '@/components/sellzy/resource-form';
import { methodPayload, PROVIDERS } from '../../method-payload';

export const dynamic = 'force-dynamic';

export default async function EditPaymentMethodPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const method = await getPaymentMethod(Number(id)).catch(() => null);
  if (!method) notFound();

  async function updateAction(formData: FormData) {
    'use server';
    const payload = methodPayload(formData);
    if (!payload) return { error: 'The method name is required.' };
    try {
      await updatePaymentMethod(Number(id), payload);
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Could not save the payment method.' };
    }
    revalidatePath('/payment-method');
    redirect('/payment-method');
  }

  return (
    <ResourceForm
      title="Edit Payment Method"
      backHref="/payment-method"
      status={{ name: 'is_active', defaultValue: method.is_active ? 'active' : 'inactive', publishedValue: 'active', draftValue: 'inactive' }}
      fields={[
        { kind: 'image', name: 'logo', label: 'Upload Logo', currentUrl: method.logo_url || undefined },
        { kind: 'text', name: 'name', label: 'Method Name', defaultValue: method.name, required: true, half: true },
        { kind: 'select', name: 'provider', label: 'Provider', defaultValue: method.provider, options: PROVIDERS, half: true },
        { kind: 'number', name: 'sort_order', label: 'Short Order', defaultValue: method.sort_order, half: true },
        { kind: 'textarea', name: 'body_text', label: 'Body Text', defaultValue: method.body_text, rows: 4 },
      ]}
      action={updateAction}
    />
  );
}

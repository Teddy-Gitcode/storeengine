import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createPaymentMethod } from '@/lib/admin-api';
import ResourceForm from '@/components/sellzy/resource-form';
import { methodPayload, PROVIDERS } from '../method-payload';

export const dynamic = 'force-dynamic';

async function createAction(formData: FormData) {
  'use server';
  const payload = methodPayload(formData);
  if (!payload) return { error: 'The method name is required.' };
  try {
    await createPaymentMethod(payload);
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Could not save the payment method.' };
  }
  revalidatePath('/payment-method');
  redirect('/payment-method');
}

export default function AddPaymentMethodPage() {
  return (
    <ResourceForm
      title="Add Payment Method"
      backHref="/payment-method"
      submitLabel="Save"
      status={{ name: 'is_active', defaultValue: 'active', publishedValue: 'active', draftValue: 'inactive' }}
      fields={[
        { kind: 'image', name: 'logo', label: 'Upload Logo' },
        { kind: 'text', name: 'name', label: 'Method Name', required: true, half: true },
        { kind: 'select', name: 'provider', label: 'Provider', options: PROVIDERS, half: true },
        { kind: 'number', name: 'sort_order', label: 'Short Order', defaultValue: 0, half: true },
        { kind: 'textarea', name: 'body_text', label: 'Body Text', rows: 4 },
      ]}
      action={createAction}
    />
  );
}

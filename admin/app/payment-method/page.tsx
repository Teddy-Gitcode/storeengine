import { revalidatePath } from 'next/cache';
import { getPaymentMethods, deletePaymentMethod } from '@/lib/admin-api';
import ResourceList from '@/components/sellzy/resource-list';
import { StatusPill } from '@/components/sellzy/product-ui';
import { paymentMarkFor } from '@/lib/payment-logos';

export const dynamic = 'force-dynamic';

async function deleteAction(formData: FormData): Promise<{ error?: string } | void> {
  'use server';
  const id = Number(formData.get('id'));
  if (!id) return;
  try {
    await deletePaymentMethod(id);
  } catch (err) {
    const message = err instanceof Error ? err.message : '';
    return { error: message.split(' — ')[1] || 'The payment method could not be deleted.' };
  }
  revalidatePath('/payment-method');
}

export default async function PaymentMethodPage() {
  const page = await getPaymentMethods().catch(() => null);
  const methods = page?.results ?? [];

  return (
    <ResourceList
      title="Payment Method"
      createHref="/payment-method/add"
      createLabel="Add Payment Method"
      columns={[
        { key: 'logo', label: 'Logo' },
        { key: 'name', label: 'Method Name' },
        { key: 'body', label: 'Body Text' },
        { key: 'status', label: 'Status' },
      ]}
      statusFilter={{ label: 'All status', options: [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' },
      ] }}
      rows={methods.map((m) => {
        // An uploaded logo wins; otherwise fall back to the bundled brand mark.
        const logo = m.logo_url || paymentMarkFor(m.name, m.provider);
        return {
        id: m.id,
        search: `${m.name} ${m.body_text} ${m.provider_label}`,
        status: m.is_active ? 'active' : 'inactive',
        cells: {
          logo: (
            <div className="flex size-10 items-center justify-center overflow-hidden rounded-lg bg-[#F2F4F7]">
              {logo
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={logo} alt={m.name} className="h-full w-full object-contain p-1" />
                : <span className="text-xs text-gray-500">{m.name.charAt(0).toUpperCase()}</span>}
            </div>
          ),
          name: <span className="font-semibold text-light-primary-text">{m.name}</span>,
          body: <span className="line-clamp-2 max-w-md">{m.body_text || '—'}</span>,
          status: <StatusPill label={m.is_active ? 'Active' : 'Inactive'} tone={m.is_active ? 'success' : 'neutral'} />,
        },
      };
      })}
      editHrefBase="/payment-method/edit"
      deleteAction={deleteAction}
      emptyMessage="No payment methods yet — click “Add Payment Method” to create one."
    />
  );
}

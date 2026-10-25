import { notFound, redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getCustomer, updateCustomer } from '@/lib/admin-api';
import ResourceForm from '@/components/sellzy/resource-form';
import { customerFormData, OPT_IN_OPTIONS } from '../../customer-payload';

export const dynamic = 'force-dynamic';

async function saveAction(formData: FormData) {
  'use server';
  const id = Number(formData.get('id'));
  const payload = customerFormData(formData);
  if (!id || !payload) return { error: 'A name and an email address are required.' };
  try {
    await updateCustomer(id, payload);
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Could not save the customer.' };
  }
  revalidatePath('/customers');
  revalidatePath(`/customers/${id}`);
  redirect(`/customers/${id}`);
}

export default async function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const customer = await getCustomer(Number(id));
  if (!customer) notFound();

  const fullName = `${customer.user.first_name} ${customer.user.last_name}`.trim() || customer.user.username;

  return (
    <ResourceForm
      title="Edit Customer"
      backHref={`/customers/${customer.id}`}
      submitLabel="Save Customer"
      status={{
        name: 'is_active',
        defaultValue: customer.user.is_active ? 'active' : 'inactive',
        publishedValue: 'active',
        draftValue: 'inactive',
        publishedLabel: 'Active',
        draftLabel: 'Inactive',
      }}
      fields={[
        { kind: 'hidden', name: 'id', value: customer.id },
        { kind: 'image', name: 'avatar', label: 'Profile Picture', currentUrl: customer.avatar_url || undefined },
        { kind: 'text', name: 'name', label: 'Full Name', defaultValue: fullName, required: true, half: true },
        { kind: 'text', name: 'email', label: 'Email', defaultValue: customer.user.email, required: true, half: true },
        { kind: 'text', name: 'phone', label: 'Phone Number', defaultValue: customer.phone, half: true },
        {
          kind: 'select',
          name: 'marketing_opt_in',
          label: 'Marketing',
          defaultValue: customer.marketing_opt_in ? 'yes' : 'no',
          options: OPT_IN_OPTIONS,
        },
      ]}
      action={saveAction}
    />
  );
}

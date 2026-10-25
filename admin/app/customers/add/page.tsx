import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createCustomer, updateCustomer } from '@/lib/admin-api';
import ResourceForm from '@/components/sellzy/resource-form';
import { customerAvatar, customerPayload, OPT_IN_OPTIONS } from '../customer-payload';

export const dynamic = 'force-dynamic';

async function createAction(formData: FormData) {
  'use server';
  const payload = customerPayload(formData);
  if (!payload) return { error: 'A name and an email address are required.' };

  const password = String(formData.get('password') || '').trim();
  let created;
  try {
    // Create takes name/email/phone/password; the rest is a follow-up PATCH.
    created = await createCustomer({
      name: payload.name,
      email: payload.email,
      phone: payload.phone,
      ...(password ? { password } : {}),
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Could not create the customer.' };
  }

  // Create only takes the four scalar fields, so anything else — the flags and
  // the avatar — follows as a PATCH. Multipart once there's a file to carry.
  const avatar = customerAvatar(formData);
  if (payload.marketing_opt_in || !payload.is_active || avatar) {
    try {
      if (avatar) {
        const fd = new FormData();
        fd.set('marketing_opt_in', String(payload.marketing_opt_in));
        fd.set('is_active', String(payload.is_active));
        fd.set('avatar', avatar);
        await updateCustomer(created.id, fd);
      } else {
        await updateCustomer(created.id, {
          marketing_opt_in: payload.marketing_opt_in,
          is_active: payload.is_active,
        });
      }
    } catch {
      /* The account exists; these can be set again from the edit page. */
    }
  }

  revalidatePath('/customers');
  redirect(`/customers/${created.id}`);
}

export default function AddCustomerPage() {
  return (
    <ResourceForm
      title="Create New Customer"
      backHref="/customers"
      submitLabel="Create Customer"
      status={{
        name: 'is_active',
        defaultValue: 'active',
        publishedValue: 'active',
        draftValue: 'inactive',
        publishedLabel: 'Active',
        draftLabel: 'Inactive',
      }}
      fields={[
        { kind: 'image', name: 'avatar', label: 'Profile Picture' },
        { kind: 'text', name: 'name', label: 'Full Name', required: true, half: true },
        { kind: 'text', name: 'email', label: 'Email', required: true, half: true },
        { kind: 'text', name: 'phone', label: 'Phone Number', half: true },
        { kind: 'select', name: 'marketing_opt_in', label: 'Marketing', options: OPT_IN_OPTIONS, half: true },
        { kind: 'text', name: 'password', label: 'Password (optional — they can reset it later)' },
      ]}
      action={createAction}
    />
  );
}

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createStaffUser, getStaffRoles } from '@/lib/admin-api';
import StaffUserForm from '@/components/staff/StaffUserForm';
import { staffActionError, staffPayload } from '@/components/sellzy/staff-pages';

export const dynamic = 'force-dynamic';

async function createAction(formData: FormData) {
  'use server';
  const payload = staffPayload('users', formData);
  if (!payload) return { fields: { email: 'An email address is required.' } };
  try {
    await createStaffUser(payload);
  } catch (err) {
    return staffActionError(err, 'Could not create the account.');
  }
  revalidatePath('/users');
  redirect('/users');
}

export default async function AddUsersPage() {
  const roles = await getStaffRoles().catch(() => []);

  return <StaffUserForm title="Create User" backHref="/users" scope="users" roles={roles} action={createAction} />;
}

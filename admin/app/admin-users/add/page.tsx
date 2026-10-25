import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createStaffUser } from '@/lib/admin-api';
import StaffUserForm from '@/components/staff/StaffUserForm';
import { staffActionError, staffPayload } from '@/components/sellzy/staff-pages';

export const dynamic = 'force-dynamic';

async function createAction(formData: FormData) {
  'use server';
  const payload = staffPayload('admin-users', formData);
  if (!payload) return { fields: { email: 'An email address is required.' } };
  try {
    await createStaffUser(payload);
  } catch (err) {
    return staffActionError(err, 'Could not create the admin account.');
  }
  revalidatePath('/admin-users');
  redirect('/admin-users');
}

export default function AddAdminUsersPage() {
  // Admins are superusers, which roles don't limit — the form says so instead
  // of offering roles.
  return <StaffUserForm title="Create Admin" backHref="/admin-users" scope="admin-users" roles={[]} action={createAction} />;
}

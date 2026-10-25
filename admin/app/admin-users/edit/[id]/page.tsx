import { revalidatePath } from 'next/cache';
import { notFound, redirect } from 'next/navigation';
import { getStaffUser, updateStaffUser } from '@/lib/admin-api';
import StaffUserForm from '@/components/staff/StaffUserForm';
import { staffActionError, staffPayload } from '@/components/sellzy/staff-pages';

export const dynamic = 'force-dynamic';

export default async function EditAdminUsersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getStaffUser(Number(id)).catch(() => null);
  if (!user) notFound();

  async function updateAction(formData: FormData) {
    'use server';
    const payload = staffPayload('admin-users', formData);
    if (!payload) return { fields: { email: 'An email address is required.' } };
    try {
      await updateStaffUser(Number(id), payload);
    } catch (err) {
      return staffActionError(err, 'Could not save the admin account.');
    }
    revalidatePath('/admin-users');
    redirect('/admin-users');
  }

  return (
    <StaffUserForm title="Edit Admin" backHref="/admin-users" scope="admin-users" roles={[]} user={user} action={updateAction} />
  );
}

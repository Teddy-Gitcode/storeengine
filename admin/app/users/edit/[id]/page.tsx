import { revalidatePath } from 'next/cache';
import { notFound, redirect } from 'next/navigation';
import { getStaffRoles, getStaffUser, updateStaffUser } from '@/lib/admin-api';
import StaffUserForm from '@/components/staff/StaffUserForm';
import { staffActionError, staffPayload } from '@/components/sellzy/staff-pages';

export const dynamic = 'force-dynamic';

export default async function EditUsersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [user, roles] = await Promise.all([
    getStaffUser(Number(id)).catch(() => null),
    getStaffRoles().catch(() => []),
  ]);
  if (!user) notFound();

  async function updateAction(formData: FormData) {
    'use server';
    const payload = staffPayload('users', formData);
    if (!payload) return { fields: { email: 'An email address is required.' } };
    try {
      await updateStaffUser(Number(id), payload);
    } catch (err) {
      return staffActionError(err, 'Could not save the account.');
    }
    revalidatePath('/users');
    redirect('/users');
  }

  return (
    <StaffUserForm title="Edit User" backHref="/users" scope="users" roles={roles} user={user} action={updateAction} />
  );
}

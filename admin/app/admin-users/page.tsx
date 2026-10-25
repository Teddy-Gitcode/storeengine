import { revalidatePath } from 'next/cache';
import { deleteStaffUser } from '@/lib/admin-api';
import StaffListPage from '@/components/sellzy/staff-pages';

export const dynamic = 'force-dynamic';

async function deleteAction(formData: FormData): Promise<{ error?: string } | void> {
  'use server';
  const id = Number(formData.get('id'));
  if (!id) return;
  try {
    await deleteStaffUser(id);
  } catch (err) {
    const message = err instanceof Error ? err.message : '';
    return { error: message.split(' — ')[1] || 'The account could not be deleted.' };
  }
  revalidatePath('/admin-users');
}

export default function AdminUsersPage() {
  return <StaffListPage scope="admin-users" deleteAction={deleteAction} />;
}

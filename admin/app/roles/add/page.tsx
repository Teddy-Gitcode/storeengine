import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createStaffRole, getStaffRoles, type StaffRolePayload } from '@/lib/admin-api';
import RoleForm from '@/components/staff/RoleForm';
import { roleActionError } from '@/components/sellzy/staff-pages';

export const dynamic = 'force-dynamic';

async function createAction(payload: StaffRolePayload) {
  'use server';
  try {
    await createStaffRole(payload);
  } catch (err) {
    return { error: roleActionError(err, 'Could not save the role.') };
  }
  revalidatePath('/roles');
  redirect('/roles');
}

export default async function AddRolePage() {
  // Existing roles — the store's defaults included — to copy access from.
  const templates = await getStaffRoles().catch(() => []);

  return <RoleForm title="Create Role" backHref="/roles" templates={templates} action={createAction} />;
}

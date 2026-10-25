import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getStaffRoles, updateStaffRole, type StaffRolePayload } from '@/lib/admin-api';
import RoleForm from '@/components/staff/RoleForm';
import { roleActionError } from '@/components/sellzy/staff-pages';

export const dynamic = 'force-dynamic';

export default async function EditRolePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const roleId = Number(id);
  // There is no retrieve endpoint for a single group; the list is small.
  const roles = await getStaffRoles();
  const role = roles.find((r) => r.id === roleId);
  if (!role) redirect('/roles');

  async function saveAction(payload: StaffRolePayload) {
    'use server';
    try {
      await updateStaffRole(roleId, payload);
    } catch (err) {
      return { error: roleActionError(err, 'Could not save the role.') };
    }
    revalidatePath('/roles');
    redirect('/roles');
  }

  return (
    <RoleForm
      title={`Edit Role: ${role.name}`}
      backHref="/roles"
      initialName={role.name}
      initialAccess={role.access}
      templates={roles.filter((r) => r.id !== roleId)}
      action={saveAction}
    />
  );
}

import { revalidatePath } from 'next/cache';
import { deleteStaffRole, getStaffRoles } from '@/lib/admin-api';
import { accessSummary } from '@/lib/admin-access';
import ResourceList from '@/components/sellzy/resource-list';
import { roleActionError } from '@/components/sellzy/staff-pages';

export const dynamic = 'force-dynamic';

async function deleteAction(formData: FormData): Promise<{ error?: string } | void> {
  'use server';
  const id = Number(formData.get('id'));
  if (!id) return;
  try {
    await deleteStaffRole(id);
  } catch (err) {
    return { error: roleActionError(err, 'The role could not be deleted.') };
  }
  revalidatePath('/roles');
}

export default async function RolesPage() {
  // Deliberately not caught: the staff pages swallow this and render an empty
  // list, which is indistinguishable from "no roles exist" — the confusion that
  // hid this whole feature being missing.
  const roles = await getStaffRoles();

  return (
    <ResourceList
      title="Roles"
      createHref="/roles/add"
      createLabel="Create Role"
      columns={[
        { key: 'name', label: 'Role' },
        { key: 'access', label: 'What it can do' },
        { key: 'user_count', label: 'Users' },
      ]}
      rows={roles.map((r) => ({
        id: r.id,
        search: `${r.name} ${accessSummary(r.access)}`,
        cells: {
          name: <span className="whitespace-nowrap font-medium text-gray-900">{r.name}</span>,
          access: <span className="block max-w-xl text-sm leading-relaxed text-light-secondary-text">{accessSummary(r.access)}</span>,
          user_count: (
            <span className="whitespace-nowrap">
              {r.user_count ?? 0} {(r.user_count ?? 0) === 1 ? 'user' : 'users'}
            </span>
          ),
        },
      }))}
      editHrefBase="/roles/edit"
      deleteAction={deleteAction}
      emptyMessage="No roles yet. Create one, then assign it on a user's page."
    />
  );
}

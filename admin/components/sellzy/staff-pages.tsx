import { AdminApiError, getStaffUsers } from '@/lib/admin-api';

const PROFILE_FIELDS = new Set(['password', 'name', 'phone', 'avatar', 'short_description']);

/** Turns a refused staff save into messages the form can place under each
 *  field. The email is the username, so a clash on either lands on Email. */
export function staffActionError(err: unknown, fallback: string): { error?: string; fields?: Record<string, string> } {
  if (!(err instanceof AdminApiError)) return { error: fallback };
  if (err.status === 403) return { error: 'Your role doesn’t allow managing staff accounts.' };
  const fields: Record<string, string> = {};
  const general: string[] = [];
  for (const [key, message] of Object.entries(err.fields)) {
    if (key === 'username' || key === 'email') fields.email = message;
    else if (key === 'role_ids' || key === 'role_ids_csv' || key === 'groups') fields.roles = message;
    else if (PROFILE_FIELDS.has(key)) fields[key] = message;
    else general.push(message);
  }
  const error = general.join(' ') || (Object.keys(fields).length ? 'Check the highlighted fields.' : fallback);
  return { error, fields };
}

/** The same for roles, which only ever fail as a whole. */
export function roleActionError(err: unknown, fallback: string): string {
  if (!(err instanceof AdminApiError)) return fallback;
  if (err.status === 403) return 'Your role doesn’t allow managing roles.';
  return Object.values(err.fields).join(' ') || fallback;
}
import ResourceList from '@/components/sellzy/resource-list';
import { StatusPill } from '@/components/sellzy/product-ui';

/* The template has two staff screens: /users (team members) and /admin-users
   (elevated admins). They differ only by the superuser flag. */

export type StaffScope = 'users' | 'admin-users';

export const STAFF_META: Record<StaffScope, { route: string; title: string; create: string }> = {
  'users': { route: '/users', title: 'Users', create: 'Create User' },
  'admin-users': { route: '/admin-users', title: 'Admin', create: 'Create Admin' },
};

export function staffPayload(scope: StaffScope, formData: FormData): FormData | null {
  const email = String(formData.get('email') || '').trim().toLowerCase();
  if (!email) return null;
  const fd = new FormData();
  fd.set('username', email);
  fd.set('email', email);
  fd.set('name', String(formData.get('name') || '').trim());
  fd.set('short_description', String(formData.get('short_description') || '').trim());
  fd.set('phone', String(formData.get('phone') || '').trim());
  fd.set('is_active', String(formData.get('is_active')) === 'inactive' ? 'false' : 'true');
  fd.set('is_superuser', scope === 'admin-users' ? 'true' : 'false');
  const password = String(formData.get('password') || '');
  if (password) fd.set('password', password);
  // Sent even when empty: that is how unticking every role removes them.
  if (formData.has('role_ids_csv')) fd.set('role_ids_csv', String(formData.get('role_ids_csv') || ''));
  const avatar = formData.get('avatar');
  if (avatar && typeof avatar !== 'string' && avatar.size > 0) fd.set('avatar', avatar);
  return fd;
}

export default async function StaffListPage({
  scope,
  deleteAction,
}: {
  scope: StaffScope;
  deleteAction: (formData: FormData) => Promise<{ error?: string } | void>;
}) {
  const meta = STAFF_META[scope];
  const page = await getStaffUsers().catch(() => null);
  // One endpoint serves both screens; split them on the superuser flag.
  const users = (page?.results ?? []).filter((u) =>
    scope === 'admin-users' ? u.is_superuser : !u.is_superuser,
  );

  return (
    <ResourceList
      title={meta.title}
      createHref={`${meta.route}/add`}
      createLabel={meta.create}
      columns={[
        { key: 'id', label: 'ID' },
        { key: 'user', label: 'User' },
        { key: 'email', label: 'Email' },
        { key: 'roles', label: 'Roles' },
        { key: 'date', label: 'Date' },
        { key: 'status', label: 'Active status' },
      ]}
      statusFilter={{ label: 'All status', options: [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' },
      ] }}
      rows={users.map((u) => ({
        id: u.id,
        search: `${u.username} ${u.email} ${u.full_name} ${u.roles.map((r) => r.name).join(' ')}`,
        status: u.is_active ? 'active' : 'inactive',
        cells: {
          id: <span className="whitespace-nowrap">#{u.id}</span>,
          user: (
            <span className="inline-flex items-center gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#F2F4F7]">
                {u.avatar_url
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={u.avatar_url} alt={u.full_name || u.username} className="h-full w-full object-cover" />
                  : <span className="text-xs font-semibold text-gray-500">{(u.full_name || u.username).charAt(0).toUpperCase()}</span>}
              </span>
              <span className="font-semibold text-light-primary-text">{u.full_name || u.username}</span>
            </span>
          ),
          email: u.email || '—',
          roles: u.roles.length
            ? <span className="flex flex-wrap gap-1">{u.roles.map((r) => (
                <span key={r.id} className="rounded-full bg-primary-lighter px-2 py-0.5 text-xs font-semibold text-primary-dark font-public-sans">{r.name}</span>
              ))}</span>
            : '—',
          date: <span className="whitespace-nowrap">{new Date(u.date_joined).toLocaleDateString()}</span>,
          status: <StatusPill label={u.is_active ? 'Active' : 'Inactive'} tone={u.is_active ? 'success' : 'neutral'} />,
        },
      }))}
      editHrefBase={`${meta.route}/edit`}
      deleteAction={deleteAction}
      emptyMessage={`No ${meta.title.toLowerCase()} yet — click “${meta.create}” to add one.`}
    />
  );
}

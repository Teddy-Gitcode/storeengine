'use client';

import { useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import { ArrowLeft, Check, Eye, EyeOff, ImagePlus, Info, ShieldCheck, Wand2 } from 'lucide-react';
import { FloatingInput, FloatingTextarea, PillButton } from '@/components/sellzy/product-ui';
import { accessSummary } from '@/lib/admin-access';
import type { AdminStaffRole, AdminStaffUser } from '@/lib/admin-types';

export type StaffFormResult = { error?: string; fields?: Record<string, string> } | void;

const MAX_AVATAR_BYTES = 3.1 * 1024 * 1024;

/* 16 characters from an alphabet without look-alikes (0/O, 1/l/I), so it can be
   read out to a new colleague once and typed correctly. */
function generatePassword(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%*?';
  const bytes = new Uint32Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
}

function isRedirect(err: unknown): boolean {
  const digest = (err as { digest?: unknown } | null)?.digest;
  return typeof digest === 'string' && digest.startsWith('NEXT_REDIRECT');
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1.5 px-1 text-xs text-error font-public-sans">{message}</p>;
}

/* Create or edit a staff account — the Users and Admin pages both use it.
 *
 * It replaced a generic resource form that could only pick one role, sent a new
 * colleague off with no password (so they could never sign in — staff can't
 * use "forgot password"), and printed the backend's refusal as one run-on line
 * such as "password: This password is too common." Now: several roles, each
 * showing what it grants; a password that is required on create with a
 * generator beside it; and each error under the field it is about. */
export default function StaffUserForm({
  title,
  backHref,
  scope,
  roles,
  user,
  action,
}: {
  title: string;
  backHref: string;
  scope: 'users' | 'admin-users';
  roles: AdminStaffRole[];
  user?: AdminStaffUser;
  action: (formData: FormData) => Promise<StaffFormResult>;
}) {
  const isAdmin = scope === 'admin-users';
  const editing = Boolean(user);
  const fileRef = useRef<HTMLInputElement>(null);

  const [roleIds, setRoleIds] = useState<number[]>(user?.roles.map((r) => r.id) ?? []);
  const [active, setActive] = useState(user ? user.is_active : true);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [preview, setPreview] = useState<string | null>(user?.avatar_url || null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function pickAvatar(file: File | undefined) {
    setFields(({ avatar: _drop, ...rest }) => rest);
    if (!file) return;
    if (file.size > MAX_AVATAR_BYTES) {
      setFields((f) => ({ ...f, avatar: 'That image is larger than 3.1 MB.' }));
      if (fileRef.current) fileRef.current.value = '';
      return;
    }
    setPreview(URL.createObjectURL(file));
  }

  function toggleRole(id: number) {
    setRoleIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  }

  function submit(formData: FormData) {
    setError(null);
    setFields({});
    if (!editing && !password) {
      setFields({ password: 'Set a password so they can sign in — Generate makes a strong one.' });
      return;
    }
    startTransition(async () => {
      try {
        const result = await action(formData);
        if (result) {
          setError(result.error ?? null);
          setFields(result.fields ?? {});
        }
      } catch (err) {
        if (isRedirect(err)) throw err;
        setError('The admin could not reach the server. Check your connection and try again.');
      }
    });
  }

  const chosenRoles = roles.filter((r) => roleIds.includes(r.id));

  return (
    <form action={submit} className="w-full rounded-2xl bg-surface p-4 sm:p-6">
      <input type="hidden" name="role_ids_csv" value={roleIds.join(',')} />
      <input type="hidden" name="is_active" value={active ? 'active' : 'inactive'} />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link
            href={backHref}
            className="flex size-8 items-center justify-center rounded-full text-light-primary-text transition-colors hover:bg-gray-200"
            aria-label="Back to list"
          >
            <ArrowLeft size={20} />
          </Link>
          <h2 className="text-lg font-bold text-light-primary-text font-public-sans sm:text-xl">{title}</h2>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2.5 text-sm font-semibold text-light-primary-text font-public-sans">
          <span>{active ? 'Active' : 'Inactive'}</span>
          <input type="checkbox" className="peer sr-only" checked={active} onChange={(e) => setActive(e.target.checked)} />
          <span
            aria-hidden
            className={clsx(
              'relative h-6 w-11 rounded-full transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-primary',
              active ? 'bg-primary' : 'bg-gray-500/30',
            )}
          >
            <span className={clsx('absolute top-0.5 size-5 rounded-full bg-white shadow transition-all', active ? 'left-[22px]' : 'left-0.5')} />
          </span>
        </label>
      </div>

      {/* ── Profile ─────────────────────────────────────────── */}
      <section className="mb-4 rounded-2xl border border-gray-500/20 p-4 sm:mb-6 sm:p-6">
        <h3 className="mb-5 text-lg font-bold text-gray-900 font-public-sans">Profile</h3>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-[140px_minmax(0,1fr)]">
          <div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="group relative flex size-[120px] items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-gray-500/30 bg-gray-500/5 hover:border-primary"
              aria-label="Choose a profile photo"
            >
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="" className="h-full w-full object-cover" />
              ) : (
                <ImagePlus size={26} className="text-light-secondary-text group-hover:text-primary" />
              )}
            </button>
            <input
              ref={fileRef}
              type="file"
              name="avatar"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              onChange={(e) => pickAvatar(e.target.files?.[0])}
            />
            <p className="mt-2 text-xs text-light-secondary-text font-public-sans">Photo, up to 3.1 MB</p>
            <FieldError message={fields.avatar} />
          </div>

          <div className="space-y-4 sm:space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
              <div>
                <FloatingInput label="Full name" name="name" defaultValue={user?.full_name} />
                <FieldError message={fields.name} />
              </div>
              <div>
                <FloatingInput label="Email" name="email" type="email" defaultValue={user?.email} required />
                <FieldError message={fields.email} />
              </div>
              <div>
                <FloatingInput label="Phone" name="phone" type="tel" defaultValue={user?.phone} />
                <FieldError message={fields.phone} />
              </div>
            </div>
            <FloatingTextarea label="Job title or note" name="short_description" defaultValue={user?.short_description} rows={3} />
          </div>
        </div>
      </section>

      {/* ── Sign-in ─────────────────────────────────────────── */}
      <section className="mb-4 rounded-2xl border border-gray-500/20 p-4 sm:mb-6 sm:p-6">
        <h3 className="text-lg font-bold text-gray-900 font-public-sans">Sign-in</h3>
        <p className="mb-5 mt-1 text-sm text-light-secondary-text font-public-sans">
          They sign in to the admin with their email and this password.
          {editing ? ' Leave it blank to keep the current one.' : ''}
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <div className="relative min-w-0 flex-1">
            <FloatingInput
              label={editing ? 'New password' : 'Password'}
              name="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={setPassword}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-[14px] text-light-secondary-text hover:text-primary"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
            <FieldError message={fields.password} />
          </div>
          <PillButton
            variant="secondary"
            onClick={() => {
              setPassword(generatePassword());
              setShowPassword(true);
            }}
            className="shrink-0"
          >
            <Wand2 size={15} className="mr-1.5 inline" aria-hidden /> Generate
          </PillButton>
        </div>
        <p className="mt-2 px-1 text-xs text-light-secondary-text font-public-sans">
          At least 8 characters, not all numbers, and not a common password.
        </p>
      </section>

      {/* ── Access ──────────────────────────────────────────── */}
      <section className="mb-4 rounded-2xl border border-gray-500/20 p-4 sm:mb-6 sm:p-6">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h3 className="text-lg font-bold text-gray-900 font-public-sans">Access</h3>
            <p className="mt-1 text-sm text-light-secondary-text font-public-sans">
              {isAdmin
                ? 'Admins can do everything, including managing other admins.'
                : 'Pick one or more roles. Their access adds up.'}
            </p>
          </div>
          {!isAdmin && (
            <Link href="/roles" className="text-sm font-semibold text-primary hover:underline font-public-sans">
              Manage roles
            </Link>
          )}
        </div>

        {isAdmin ? (
          <p className="flex items-start gap-2 rounded-xl bg-primary-lighter px-4 py-3 text-sm text-primary-dark font-public-sans">
            <ShieldCheck size={18} className="mt-0.5 shrink-0" aria-hidden />
            This account is a superuser. Roles don’t limit it, so there is nothing to choose here.
          </p>
        ) : roles.length === 0 ? (
          <p className="rounded-xl bg-gray-500/10 px-4 py-3 text-sm text-light-secondary-text font-public-sans">
            No roles exist yet. <Link href="/roles/add" className="font-semibold text-primary hover:underline">Create one</Link>, then come back.
          </p>
        ) : (
          <>
            <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {roles.map((role) => {
                const selected = roleIds.includes(role.id);
                return (
                  <li key={role.id}>
                    <label
                      className={clsx(
                        'flex h-full cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary',
                        selected ? 'border-primary bg-primary-lighter/60' : 'border-gray-500/20 hover:border-primary/60',
                      )}
                    >
                      <input type="checkbox" className="sr-only" checked={selected} onChange={() => toggleRole(role.id)} />
                      <span
                        aria-hidden
                        className={clsx(
                          'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border',
                          selected ? 'border-primary bg-primary text-white' : 'border-gray-500/40',
                        )}
                      >
                        {selected && <Check size={14} strokeWidth={3} />}
                      </span>
                      <span className="min-w-0">
                        <span className="block font-semibold text-light-primary-text font-public-sans">{role.name}</span>
                        <span className="mt-0.5 block text-xs leading-relaxed text-light-secondary-text font-public-sans">
                          {accessSummary(role.access)}
                        </span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
            <FieldError message={fields.roles} />
            {chosenRoles.length === 0 && (
              <p className="mt-3 flex items-start gap-2 text-sm text-light-secondary-text font-public-sans">
                <Info size={16} className="mt-0.5 shrink-0" aria-hidden />
                Without a role they can sign in and see the dashboard, but nothing else.
              </p>
            )}
          </>
        )}
      </section>

      {error && <p className="mb-4 rounded-xl bg-error/10 px-4 py-3 text-sm text-error font-public-sans">{error}</p>}

      <div className="flex justify-end gap-3">
        <PillButton href={backHref} variant="secondary">Cancel</PillButton>
        <PillButton type="submit" disabled={pending}>
          {pending ? 'Saving…' : editing ? 'Save changes' : 'Create account'}
        </PillButton>
      </div>
    </form>
  );
}

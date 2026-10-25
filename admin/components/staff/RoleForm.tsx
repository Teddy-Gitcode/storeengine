'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import { ArrowLeft } from 'lucide-react';
import { FloatingInput, FloatingSelect, PillButton } from '@/components/sellzy/product-ui';
import { AREAS, accessSummary, type Access, type AccessLevel, type AreaKey } from '@/lib/admin-access';
import type { AdminStaffRole } from '@/lib/admin-types';

type Choice = 'none' | AccessLevel;

const CHOICES: { value: Choice; label: string }[] = [
  { value: 'none', label: 'No access' },
  { value: 'view', label: 'View' },
  { value: 'manage', label: 'Manage' },
];

/* A role is a name and one choice per area of the admin. The choices are a
   three-way switch rather than two checkboxes, because "manage but not view"
   is not a thing and two boxes would let someone ask for it. "Copy access
   from" starts a new role from an existing one — usually from one of the
   defaults the store was set up with. */
export default function RoleForm({
  title,
  backHref,
  initialName = '',
  initialAccess = {},
  templates = [],
  action,
}: {
  title: string;
  backHref: string;
  initialName?: string;
  initialAccess?: Access;
  templates?: AdminStaffRole[];
  action: (payload: { name: string; access: Access }) => Promise<{ error?: string } | void>;
}) {
  const [name, setName] = useState(initialName);
  const [access, setAccess] = useState<Access>(initialAccess);
  const [template, setTemplate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function choose(area: AreaKey, choice: Choice) {
    setAccess((current) => {
      const next = { ...current };
      if (choice === 'none') delete next[area];
      else next[area] = choice;
      return next;
    });
  }

  function setEvery(choice: Choice) {
    setAccess(choice === 'none' ? {} : Object.fromEntries(AREAS.map((a) => [a.key, choice])) as Access);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError('Give the role a name.');
      return;
    }
    startTransition(async () => {
      const result = await action({ name: name.trim(), access });
      if (result && result.error) setError(result.error);
    });
  }

  const quick = 'rounded-full border border-gray-500/25 px-3 py-1.5 text-xs font-semibold text-light-primary-text hover:border-primary hover:text-primary font-public-sans';

  return (
    <form onSubmit={submit} className="w-full rounded-2xl bg-surface p-4 sm:p-6">
      <div className="mb-4 flex items-center gap-2">
        <Link
          href={backHref}
          className="flex size-8 items-center justify-center rounded-full text-light-primary-text transition-colors hover:bg-gray-200"
          aria-label="Back to roles"
        >
          <ArrowLeft size={20} />
        </Link>
        <h2 className="text-lg font-bold text-light-primary-text font-public-sans sm:text-xl">{title}</h2>
      </div>

      <section className="mb-4 rounded-2xl border border-gray-500/20 p-4 sm:mb-6 sm:p-6">
        <h3 className="mb-5 text-lg font-bold text-gray-900 font-public-sans">Role</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
          <FloatingInput label="Role name" name="name" value={name} onChange={setName} required />
          {templates.length > 0 && (
            <FloatingSelect
              label="Copy access from"
              name="template"
              value={template}
              onChange={(value) => {
                setTemplate(value);
                const source = templates.find((role) => String(role.id) === value);
                if (source) setAccess({ ...source.access });
              }}
              options={[
                { value: '', label: 'Start from scratch' },
                ...templates.map((role) => ({ value: role.id, label: role.name })),
              ]}
            />
          )}
        </div>
      </section>

      <section className="mb-4 rounded-2xl border border-gray-500/20 p-4 sm:mb-6 sm:p-6">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-gray-900 font-public-sans">What this role can do</h3>
            <p className="mt-1 max-w-2xl text-sm text-light-secondary-text font-public-sans">
              <strong className="text-light-primary-text">View</strong> opens the pages and lists.{' '}
              <strong className="text-light-primary-text">Manage</strong> also lets them create, edit, delete and
              take actions such as refunds, dispatching an order or sending a push.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={quick} onClick={() => setEvery('view')}>View everything</button>
            <button type="button" className={quick} onClick={() => setEvery('manage')}>Manage everything</button>
            <button type="button" className={quick} onClick={() => setEvery('none')}>Clear</button>
          </div>
        </div>

        <ul className="divide-y divide-gray-500/15 rounded-xl border border-gray-500/20">
          {AREAS.map((area) => {
            const current: Choice = access[area.key] ?? 'none';
            return (
              <li key={area.key} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-semibold text-light-primary-text font-public-sans">{area.label}</p>
                  <p className="mt-0.5 text-xs text-light-secondary-text font-public-sans">{area.description}</p>
                </div>
                <div
                  role="radiogroup"
                  aria-label={`${area.label} access`}
                  className="inline-flex shrink-0 self-start rounded-full bg-gray-500/10 p-1 sm:self-center"
                >
                  {CHOICES.map((choice) => {
                    const selected = current === choice.value;
                    return (
                      <label
                        key={choice.value}
                        className={clsx(
                          'cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors font-public-sans',
                          'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary',
                          selected && choice.value === 'manage' && 'bg-primary text-white',
                          selected && choice.value === 'view' && 'bg-surface text-primary shadow-sm',
                          selected && choice.value === 'none' && 'bg-surface text-light-primary-text shadow-sm',
                          !selected && 'text-light-secondary-text hover:text-light-primary-text',
                        )}
                      >
                        <input
                          type="radio"
                          className="sr-only"
                          name={`access-${area.key}`}
                          value={choice.value}
                          checked={selected}
                          onChange={() => choose(area.key, choice.value)}
                        />
                        {choice.label}
                      </label>
                    );
                  })}
                </div>
              </li>
            );
          })}
        </ul>

        <p className="mt-4 text-sm text-light-secondary-text font-public-sans">
          <span className="font-semibold text-light-primary-text">Summary:</span> {accessSummary(access)}
        </p>
      </section>

      {error && <p className="mb-4 rounded-xl bg-error/10 px-4 py-3 text-sm text-error font-public-sans">{error}</p>}

      <div className="flex justify-end gap-3">
        <PillButton href={backHref} variant="secondary">Cancel</PillButton>
        <PillButton type="submit" disabled={pending}>{pending ? 'Saving…' : 'Save role'}</PillButton>
      </div>
    </form>
  );
}

'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { Download, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useAccess } from '@/components/AccessContext';
import {
  FilterPill, IconAction, Pagination, SearchBox,
  TABLE_HEAD_ROW, TABLE_ROW, TABLE_TD, TABLE_TH,
} from '@/components/sellzy/product-ui';
import ViewToggle, { useViewPreference, type View } from '@/components/ui/ViewToggle';

export type ListColumn = {
  key: string;
  label: string;
  className?: string;
  /** What this column is to a card, when the list is shown as a grid.
   *
   *  Left unset, it is inferred from the key — a column called `image`,
   *  `logo`, `icon`, `background` or `thumbnail` is the picture, `status` is
   *  the badge, the first column left over is the heading, and the rest become
   *  labelled lines. Twelve pages already pass columns; none had to be edited
   *  for the grid to work, and any of them can override the guess. */
  role?: 'media' | 'title' | 'meta' | 'badge' | 'hidden';
};

const MEDIA_KEY = /^(image|logo|icon|thumb|thumbnail|background|photo|avatar|banner)$/i;

/** Which column plays which part on a card. */
function assignRoles(columns: ListColumn[]) {
  const media = columns.find((c) => c.role === 'media')
    ?? columns.find((c) => !c.role && MEDIA_KEY.test(c.key));
  const badge = columns.find((c) => c.role === 'badge')
    ?? columns.find((c) => !c.role && c.key === 'status');
  const rest = columns.filter((c) => c !== media && c !== badge && c.role !== 'hidden');
  const title = rest.find((c) => c.role === 'title') ?? rest[0];
  const meta = rest.filter((c) => c !== title && c.role !== 'title');
  return { media, badge, title, meta };
}

/* Cells arrive as rendered React, because each page owns its own markup. To
   put a selection in a spreadsheet we have to read the text back out of them.
   This walks the node the same way the DOM would and keeps only what a person
   would see — good enough for a name, a price or a status badge, which is what
   these columns hold. Anything it cannot read comes out empty rather than as
   "[object Object]". */
function nodeText(node: React.ReactNode): string {
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(nodeText).join(' ');
  if (typeof node === 'object' && 'props' in node) {
    const props = (node as { props?: { children?: React.ReactNode; alt?: string } }).props;
    if (props?.children !== undefined) return nodeText(props.children);
    if (props?.alt) return String(props.alt);
  }
  return '';
}

function toCsv(columns: ListColumn[], rows: ListRow[]): string {
  const cols = columns.filter((c) => c.role !== 'media' && !MEDIA_KEY.test(c.key));
  const escape = (value: string) => (/[",\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value);
  const lines = [cols.map((c) => escape(c.label)).join(',')];
  for (const row of rows) {
    lines.push(cols.map((c) => escape(nodeText(row.cells[c.key]).replace(/\s+/g, ' ').trim())).join(','));
  }
  return lines.join('\n');
}

export type ListRow = {
  id: number | string;
  /** Text the search box matches against. */
  search: string;
  /** Value the status filter compares to, when `statusFilter` is set. */
  status?: string;
  cells: Record<string, React.ReactNode>;
};

const PAGE_SIZE = { grid: 24, table: 10 } as const;

/**
 * The template's list-page shell: title + Create button, a filter bar, the
 * bordered table, and numbered pagination. Rows arrive already rendered by the
 * server page so each resource keeps control of its own cell markup.
 */
export default function ResourceList({
  title,
  createHref,
  createLabel,
  columns,
  rows,
  editHrefBase,
  deleteAction,
  bulkStatusAction,
  statusFilter,
  emptyMessage,
  defaultView,
  viewKey,
}: {
  title: string;
  createHref?: string;
  createLabel?: string;
  columns: ListColumn[];
  rows: ListRow[];
  /** Edit pages live at `<editHrefBase>/<id>`. Omit to hide the edit action.
      A string, not a builder function — functions cannot cross the
      server/client boundary. */
  editHrefBase?: string;
  /* May return a message: a delete the database refuses (a rule still in use)
     belongs next to the row, not on a crashed page. */
  deleteAction?: (formData: FormData) => Promise<{ error?: string } | void>;
  /* Sets many rows to one status at once. Given it, the selection bar offers
     the same values `statusFilter` already filters by — a list that can be
     narrowed to "archived" is a list whose rows can be made archived, and
     inventing a second vocabulary for the same field invites them to drift.
     Receives `ids` (a JSON array) and `status`. */
  bulkStatusAction?: (formData: FormData) => Promise<{ error?: string } | void>;
  statusFilter?: { label: string; options: { value: string; label: string }[] };
  emptyMessage?: string;
  /** What this list opens as. Defaults to cards when the rows carry a picture,
   *  rows when they do not — a tax rate is not improved by being a card. */
  defaultView?: View;
  /** Remembers the choice under this name. Defaults to the list's title. */
  viewKey?: string;
}) {
  const roles = useMemo(() => assignRoles(columns), [columns]);
  const [view, setView] = useViewPreference(
    viewKey ?? title.toLowerCase().replace(/\s+/g, '-'),
    defaultView ?? (roles.media ? 'grid' : 'table'),
  );
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<number | string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<number | string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (needle && !r.search.toLowerCase().includes(needle)) return false;
      if (status && r.status !== status) return false;
      return true;
    });
  }, [rows, query, status]);

  const pageSize = PAGE_SIZE[view];
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, totalPages);
  const pageRows = filtered.slice((current - 1) * pageSize, current * pageSize);
  // A role that can only view this page gets the list without its controls.
  const { canManageHere } = useAccess();
  if (!canManageHere) {
    createHref = undefined;
    editHrefBase = undefined;
    deleteAction = undefined;
    bulkStatusAction = undefined;
  }
  const showActions = Boolean(editHrefBase || deleteAction);

  /* Selection lives on ids, not on the page, so paging or searching away from
     a row does not quietly drop it from the batch. The header box therefore
     speaks only for the rows in front of you. */
  const pageIds = pageRows.map((r) => r.id);
  const allOnPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const selectedRows = filtered.filter((r) => selected.has(r.id));

  function toggleRow(id: number | string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  function togglePage() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) pageIds.forEach((id) => next.delete(id));
      else pageIds.forEach((id) => next.add(id));
      return next;
    });
  }

  return (
    <div className="w-full rounded-2xl border border-gray-500/20 bg-surface">
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <h3 className="text-xl font-bold leading-7 text-light-primary-text font-public-sans">{title}</h3>
        {createHref && (
          <Link
            href={createHref}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-dark font-public-sans"
          >
            <Plus size={16} />{createLabel ?? 'Create'}
          </Link>
        )}
      </div>

      <div className="flex flex-col gap-3 px-4 pb-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <SearchBox value={query} onChange={(v) => { setQuery(v); setPage(1); }} placeholder="Search…" />
        <div className="flex flex-wrap items-center gap-2.5">
          {statusFilter && (
            <FilterPill
              value={status}
              onChange={(v) => { setStatus(v); setPage(1); }}
              options={[{ value: '', label: statusFilter.label }, ...statusFilter.options]}
            />
          )}
          <ViewToggle view={view} onChange={(next) => { setView(next); setPage(1); }} label={`How ${title} is shown`} />
        </div>
      </div>

      {/* Only once something is picked. An empty bar on every list would cost
          every page a row of chrome to say nothing. */}
      {selected.size > 0 && (
        <div className="mx-4 mb-4 flex flex-wrap items-center gap-2.5 rounded-xl px-4 py-3 sm:mx-6"
             style={{ border: '1px solid var(--brand-border)', background: 'var(--brand-light)' }}>
          <span className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>
            {selected.size} selected
          </span>

          <button
            type="button"
            onClick={() => downloadCsv(title, toCsv(columns, selectedRows))}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold"
            style={{ background: 'var(--surface)', color: 'var(--text-1)', border: '1px solid var(--border)' }}
          >
            <Download size={14} />Export
          </button>

          {bulkStatusAction && statusFilter && (
            <select
              disabled={bulkBusy}
              defaultValue=""
              onChange={(e) => {
                const value = e.target.value;
                e.target.value = '';
                if (!value) return;
                setBulkBusy(true);
                setDeleteError(null);
                startTransition(async () => {
                  const fd = new FormData();
                  fd.set('ids', JSON.stringify([...selected]));
                  fd.set('status', value);
                  const result = await bulkStatusAction(fd);
                  if (result && 'error' in result && result.error) setDeleteError(result.error);
                  else setSelected(new Set());
                  setBulkBusy(false);
                });
              }}
              className="rounded-full px-3 py-1.5 text-xs font-semibold"
              style={{ background: 'var(--surface)', color: 'var(--text-1)', border: '1px solid var(--border)' }}
            >
              <option value="">Set status…</option>
              {statusFilter.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          )}

          {deleteAction && (
            confirmBulkDelete ? (
              <span className="inline-flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={bulkBusy}
                  onClick={() => {
                    setBulkBusy(true);
                    setDeleteError(null);
                    startTransition(async () => {
                      /* One call per row, because that is the action every page
                         already has. A row the database refuses is counted and
                         named rather than failing the whole batch — deleting
                         nine of ten and saying "done" would be a lie. */
                      const failed: (number | string)[] = [];
                      for (const id of selected) {
                        const fd = new FormData();
                        fd.set('id', String(id));
                        const result = await deleteAction(fd);
                        if (result && 'error' in result && result.error) failed.push(id);
                      }
                      if (failed.length) {
                        setDeleteError(
                          `${selected.size - failed.length} deleted, ${failed.length} could not be — they are still in use.`,
                        );
                      }
                      setSelected(new Set(failed));
                      setConfirmBulkDelete(false);
                      setBulkBusy(false);
                    });
                  }}
                  className="rounded-full bg-error px-3 py-1.5 text-xs font-semibold text-white"
                >
                  {bulkBusy ? 'Deleting…' : `Yes, delete ${selected.size}`}
                </button>
                <button type="button" onClick={() => setConfirmBulkDelete(false)}
                        className="rounded-full px-3 py-1.5 text-xs font-medium" style={{ color: 'var(--text-2)' }}>
                  Keep
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmBulkDelete(true)}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-error"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
              >
                <Trash2 size={14} />Delete
              </button>
            )
          )}

          <button type="button" onClick={() => { setSelected(new Set()); setConfirmBulkDelete(false); }}
                  className="ml-auto inline-flex items-center gap-1 text-xs font-medium" style={{ color: 'var(--text-3)' }}>
            <X size={13} />Clear
          </button>
        </div>
      )}

      {view === 'grid' ? (
        pageRows.length === 0 ? (
          <div className="ak-empty py-14 text-center text-sm">{emptyMessage ?? 'Nothing here yet.'}</div>
        ) : (
          <ul className="grid grid-cols-2 gap-3 px-4 sm:gap-4 sm:px-6 md:grid-cols-3 xl:grid-cols-4">
            {pageRows.map((row) => (
              <li key={row.id} className="ak-product-tile relative" style={{ padding: 12, cursor: 'default' }}>
                <input
                  type="checkbox"
                  className="absolute left-3 top-3 z-10 size-4 accent-primary"
                  checked={selected.has(row.id)}
                  onChange={() => toggleRow(row.id)}
                  aria-label={`Select ${row.search.slice(0, 60)}`}
                />
                {roles.media && (
                  /* The cell the page already renders — a thumbnail, a colour
                     swatch, a logo. Given room here instead of the 32px it got
                     in a table's first column, which is what made these lists
                     worth showing as cards at all. */
                  <div
                    className="mb-2.5 flex items-center justify-center overflow-hidden rounded-lg [&_img]:h-full [&_img]:w-full [&_img]:object-cover"
                    style={{ aspectRatio: '16 / 10', background: 'var(--surface-2)' }}
                  >
                    {row.cells[roles.media.key]}
                  </div>
                )}

                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 text-[13px] font-semibold leading-snug" style={{ color: 'var(--text-1)' }}>
                    {roles.title ? row.cells[roles.title.key] : null}
                  </div>
                  {roles.badge && <span className="shrink-0">{row.cells[roles.badge.key]}</span>}
                </div>

                {roles.meta.length > 0 && (
                  <dl className="mt-2 space-y-1">
                    {roles.meta.map((column) => {
                      const value = row.cells[column.key];
                      // A blank fact is worse than a missing one: it reads as
                      // a value the reader has to work out, rather than as
                      // nothing to say.
                      if (value == null || value === '' || value === '—') return null;
                      return (
                        <div key={column.key} className="flex items-baseline justify-between gap-2 text-[11.5px]">
                          <dt className="shrink-0" style={{ color: 'var(--text-3)' }}>{column.label}</dt>
                          <dd className="min-w-0 truncate text-right" style={{ color: 'var(--text-2)' }}>{value}</dd>
                        </div>
                      );
                    })}
                  </dl>
                )}

                {showActions && (
                  <div className="mt-3 flex items-center justify-end gap-1 border-t pt-2" style={{ borderColor: 'var(--border)' }}>
                    <RowActions
                      row={row}
                      editHrefBase={editHrefBase}
                      deleteAction={deleteAction}
                      confirmDelete={confirmDelete}
                      setConfirmDelete={setConfirmDelete}
                      setDeleteError={setDeleteError}
                      startTransition={startTransition}
                    />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )
      ) : (
      <div className="relative w-full overflow-auto">
        <table className="w-full caption-bottom text-sm">
          <thead>
            <tr className={TABLE_HEAD_ROW}>
              <th className={`${TABLE_TH} w-8`}>
                <input
                  type="checkbox"
                  className="size-4 accent-primary"
                  checked={allOnPageSelected}
                  onChange={togglePage}
                  aria-label={allOnPageSelected ? 'Clear this page' : 'Select this page'}
                />
              </th>
              {columns.map((c) => <th key={c.key} className={`${TABLE_TH} ${c.className ?? ''}`}>{c.label}</th>)}
              {showActions && <th className={TABLE_TH}>Action</th>}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row) => (
              <tr key={row.id} className={TABLE_ROW}>
                <td className={TABLE_TD}>
                  <input
                    type="checkbox"
                    className="size-4 accent-primary"
                    checked={selected.has(row.id)}
                    onChange={() => toggleRow(row.id)}
                    aria-label={`Select ${row.search.slice(0, 60)}`}
                  />
                </td>
                {columns.map((c) => (
                  <td key={c.key} className={`${TABLE_TD} text-sm text-light-secondary-text`}>{row.cells[c.key]}</td>
                ))}
                {showActions && (
                  <td className={TABLE_TD}>
                    <RowActions
                      row={row}
                      editHrefBase={editHrefBase}
                      deleteAction={deleteAction}
                      confirmDelete={confirmDelete}
                      setConfirmDelete={setConfirmDelete}
                      setDeleteError={setDeleteError}
                      startTransition={startTransition}
                    />
                  </td>
                )}
              </tr>
            ))}
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={columns.length + 1 + (showActions ? 1 : 0)} className="py-14 text-center text-sm text-light-secondary-text font-public-sans">
                  {emptyMessage ?? 'Nothing here yet.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      )}

      {deleteError && (
        <p className="mx-4 mb-2 rounded-xl bg-error/10 px-4 py-3 text-sm text-error font-public-sans sm:mx-6">
          {deleteError}
        </p>
      )}

      <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <p className="text-xs text-light-secondary-text font-public-sans">
          Showing {pageRows.length} of {filtered.length}
        </p>
        <Pagination page={current} totalPages={totalPages} onChange={setPage} />
      </div>
    </div>
  );
}


/* Edit and delete, with the same two-step confirm in both views. Extracted so
   the card and the row cannot drift into confirming differently — the delete
   is the one control here that cannot be taken back. */
function RowActions({
  row, editHrefBase, deleteAction, confirmDelete, setConfirmDelete, setDeleteError, startTransition,
}: {
  row: ListRow;
  editHrefBase?: string;
  deleteAction?: (formData: FormData) => Promise<{ error?: string } | void>;
  confirmDelete: number | string | null;
  setConfirmDelete: (id: number | string | null) => void;
  setDeleteError: (message: string | null) => void;
  startTransition: (fn: () => void) => void;
}) {
  if (confirmDelete === row.id) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <form
          action={(fd) => startTransition(async () => {
            setDeleteError(null);
            const result = await deleteAction?.(fd);
            if (result && 'error' in result && result.error) setDeleteError(result.error);
            setConfirmDelete(null);
          })}
          className="inline"
        >
          <input type="hidden" name="id" value={row.id} />
          <button type="submit" className="rounded-full bg-error px-2.5 py-1 text-xs font-semibold text-white hover:bg-error-dark font-public-sans">
            Delete
          </button>
        </form>
        <button onClick={() => setConfirmDelete(null)} className="rounded-full px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 font-public-sans">
          Keep
        </button>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1">
      {editHrefBase && <IconAction href={`${editHrefBase}/${row.id}`} title="Edit"><Pencil size={16} /></IconAction>}
      {deleteAction && (
        <button
          onClick={() => setConfirmDelete(row.id)}
          title="Delete"
          className="flex size-8 items-center justify-center rounded-full text-error transition-colors hover:bg-error/10"
        >
          <Trash2 size={16} />
        </button>
      )}
    </span>
  );
}

/** Hand the browser a file. Same shape as the stock page's Export, so a
 *  merchant who has used one already knows what this does. */
function downloadCsv(title: string, csv: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `${title.toLowerCase().replace(/\s+/g, '-')}-selection.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

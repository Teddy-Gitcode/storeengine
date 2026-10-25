import { getLegalPages } from '@/lib/admin-api';
import ResourceList from '@/components/sellzy/resource-list';
import { StatusPill } from '@/components/sellzy/product-ui';
import type { ResourceField } from '@/components/sellzy/resource-form';
import type { AdminLegalPage } from '@/lib/admin-types';

/* Privacy Policy and Terms & Conditions are the same screen in the template,
   differing only by page_type — so both routes share this implementation. */

export type LegalKind = 'privacy' | 'terms';

export const LEGAL_META: Record<LegalKind, { route: string; title: string; create: string }> = {
  privacy: { route: '/privacy-and-policy', title: 'Privacy Policy', create: 'Create Policy' },
  terms: { route: '/terms-and-conditions', title: 'Terms & Condition', create: 'Create Terms' },
};

export const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'sw', label: 'Swahili' },
  { value: 'fr', label: 'French' },
  { value: 'es', label: 'Spanish' },
];

export function legalPayload(kind: LegalKind, formData: FormData): Record<string, unknown> | null {
  const title = String(formData.get('title') || '').trim();
  if (!title) return null;
  return {
    page_type: kind,
    title,
    body: String(formData.get('body') || '').trim(),
    language: String(formData.get('language') || 'en'),
    status: String(formData.get('status')) === 'draft' ? 'draft' : 'published',
    sort_order: Number(formData.get('sort_order') || 0),
  };
}

export function legalFields(doc?: AdminLegalPage): ResourceField[] {
  return [
    { kind: 'text', name: 'title', label: 'Title', defaultValue: doc?.title, required: true, half: true },
    { kind: 'number', name: 'sort_order', label: 'Short Order', defaultValue: doc?.sort_order ?? 0, half: true },
    { kind: 'select', name: 'language', label: 'Language', defaultValue: doc?.language ?? 'en', options: LANGUAGES },
    { kind: 'textarea', name: 'body', label: 'Details', defaultValue: doc?.body, rows: 10 },
  ];
}

export default async function LegalListPage({
  kind,
  deleteAction,
}: {
  kind: LegalKind;
  deleteAction: (formData: FormData) => Promise<{ error?: string } | void>;
}) {
  const meta = LEGAL_META[kind];
  const page = await getLegalPages(kind).catch(() => null);
  const docs = page?.results ?? [];

  return (
    <ResourceList
      title={meta.title}
      createHref={`${meta.route}/add`}
      createLabel={meta.create}
      columns={[
        { key: 'id', label: 'ID' },
        { key: 'language', label: 'Language' },
        { key: 'title', label: 'Title' },
        { key: 'details', label: 'Details' },
        { key: 'order', label: 'Short Order' },
        { key: 'status', label: 'Status' },
      ]}
      statusFilter={{
        label: 'All status',
        options: [
          { value: 'published', label: 'Published' },
          { value: 'draft', label: 'Draft' },
        ],
      }}
      rows={docs.map((d) => ({
        id: d.id,
        search: `${d.title} ${d.body} ${d.language}`,
        status: d.status,
        cells: {
          id: <span className="whitespace-nowrap">#{d.id}</span>,
          language: <span className="uppercase">{d.language}</span>,
          title: <span className="font-semibold text-light-primary-text">{d.title}</span>,
          details: <span className="line-clamp-2 max-w-md">{d.body || '—'}</span>,
          order: <span className="font-dm-sans">{d.sort_order}</span>,
          status: <StatusPill label={d.status_label} tone={d.status === 'published' ? 'success' : 'neutral'} />,
        },
      }))}
      editHrefBase={`${meta.route}/edit`}
      deleteAction={deleteAction}
      emptyMessage={`No ${meta.title.toLowerCase()} documents yet.`}
    />
  );
}

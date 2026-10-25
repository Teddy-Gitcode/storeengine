import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { Bot, CreditCard, Flame, Megaphone, Truck } from 'lucide-react';
import { getAssistantConfig, getFirebaseConfig, getMarketingTools, revealSecret, updateFirebaseConfig } from '@/lib/admin-api';
import { storefrontUrl } from '@/lib/storefront';
import Badge from '@/components/Badge';
import { SettingsCard } from '@/components/sellzy/settings-field';
import PublicField from '@/components/system/PublicField';
import SecretField from '@/components/system/SecretField';
import type { SecretState } from '@/lib/admin-types';

export const dynamic = 'force-dynamic';

/* Credentials and the things that hold them.
 *
 * Split out of Settings because they are not the same job: someone who edits
 * the shop's opening hours has no business reading a private key. The route
 * sits in the `integrations` access area and needs manage, which the shell
 * enforces for the menu and the API enforces for the data.
 *
 * Nothing on this page is handed a secret value. Every credential arrives as
 * "is it set, and which one is it" — see apps/integrations/secrets.py.
 */

const TABS = [
  { key: 'integrations', label: 'Integrations' },
  { key: 'credentials', label: 'Credentials' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

function message(error: unknown, fallback: string) {
  const text = error instanceof Error ? error.message : '';
  return text.split(' — ')[1] || fallback;
}

async function saveSecretAction(field: string, value: string) {
  'use server';
  try {
    await updateFirebaseConfig({ [field]: value });
  } catch (error) {
    return { error: message(error, 'Could not save that credential.') };
  }
  revalidatePath('/system');
  revalidatePath('/firebase');
}

async function revealSecretAction(field: string) {
  'use server';
  try {
    const { value } = await revealSecret('firebase', field);
    return { value };
  } catch (error) {
    return { error: message(error, 'That credential could not be read.') };
  }
}

export default async function SystemPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const sp = await searchParams;
  const tab = (TABS.some((t) => t.key === sp.tab) ? sp.tab : 'integrations') as TabKey;

  const [firebase, assistant, tools] = await Promise.all([
    getFirebaseConfig().catch(() => null),
    getAssistantConfig().catch(() => null),
    getMarketingTools().catch(() => null),
  ]);

  // Tolerates the old API shape during the deploy window — see app/firebase.
  const blank = { is_set: false, last4: '', updated_at: null, updated_by: '' };
  const secrets = {
    service_account_json: firebase?.secrets?.service_account_json ?? blank,
    api_key: firebase?.secrets?.api_key ?? blank,
    web_api_key: firebase?.secrets?.web_api_key ?? blank,
  };
  const firebaseReady = Boolean(secrets.service_account_json.is_set && firebase?.project_id);

  return (
    <div className="ak-card">
      <div className="px-4 pb-1 pt-4 sm:px-6 sm:pt-6">
        <h2 className="ak-page-title">System configuration</h2>
        <p className="ak-page-sub">Integrations and the credentials this store holds</p>
      </div>
      <div className="px-4 sm:px-6">
        <nav className="flex gap-6 overflow-x-auto sm:gap-10" style={{ borderBottom: '1px solid var(--border)' }}>
          {TABS.map((entry) => {
            const isActive = entry.key === tab;
            return (
              <Link
                key={entry.key}
                href={entry.key === 'integrations' ? '/system' : `/system?tab=${entry.key}`}
                aria-current={isActive ? 'page' : undefined}
                className="whitespace-nowrap py-3 text-sm font-semibold transition-colors"
                style={{
                  borderBottom: `3px solid ${isActive ? 'var(--brand)' : 'transparent'}`,
                  color: isActive ? 'var(--text-1)' : 'var(--text-3)',
                }}
              >
                {entry.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="space-y-4 p-4 sm:space-y-6 sm:p-6">
        {tab === 'credentials' ? (
          <CredentialsTable secrets={secrets} />
        ) : (
          <>
            <SettingsCard
              title="Firebase"
              sub="Push delivery and customer sign-in."
              badge={<Badge label={firebaseReady ? 'Connected' : 'Not configured'} variant={firebaseReady ? 'success' : 'neutral'} />}
            >
              {!firebase ? (
                <p className="text-sm" style={{ color: 'var(--error)' }}>Could not load the Firebase configuration.</p>
              ) : (
                <div className="space-y-5">
                  <div data-manage className="space-y-5">
                    <SecretField
                      field="service_account_json"
                      label="Service account"
                      state={secrets.service_account_json}
                      revealAction={revealSecretAction}
                      saveAction={saveSecretAction}
                      multiline
                      help="The JSON key file from Firebase → Project settings → Service accounts."
                    />
                    <SecretField
                      field="api_key"
                      label="API key"
                      state={secrets.api_key}
                      revealAction={revealSecretAction}
                      saveAction={saveSecretAction}
                    />
                    <SecretField
                      field="web_api_key"
                      label="Web API key"
                      state={secrets.web_api_key}
                      revealAction={revealSecretAction}
                      saveAction={saveSecretAction}
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <PublicField label="Project ID" defaultValue={firebase.project_id} readOnly />
                    <PublicField label="Auth domain" defaultValue={firebase.auth_domain} readOnly />
                  </div>
                  <Link href="/firebase" className="ak-btn-secondary" style={{ borderRadius: 9999 }}>
                    <Flame size={13} />Full Firebase settings
                  </Link>
                </div>
              )}
            </SettingsCard>

            <SettingsCard
              title="Customer assistant"
              sub="The storefront's chat helper."
              badge={
                <Badge
                  label={assistant?.configured ? (assistant.effective ? 'On' : 'Off') : 'Not configured'}
                  variant={assistant?.effective ? 'success' : 'neutral'}
                />
              }
            >
              <p className="text-sm" style={{ color: 'var(--text-2)' }}>
                Its API key lives in the server environment, not in this database, so there is nothing
                here to reveal or rotate. {assistant?.configured ? 'A key is present.' : 'No key is set, so the assistant stays inert however the switch is set.'}
              </p>
              <div className="mt-4">
                <Link href="/assistant" className="ak-btn-secondary" style={{ borderRadius: 9999 }}>
                  <Bot size={13} />Assistant settings
                </Link>
              </div>
            </SettingsCard>

            <SettingsCard
              title="Marketing tools"
              sub="Analytics and pixel integrations."
              badge={<Badge label={`${(tools?.results ?? []).filter((t) => t.is_enabled).length} on`} variant="neutral" />}
            >
              <div className="flex flex-wrap gap-2">
                {(tools?.results ?? []).map((tool) => (
                  <Badge key={tool.id} label={tool.name} variant={tool.is_enabled ? 'success' : 'neutral'} />
                ))}
                {(tools?.results ?? []).length === 0 && (
                  <p className="text-sm" style={{ color: 'var(--text-3)' }}>None configured.</p>
                )}
              </div>
              <div className="mt-4">
                <Link href="/marketing-tools" className="ak-btn-secondary" style={{ borderRadius: 9999 }}>
                  <Megaphone size={13} />Marketing tools
                </Link>
              </div>
            </SettingsCard>

            {/* The one genuinely useful thing the old "Payment API" page could
                have held: the URL a provider has to be given. */}
            <SettingsCard
              title="Payment & delivery providers"
              sub="Their credentials live in the server environment, where the browser never sees them."
              badge={<Badge label="Server-side" variant="neutral" />}
            >
              <div className="space-y-4">
                <ProviderRow
                  icon={CreditCard}
                  name="Jenga PGW"
                  what="Card and mobile-money payments."
                  callback={storefrontUrl('/api/payments/jenga/callback')}
                />
                <ProviderRow
                  icon={Truck}
                  name="DHL"
                  what="International shipping rates and waybills."
                  callback={storefrontUrl('/api/shipping/dhl/webhook')}
                />
              </div>
              <p className="mt-4 text-xs" style={{ color: 'var(--text-3)' }}>
                Give the provider the callback URL above. Keys and secrets are set as environment
                variables on the server and cannot be read or changed from the admin.
              </p>
            </SettingsCard>
          </>
        )}
      </div>
    </div>
  );
}

function ProviderRow({
  icon: Icon, name, what, callback,
}: {
  icon: typeof CreditCard;
  name: string;
  what: string;
  callback: string;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl p-4 sm:flex-row sm:items-center sm:gap-4" style={{ border: '1px solid var(--border)' }}>
      <span className="grid size-9 shrink-0 place-items-center rounded-lg" style={{ background: 'var(--surface-2)', color: 'var(--text-2)' }}>
        <Icon size={16} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold" style={{ color: 'var(--text-1)' }}>{name}</span>
        <span className="block text-xs" style={{ color: 'var(--text-3)' }}>{what}</span>
      </span>
      <span className="w-full sm:w-[340px]">
        <PublicField label="Callback URL" defaultValue={callback} readOnly />
      </span>
    </div>
  );
}

/* Every secret this store holds, in one list. The same facts as the
   Integrations tab, cut the other way: an owner asking "what do we hold, and
   who touched it last" should not have to open each integration to find out. */
function CredentialsTable({ secrets }: { secrets: Record<string, SecretState> }) {
  const rows = Object.entries(secrets).map(([field, state]) => ({
    integration: 'Firebase',
    field,
    label: field.replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    state,
  }));

  return (
    <SettingsCard title="Credentials" sub="Everything this store keeps, and when it was last set.">
      <div className="w-full overflow-x-auto">
        <table className="ak-table w-full text-sm">
          <thead>
            <tr>
              {['Integration', 'Credential', 'Status', 'Last set'].map((head) => (
                <th key={head} className="whitespace-nowrap px-3 py-2.5 text-left text-[12px] font-semibold first:pl-4">
                  {head}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.field}>
                <td className="px-3 py-2.5 pl-4 text-[13px]" style={{ color: 'var(--text-2)' }}>{row.integration}</td>
                <td className="px-3 py-2.5 text-[13px] font-medium" style={{ color: 'var(--text-1)' }}>
                  {row.label}
                  {row.state.last4 && (
                    <span className="ml-2 font-mono text-[11px]" style={{ color: 'var(--text-3)' }}>…{row.state.last4}</span>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  <Badge label={row.state.is_set ? 'Set' : 'Not set'} variant={row.state.is_set ? 'success' : 'neutral'} />
                </td>
                <td className="px-3 py-2.5 text-[13px]" style={{ color: 'var(--text-3)' }}>
                  {row.state.updated_at
                    ? `${new Date(row.state.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}${row.state.updated_by ? ` by ${row.state.updated_by}` : ''}`
                    : '—'}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="ak-empty py-10 text-center text-sm">
                  No credentials could be read.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-xs" style={{ color: 'var(--text-3)' }}>
        Set, rotate or clear a credential on the Integrations tab. Revealing one is recorded against
        your name.
      </p>
    </SettingsCard>
  );
}

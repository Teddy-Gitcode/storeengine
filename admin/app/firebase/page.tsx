import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Flame } from 'lucide-react';
import { getFirebaseConfig, revealSecret, updateFirebaseConfig } from '@/lib/admin-api';
import Badge from '@/components/Badge';
import { SettingsCard } from '@/components/sellzy/settings-field';
import SettingsToggle from '@/components/sellzy/settings-toggle';
import SubmitButton from '@/components/sellzy/submit-button';
import PublicField from '@/components/system/PublicField';
import SecretField from '@/components/system/SecretField';

export const dynamic = 'force-dynamic';

/* The page used to render the service-account private key and both API keys as
   plain text inputs, filled from a GET that returned them in full. They are now
   write-only at the API and come back only as "is it set, and which one is it"
   — so this page asks for a value when somebody actually wants to see one, and
   that request is logged. See apps/integrations/secrets.py. */

const PUBLIC_FIELDS = [
  'project_id', 'auth_domain', 'storage_bucket', 'messaging_sender_id', 'app_id', 'measurement_id',
] as const;

function message(error: unknown, fallback: string) {
  const text = error instanceof Error ? error.message : '';
  return text.split(' — ')[1] || fallback;
}

async function savePublicAction(formData: FormData) {
  'use server';
  const payload: Record<string, unknown> = {};
  for (const field of PUBLIC_FIELDS) {
    const value = formData.get(field);
    if (value !== null) payload[field] = String(value).trim();
  }
  payload.auth_enabled = formData.get('auth_enabled') !== null;
  payload.phone_auth_enabled = formData.get('phone_auth_enabled') !== null;
  try {
    await updateFirebaseConfig(payload);
  } catch (error) {
    const detail = message(error, 'Could not save the Firebase configuration.');
    redirect(`/firebase?error=${encodeURIComponent(detail)}`);
  }
  revalidatePath('/firebase');
  redirect('/firebase?saved=1');
}

async function saveSecretAction(field: string, value: string) {
  'use server';
  try {
    await updateFirebaseConfig({ [field]: value });
  } catch (error) {
    return { error: message(error, 'Could not save that credential.') };
  }
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

export default async function FirebasePage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const config = await getFirebaseConfig().catch(() => null);

  if (!config) {
    return (
      <div className="ak-card p-6">
        <p className="text-sm" style={{ color: 'var(--error)' }}>
          Could not load the Firebase configuration — check the API and reload.
        </p>
      </div>
    );
  }

  /* Same deploy-window guard as the stock page: until the backend catches up,
     a GET still returns the old shape, which has no `secrets` block at all. An
     absent secret reads as "not set" rather than taking the page down — and it
     cannot read as a value, because there is none to read. */
  const blank = { is_set: false, last4: '', updated_at: null, updated_by: '' };
  const secrets = {
    service_account_json: config.secrets?.service_account_json ?? blank,
    api_key: config.secrets?.api_key ?? blank,
    web_api_key: config.secrets?.web_api_key ?? blank,
  };
  const connected = secrets.service_account_json.is_set && Boolean(config.project_id);

  return (
    <div className="ak-card">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-4 sm:px-6 sm:pt-6">
        <div className="flex items-center gap-2">
          <Link
            href="/settings/general"
            aria-label="Back to settings"
            className="ak-icon-btn"
            style={{ color: 'var(--text-2)' }}
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h2 className="ak-page-title flex items-center gap-2">
              <Flame size={18} style={{ color: 'var(--brand)' }} />Firebase
            </h2>
            <p className="ak-page-sub">Push delivery and customer sign-in</p>
          </div>
        </div>
        <Badge
          label={connected ? 'Connected' : 'Not configured'}
          variant={connected ? 'success' : 'neutral'}
        />
      </div>

      <div className="space-y-4 p-4 sm:space-y-6 sm:p-6">
        {sp.saved && (
          <div
            className="flex items-center gap-2 rounded-2xl px-4 py-3"
            style={{ border: '1px solid var(--green-border)', background: 'var(--green-light)' }}
          >
            <CheckCircle2 size={16} style={{ color: 'var(--green)' }} />
            <span className="text-sm font-semibold" style={{ color: 'var(--green)' }}>Saved</span>
          </div>
        )}
        {sp.error && (
          <p className="rounded-2xl px-4 py-3 text-sm font-semibold" style={{ color: 'var(--error)', border: '1px solid var(--error)' }}>
            {sp.error}
          </p>
        )}

        <SettingsCard
          title="Credentials"
          sub="Held on the server and never sent to this page. Reading one back is recorded against your name."
        >
          <div data-manage className="space-y-5">
            <SecretField
              field="service_account_json"
              label="Service account"
              state={secrets.service_account_json}
              revealAction={revealSecretAction}
              saveAction={saveSecretAction}
              multiline
              help="The JSON key file from Firebase → Project settings → Service accounts. Signs push messages."
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
              help="Used by the storefront's own Firebase client."
            />
          </div>
        </SettingsCard>

        <form action={savePublicAction} className="space-y-4 sm:space-y-6">
          <SettingsCard
            title="Project"
            sub="Public Firebase configuration. These ship to browsers as part of the storefront, so they are not secrets."
          >
            <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
              <PublicField label="Project ID" name="project_id" defaultValue={config.project_id} />
              <PublicField label="Auth domain" name="auth_domain" defaultValue={config.auth_domain} />
              <PublicField label="Storage bucket" name="storage_bucket" defaultValue={config.storage_bucket} />
              <PublicField label="Messaging sender ID" name="messaging_sender_id" defaultValue={config.messaging_sender_id} />
              <PublicField label="App ID" name="app_id" defaultValue={config.app_id} />
              <PublicField label="Measurement ID" name="measurement_id" defaultValue={config.measurement_id} />
            </div>
          </SettingsCard>

          <SettingsCard title="Sign-in">
            <div className="space-y-4">
              <Switch
                name="auth_enabled"
                checked={config.auth_enabled}
                title="Firebase sign-in"
                desc="Let shoppers sign in to the storefront with a Firebase account."
              />
              <Switch
                name="phone_auth_enabled"
                checked={config.phone_auth_enabled}
                title="Phone / SMS sign-in"
                desc="Separate from the switch above. SMS codes are metered and a common fraud target — leave off until you mean to use it."
              />
            </div>
          </SettingsCard>

          <div data-manage className="flex justify-end">
            <SubmitButton>Save changes</SubmitButton>
          </div>
        </form>
      </div>
    </div>
  );
}

function Switch({ name, checked, title, desc }: { name: string; checked: boolean; title: string; desc: string }) {
  return (
    <div className="flex items-start justify-between gap-6">
      <div className="min-w-0">
        <p className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>{title}</p>
        <p className="text-xs" style={{ color: 'var(--text-3)' }}>{desc}</p>
      </div>
      <div data-manage>
        <SettingsToggle name={name} defaultChecked={checked} label={title} />
      </div>
    </div>
  );
}

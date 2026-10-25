import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { LockKeyhole, User, AlertCircle } from 'lucide-react';
import { loginAdmin } from '@/lib/admin-api';
import PasswordInput from './PasswordInput';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api';

// Public (unauthenticated) store branding, so the login shows the real logo.
async function getBranding(): Promise<{ business_name: string; logo_url: string }> {
  try {
    const res = await fetch(`${API_BASE}/store/settings/`, { next: { revalidate: 300 } });
    if (!res.ok) throw new Error();
    const data = await res.json();
    return { business_name: data.business_name || 'Admin', logo_url: data.logo_url || '' };
  } catch {
    return { business_name: 'Admin', logo_url: '' };
  }
}

async function loginAction(formData: FormData) {
  'use server';

  const username = String(formData.get('username') || '');
  const password = String(formData.get('password') || '');
  const next = String(formData.get('next') || '/');
  const result = await loginAdmin(username, password);

  if (!result) {
    redirect('/login?error=1');
  }

  (await cookies()).set('admin_token', result.token, {
    httpOnly: true,
    sameSite: 'lax',
    // The staff session token — never let it travel over plain HTTP in
    // production. Local dev runs on http://localhost, where a secure cookie
    // would simply never be stored, so this follows the environment.
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 12,
  });

  redirect(next.startsWith('/') ? next : '/');
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const params = await searchParams;
  const branding = await getBranding();

  return (
    <main
      className="flex min-h-screen items-center justify-center px-4 py-10"
      style={{ background: 'var(--surface-2)' }}
    >
      <div className="w-full max-w-[380px]">
        <div className="mb-7 flex flex-col items-center text-center">
          {branding.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={branding.logo_url} alt={branding.business_name} className="h-10 w-auto" />
          ) : (
            <div
              className="flex h-12 w-12 items-center justify-center rounded-xl"
              style={{ background: 'var(--brand-light)', color: 'var(--brand)' }}
            >
              <LockKeyhole size={22} />
            </div>
          )}
          <h1 className="ak-page-title mt-4" style={{ fontSize: 20, color: 'var(--text-2)' }}>
            Sign in
          </h1>
        </div>

        <div
          className="rounded-2xl border p-6 sm:p-8"
          style={{
            background: 'var(--surface)',
            borderColor: 'var(--border)',
            boxShadow: '0 18px 50px -24px rgba(15,42,36,0.28)',
          }}
        >
          <form action={loginAction} className="space-y-4">
            <input type="hidden" name="next" value={params.next || '/'} />

            {params.error && (
              <div
                className="flex items-center gap-2 rounded-lg border px-3 py-2.5 text-[13px]"
                style={{ borderColor: '#E8C0BC', background: 'var(--error-light)', color: 'var(--error)' }}
              >
                <AlertCircle size={15} className="shrink-0" />
                Invalid username or password. Please try again.
              </div>
            )}

            <label className="block">
              <span className="text-xs font-semibold" style={{ color: 'var(--text-2)' }}>
                Username
              </span>
              <div className="relative mt-1">
                <span
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--text-3)' }}
                >
                  <User size={16} />
                </span>
                <input
                  name="username"
                  className="ak-input w-full"
                  style={{ height: 44, borderRadius: 8, paddingLeft: 36 }}
                  autoComplete="username"
                  autoFocus
                  required
                />
              </div>
            </label>

            <PasswordInput />

            <button
              className="ak-btn-primary w-full justify-center"
              style={{ height: 44, borderRadius: 8, fontSize: 14 }}
              type="submit"
            >
              Sign in to dashboard
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

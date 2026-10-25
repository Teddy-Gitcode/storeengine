import { NextResponse } from 'next/server';
import { getNotifications } from '@/lib/admin-api';

// The drawer is a client component in the shell, so it needs somewhere to
// fetch from; `lib/admin-api` is server-only (it reads the auth cookie).
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return NextResponse.json(await getNotifications());
  } catch {
    // A backend without the endpoint yet shouldn't break the shell.
    return NextResponse.json({ results: [], count: 0 });
  }
}

'use client';

import { AlertTriangle } from 'lucide-react';

/* A failed fetch used to surface as whatever each page happened to catch —
   a red paragraph here, null tiles there, an unhandled throw somewhere else. */
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="ak-card flex flex-col items-center gap-3 p-10 text-center">
      <AlertTriangle size={26} style={{ color: 'var(--error)' }} />
      <p className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>
        Could not load this page
      </p>
      <p className="text-xs" style={{ color: 'var(--text-3)' }}>
        The admin API did not answer. Check it is running, then try again.
      </p>
      <button type="button" onClick={reset} className="ak-btn-secondary" style={{ borderRadius: 9999 }}>
        Try again
      </button>
    </div>
  );
}

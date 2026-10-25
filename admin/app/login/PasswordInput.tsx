'use client';

import { useState } from 'react';
import { Eye, EyeOff, KeyRound } from 'lucide-react';

export default function PasswordInput() {
  const [show, setShow] = useState(false);

  return (
    <label className="block">
      <span className="text-xs font-semibold" style={{ color: 'var(--text-2)' }}>Password</span>
      <div className="relative mt-1">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-3)' }}>
          <KeyRound size={16} />
        </span>
        <input
          name="password"
          type={show ? 'text' : 'password'}
          className="ak-input w-full"
          style={{ height: 44, borderRadius: 8, paddingLeft: 36, paddingRight: 44 }}
          autoComplete="current-password"
          required
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? 'Hide password' : 'Show password'}
          className="absolute right-1 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded"
          style={{ color: 'var(--text-3)' }}
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </label>
  );
}

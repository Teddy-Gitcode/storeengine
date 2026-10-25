'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

type Theme = 'light' | 'dark';

/**
 * Light/dark toggle for the admin. The no-FOUC script in the root layout
 * resolves and stamps `data-theme` before paint; this reflects and updates it,
 * persisting the explicit choice under `admin-theme`.
 */
export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const current = document.documentElement.getAttribute('data-theme') as Theme | null;
    setTheme(current ?? 'light');
  }, []);

  function toggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem('admin-theme', next);
    } catch {
      /* private mode — best effort */
    }
  }

  const isDark = theme === 'dark';
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      title="Toggle theme"
      className="ms-suite-icon"
    >
      {theme === null ? <span style={{ width: 18, height: 18 }} /> : isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}

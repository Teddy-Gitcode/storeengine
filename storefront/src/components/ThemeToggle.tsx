"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "light" | "dark";

/**
 * Light/dark toggle. Default is light; dark is opt-in only (the OS preference
 * is intentionally not followed). The no-FOUC script applies a saved
 * `data-theme` before paint; this reflects and updates it.
 */
export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const saved = document.documentElement.getAttribute("data-theme") as Theme | null;
    setTheme(saved ?? "light");
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("theme", next);
    } catch {
      /* private mode — best effort */
    }
  }

  // Avoid a hydration mismatch: render a stable placeholder until mounted.
  const isDark = theme === "dark";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title="Toggle theme"
      className="grid h-9 w-9 place-items-center rounded-md text-ink-muted hover:text-brand hover:bg-line/5 transition-colors"
    >
      {theme === null ? (
        <span className="h-[18px] w-[18px]" />
      ) : isDark ? (
        <Sun size={18} />
      ) : (
        <Moon size={18} />
      )}
    </button>
  );
}

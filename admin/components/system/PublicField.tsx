'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';

/**
 * An identifier somebody has to paste somewhere else — a project id, a webhook
 * URL, a public key. Monospaced so a character can be checked by eye, with a
 * copy button because the alternative is selecting 60 characters by hand and
 * getting it wrong.
 *
 * The secret equivalent is `SecretField`, which never renders its value until
 * asked. Anything that is genuinely a credential belongs there, not here.
 */
export default function PublicField({
  label,
  name,
  defaultValue = '',
  placeholder,
  help,
  readOnly = false,
}: {
  label: string;
  name?: string;
  defaultValue?: string;
  placeholder?: string;
  help?: string;
  readOnly?: boolean;
}) {
  const [value, setValue] = useState(defaultValue);
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  async function copy() {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      /* Clipboard blocked (insecure origin, denied permission) — the value is
         on screen and selectable, so say nothing rather than throw. */
      return;
    }
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1500);
  }

  return (
    <label className="flex flex-col gap-1.5">
      <span className="ak-field-label">{label}</span>
      <span className="relative flex items-center">
        <input
          name={name}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          readOnly={readOnly}
          spellCheck={false}
          autoComplete="off"
          className="ak-input w-full font-mono text-[13px]"
          style={{ height: 48, borderRadius: 9999, padding: '0 52px 0 18px' }}
        />
        <button
          type="button"
          onClick={copy}
          disabled={!value}
          aria-label={`Copy ${label}`}
          title={value ? `Copy ${label}` : 'Nothing to copy'}
          className="absolute right-2 grid h-9 w-9 place-items-center rounded-full transition-colors hover:bg-[var(--surface-2)] disabled:cursor-not-allowed disabled:opacity-40"
          style={{ color: copied ? 'var(--brand)' : 'var(--text-3)' }}
        >
          {copied ? <Check size={15} /> : <Copy size={15} />}
        </button>
      </span>
      {/* Announced rather than only shown, so the copy is confirmed to a
          screen reader too — the icon swap is invisible to one. */}
      <span aria-live="polite" className="sr-only">{copied ? 'Copied' : ''}</span>
      {help && <span className="ak-help">{help}</span>}
    </label>
  );
}

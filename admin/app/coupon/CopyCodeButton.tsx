'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export default function CopyCodeButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API unavailable (e.g. non-secure context) — silently ignore.
    }
  }

  return (
    <button
      className={`inline-flex items-center justify-center cursor-pointer font-bold focus:outline-none rounded-lg hover:bg-gray-100 h-8 w-8 p-0 transition-colors ${
        copied ? 'text-primary' : 'text-light-primary-text hover:text-primary'
      }`}
      title={copied ? 'Copied!' : 'Copy code'}
      type="button"
      onClick={copy}
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
    </button>
  );
}

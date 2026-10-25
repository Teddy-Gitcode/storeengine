'use client';

import { useEffect, useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { uploadMediaAction } from './uploadAction';

/**
 * Image URL input with an Upload button: pick a file and the field fills
 * itself with the hosted URL. Pasting an external URL (e.g. Cloudinary)
 * works exactly the same as before.
 */
export default function MediaUrlField({
  name,
  label,
  defaultValue,
}: {
  name: string;
  label: string;
  defaultValue?: string;
}) {
  const [value, setValue] = useState(defaultValue ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // A link picker in the same form can hand over a picture (a category's).
  useEffect(() => {
    const form = inputRef.current?.form;
    if (!form) return;
    const take = (e: Event) => {
      const detail = (e as CustomEvent<{ name?: string; url?: string }>).detail;
      if (detail?.name === name && detail.url) setValue(detail.url);
    };
    form.addEventListener('use-picture', take);
    return () => form.removeEventListener('use-picture', take);
  }, [name]);

  async function onFile(file: File) {
    setBusy(true);
    setError(null);
    const data = new FormData();
    data.append('file', file);
    const url = await uploadMediaAction(data);
    setBusy(false);
    if (url) setValue(url);
    else setError('Upload failed — try again or paste a URL.');
  }

  return (
    <label className="block text-[11px] font-semibold font-public-sans uppercase tracking-wide text-light-secondary-text">
      {label}
      <div className="mt-1 flex gap-2">
        <input
          ref={inputRef}
          name={name}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Paste an image URL (Cloudinary etc.), or use Upload"
          className="flex-1 h-10 rounded-full border border-gray-500/20 bg-surface px-4 text-sm font-public-sans font-normal normal-case tracking-normal text-light-primary-text placeholder:text-light-disabled-text focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
          className="rounded-full inline-flex items-center gap-1.5 justify-center cursor-pointer font-bold font-public-sans normal-case tracking-normal transition-colors focus:outline-none border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 h-10 text-sm leading-6 whitespace-nowrap"
        >
          <Upload size={13} />
          {busy ? 'Uploading…' : 'Upload'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFile(file);
            e.target.value = '';
          }}
        />
      </div>
      {value && /\.(png|jpe?g|webp|gif|avif|svg)(\?|$)/i.test(value) && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={value} alt="" className="mt-2 h-16 rounded-md object-cover" />
      )}
      {error && <p className="mt-1 text-[11px] font-public-sans normal-case tracking-normal text-error">{error}</p>}
    </label>
  );
}

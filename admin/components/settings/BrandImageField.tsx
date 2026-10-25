'use client';

import { useRef, useState } from 'react';
import { ImageUp, Trash2 } from 'lucide-react';
import { uploadMediaAction } from '@/app/content/uploadAction';

/* The store's logo (or favicon), uploaded rather than typed.

   It used to be a "Logo URL" text box, which meant hosting the file somewhere
   first and pasting its address. This uploads it to the store's own media,
   fills the same `logo_url` field the card posts, and shows the result on a
   light and a dark tile, since the storefront and the app put the logo on
   both. Pasting a URL still works for a logo that lives elsewhere. */
export default function BrandImageField({
  name,
  label,
  defaultValue,
  help,
  square = false,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  help?: string;
  /** Favicons are square; logos are usually wide. */
  square?: boolean;
}) {
  const [value, setValue] = useState(defaultValue ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onFile(file: File) {
    if (!file.type.startsWith('image/')) {
      setError('Choose an image — PNG, JPG, WebP or SVG.');
      return;
    }
    // The file passes through the admin's own server on its way to the API,
    // and that hop takes at most 4 MB (next.config's serverActions limit, and
    // about Vercel's own). Said here, rather than as a vague "upload failed".
    if (file.size > 4 * 1024 * 1024) {
      setError(`That file is ${(file.size / 1024 / 1024).toFixed(1)} MB — use one under 4 MB. A logo rarely needs more than 200 KB.`);
      return;
    }
    setBusy(true);
    setError(null);
    const data = new FormData();
    data.append('file', file);
    data.append('folder', 'branding');
    const url = await uploadMediaAction(data);
    setBusy(false);
    if (url) setValue(url);
    else setError('Upload failed — the store may be restarting after an update. Try again in a few seconds, or paste a URL below.');
  }

  const box = square ? 'h-16 w-16' : 'h-16 w-40';

  return (
    <div className="flex flex-col gap-1.5">
      <span className="ak-field-label">{label}</span>
      <div className="flex flex-wrap items-center gap-3">
        {/* The same image on light and dark, as shoppers will see it. */}
        {(['bg-white', 'bg-[#121212]'] as const).map((bg) => (
          <div
            key={bg}
            className={`${box} ${bg} flex items-center justify-center overflow-hidden rounded-2xl border border-gray-500/20 p-2`}
          >
            {value ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={value} alt="" className="max-h-full max-w-full object-contain" />
            ) : (
              <span className="text-[11px] text-light-disabled-text">No image</span>
            )}
          </div>
        ))}
        <div className="flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
            data-manage
            className="inline-flex h-10 items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-bold text-white transition-colors hover:opacity-90 disabled:opacity-60"
          >
            <ImageUp size={15} />
            {busy ? 'Uploading…' : value ? 'Replace' : 'Upload'}
          </button>
          {value && (
            <button
              type="button"
              onClick={() => setValue('')}
              data-manage
              className="inline-flex h-10 items-center gap-1.5 rounded-full border border-gray-300 px-4 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-50"
            >
              <Trash2 size={14} />
              Remove
            </button>
          )}
        </div>
      </div>
      <input
        name={name}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="…or paste an image URL"
        className="ak-input"
        style={{ height: 40, borderRadius: 9999, padding: '0 18px', fontSize: 13 }}
      />
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = '';
        }}
      />
      {error ? <span className="ak-help text-error">{error}</span> : help && <span className="ak-help">{help}</span>}
    </div>
  );
}

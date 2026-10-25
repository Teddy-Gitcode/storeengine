'use client';

// Pixel match for the template's pill "Export" button
// (`rounded-full bg-primary text-white px-4 py-1 h-7.5 text-[13px]`).
// Downloads the rows currently on screen as CSV — real data only.
function escapeCell(value: string | number | null | undefined): string {
  const s = String(value ?? '');
  return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}

export default function OrderExportButton({
  filename,
  headers,
  rows,
}: {
  filename: string;
  headers: string[];
  rows: (string | number | null | undefined)[][];
}) {
  function download() {
    const csv = [headers, ...rows].map((row) => row.map(escapeCell).join(',')).join('\n');
    const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      type="button"
      onClick={download}
      disabled={rows.length === 0}
      className="rounded-full inline-flex items-center justify-center cursor-pointer font-bold transition-colors focus:outline-none disabled:cursor-not-allowed bg-primary text-white hover:bg-primary-dark disabled:bg-[rgba(145,158,171,0.24)] disabled:text-[rgba(145,158,171,0.80)] disabled:opacity-100 px-4 py-1 h-[30px] text-[13px] leading-[22px] whitespace-nowrap"
    >
      Export
    </button>
  );
}

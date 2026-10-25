'use client';

import { Download } from 'lucide-react';

function escapeCell(value: string | number | null | undefined): string {
  const s = String(value ?? '');
  return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}

export default function ExportCsvButton({
  filename,
  headers,
  rows,
  label = 'Export CSV',
}: {
  filename: string;
  headers: string[];
  rows: (string | number | null | undefined)[][];
  label?: string;
}) {
  function download() {
    const csv = [headers, ...rows].map(row => row.map(escapeCell).join(',')).join('\n');
    const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button className="ak-btn-secondary" onClick={download} disabled={rows.length === 0}>
      <Download size={13} />{label}
    </button>
  );
}

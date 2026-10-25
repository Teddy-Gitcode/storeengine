'use client';

import { Printer } from 'lucide-react';

export default function PrintButton() {
  return (
    <button className="ak-btn-primary" onClick={() => window.print()}>
      <Printer size={13} />Print
    </button>
  );
}

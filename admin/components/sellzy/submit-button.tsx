'use client';

import { useFormStatus } from 'react-dom';

/**
 * Submit button that disables itself while its `<form action={…}>` is in
 * flight. Server-rendered forms need this as a client island — without it a
 * second click posts the form again and creates a duplicate record.
 */
export default function SubmitButton({
  className = 'ak-btn-primary',
  pendingLabel = 'Saving…',
  children,
}: {
  className?: string;
  pendingLabel?: string;
  children: React.ReactNode;
}) {
  const { pending } = useFormStatus();
  return (
    <button data-manage type="submit" disabled={pending} className={className}>
      {pending ? pendingLabel : children}
    </button>
  );
}

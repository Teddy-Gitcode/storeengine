'use client';

import { useTransition } from 'react';

// Visual switch matching the Sellzy template's headlessui `Switch` (marketing-tools.html),
// wired to the campaign's real activate/pause server actions.
export default function MarketingStatusToggle({
  active,
  disabled,
  onActivate,
  onPause,
}: {
  active: boolean;
  disabled?: boolean;
  onActivate: () => Promise<void>;
  onPause: () => Promise<void>;
}) {
  const [pending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      await (active ? onPause() : onActivate());
    });
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      disabled={disabled || pending}
      onClick={toggle}
      title={active ? 'Pause campaign' : 'Activate campaign'}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 ${
        active ? 'bg-primary' : 'bg-gray-300'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-all duration-200 ease-in-out ${
          active ? 'translate-x-4' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}

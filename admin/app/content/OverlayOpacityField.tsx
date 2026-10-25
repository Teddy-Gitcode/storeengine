'use client';

import { useState } from 'react';

/**
 * How strongly the slide's gradient veils its background reel.
 *
 * Only has an effect on a slide that has a reel — with no video the slide is
 * its gradient, and there is nothing underneath to show through.
 */
export default function OverlayOpacityField({ defaultValue }: { defaultValue: number }) {
  const [value, setValue] = useState(defaultValue);

  return (
    <label className="space-y-1">
      <span
        className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide"
        style={{ color: 'var(--text-3)' }}
      >
        <span>Reel overlay</span>
        <span className="font-mono normal-case" style={{ color: 'var(--text-2)' }}>{value}%</span>
      </span>
      <span className="flex items-center gap-3 rounded-md border border-[var(--border)] bg-surface px-3 py-2">
        <input
          name="video_overlay_opacity"
          type="range"
          min={0}
          max={100}
          step={5}
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          className="h-1.5 w-full cursor-pointer accent-[var(--brand)]"
        />
      </span>
      <span className="block text-[11px]" style={{ color: 'var(--text-3)' }}>
        0% shows the raw footage, 100% hides it behind the gradient. Lower it for a
        subtle reel; raise it if the headline is hard to read over the video.
      </span>
    </label>
  );
}

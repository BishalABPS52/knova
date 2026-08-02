// components/feed/TrackedCard.tsx
'use client';

import { ReactNode } from 'react';
import { useDwellTracker } from '@/hooks/useDwellTracker';
import type { TelemetrySurface } from '@/lib/telemetry';

interface TrackedCardProps {
  postId: string;
  /** Rank slot the reader saw this at, so position bias can be modelled later. */
  feedPosition?: number;
  surface?: TelemetrySurface;
  enabled?: boolean;
  children: ReactNode;
}

/**
 * Wraps one feed card in a dwell-measured element.
 *
 * Exists because hooks can't be called from inside a `.map()` — the tracker
 * needs a component boundary per card. Renders a plain div, so the parent's
 * `space-y` / `gap` spacing is unaffected.
 */
export default function TrackedCard({
  postId,
  feedPosition,
  surface = 'feed',
  enabled = true,
  children,
}: TrackedCardProps) {
  const ref = useDwellTracker({ postId, feedPosition, surface, enabled });
  return <div ref={ref}>{children}</div>;
}

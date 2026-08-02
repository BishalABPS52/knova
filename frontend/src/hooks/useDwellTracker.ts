// hooks/useDwellTracker.ts
'use client';

import { useEffect, useState } from 'react';
import { telemetry, TelemetrySurface } from '@/lib/telemetry';

/** Fraction of the card that must be on screen for it to count as being read. */
const VISIBLE_RATIO = 0.5;

/**
 * How often visible time is folded into the buffer. Without this a card that
 * stays on screen for minutes would contribute nothing until it scrolled away.
 */
const SETTLE_MS = 2_000;

/**
 * A card taller than the viewport can never occupy 50% *of itself*, so the ratio
 * alone would never mark it read. These extra thresholds keep callbacks coming
 * as such a card scrolls through, and the viewport-share test below decides.
 */
const THRESHOLDS = [0, 0.25, 0.5, 0.75, 1];

interface DwellOptions {
  postId: string;
  feedPosition?: number;
  surface?: TelemetrySurface;
  /** Off for mock-data screens, so placeholder ids never reach the API. */
  enabled?: boolean;
}

/**
 * Measure how long a post is actually on screen and report it as dwell.
 *
 * Returns a ref callback to attach to the element wrapping the card. Time only
 * accrues while the element is visible *and* the tab is foregrounded — an
 * IntersectionObserver keeps reporting a card as intersecting in a backgrounded
 * tab, so without the visibility check an abandoned tab would bank hours of
 * dwell the user never spent.
 */
export function useDwellTracker({
  postId,
  feedPosition,
  surface = 'feed',
  enabled = true,
}: DwellOptions) {
  // State, not a ref: the effect has to re-run once the node actually attaches.
  const [node, setNode] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!node || !enabled || !postId) return;

    telemetry.trackImpression(postId, feedPosition, surface);

    let visibleSince: number | null = null;
    let onScreen = false;

    const settle = () => {
      if (visibleSince === null) return;
      const now = performance.now();
      telemetry.addDwell(postId, now - visibleSince);
      visibleSince = now;
    };

    const start = () => {
      if (visibleSince === null && document.visibilityState === 'visible') {
        visibleSince = performance.now();
      }
    };

    const stop = () => {
      settle();
      visibleSince = null;
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const viewportHeight = entry.rootBounds?.height ?? 0;
          const viewportShare = viewportHeight
            ? entry.intersectionRect.height / viewportHeight
            : 0;

          onScreen =
            entry.isIntersecting &&
            (entry.intersectionRatio >= VISIBLE_RATIO || viewportShare >= VISIBLE_RATIO);

          if (onScreen) start();
          else stop();
        }
      },
      { threshold: THRESHOLDS },
    );
    observer.observe(node);

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (onScreen) start();
      } else {
        stop();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    const ticker = window.setInterval(settle, SETTLE_MS);

    return () => {
      window.clearInterval(ticker);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      observer.disconnect();
      stop();
    };
  }, [node, enabled, postId, feedPosition, surface]);

  return setNode;
}

// In-memory home-feed cache, so navigating away from the feed and back doesn't
// re-fetch and flash the skeleton every time (the "keep the feed where you left
// it" behaviour social apps have). It's a plain module singleton: it survives
// client-side navigation (the module stays loaded) but resets on a hard reload,
// which is exactly when a fresh feed is wanted. Cleared on logout so the next
// user never sees the previous one's personalized feed.

import type { FeedItem } from "@/data/feedData";

export interface FeedSnapshot {
  userId: string | null;
  items: FeedItem[];
  seenIds: string[];
  page: number;
  hasNext: boolean;
  scrollY: number;
}

let snapshot: FeedSnapshot | null = null;

export const feedCache = {
  get(): FeedSnapshot | null {
    return snapshot;
  },
  set(next: FeedSnapshot): void {
    snapshot = next;
  },
  /** Update just the scroll position without rebuilding the whole snapshot. */
  setScroll(scrollY: number): void {
    if (snapshot) snapshot.scrollY = scrollY;
  },
  clear(): void {
    snapshot = null;
  },
};

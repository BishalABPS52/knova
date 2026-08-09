// In-memory cache for the explore page, so navigating away and back restores it
// instead of refetching and flashing the loader (same pattern as feedCache). A
// plain module singleton: survives client-side navigation, resets on a hard
// reload, cleared on logout.

import type { Post, TopicSection } from "@/types/post";

export interface ExploreSnapshot {
  userId: string | null;
  forYou: Post[];
  sections: TopicSection[];
  pages: Record<string, number>;
  activeTab: string;
  scrollY: number;
}

let snapshot: ExploreSnapshot | null = null;

export const exploreCache = {
  get(): ExploreSnapshot | null {
    return snapshot;
  },
  set(next: ExploreSnapshot): void {
    snapshot = next;
  },
  setScroll(scrollY: number): void {
    if (snapshot) snapshot.scrollY = scrollY;
  },
  clear(): void {
    snapshot = null;
  },
};

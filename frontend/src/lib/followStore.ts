// Global follow state, shared by every FollowButton on the app. Keeping it in one
// external store (rather than per-post `is_following`) means following a creator
// on one card instantly updates every other button for that creator, and the
// state survives navigation and the cached feed/explore views. Hydrated once from
// GET /creator/following after login; cleared on logout.

import { useSyncExternalStore } from "react";

let followed = new Set<string>();
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export const followStore = {
  isFollowing(creatorId: string): boolean {
    return followed.has(creatorId);
  },
  set(creatorId: string, following: boolean): void {
    if (following) followed.add(creatorId);
    else followed.delete(creatorId);
    emit();
  },
  /** Merge a set of followed creator ids in (e.g. from the server on load). */
  hydrate(creatorIds: string[]): void {
    let changed = false;
    for (const id of creatorIds) {
      if (!followed.has(id)) {
        followed.add(id);
        changed = true;
      }
    }
    if (changed) emit();
  },
  clear(): void {
    followed = new Set();
    emit();
  },
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

/** Subscribe a component to whether the current user follows `creatorId`. */
export function useFollowing(creatorId?: string): boolean {
  return useSyncExternalStore(
    followStore.subscribe,
    () => (creatorId ? followStore.isFollowing(creatorId) : false),
    () => false,
  );
}

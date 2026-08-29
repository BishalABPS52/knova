'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { followCreator, unfollowCreator } from '@/lib/creator';
import { followStore, useFollowing } from '@/lib/followStore';
import { cn } from '@/lib/utils';

interface FollowButtonProps {
  /** Creator profile id. Omit on mock/demo screens to toggle locally only. */
  creatorId?: string;
  author?: string;
  /** Hidden entirely for your own posts. */
  hidden?: boolean;
  className?: string;
}

/**
 * Compact follow pill for post headers. Reads follow state from the shared
 * `followStore`, so every button for the same creator stays in sync and the
 * state survives navigation. Updates optimistically and rolls back on failure.
 */
export default function FollowButton({
  creatorId,
  author,
  hidden = false,
  className,
}: FollowButtonProps) {
  const storeFollowing = useFollowing(creatorId);
  // Demo screens without a real creator id fall back to purely local state.
  const [localFollowing, setLocalFollowing] = useState(false);
  const [pending, setPending] = useState(false);

  if (hidden) return null;

  const following = creatorId ? storeFollowing : localFollowing;

  const toggle = async (event: React.MouseEvent) => {
    // Headers are often inside clickable cards.
    event.preventDefault();
    event.stopPropagation();
    if (pending) return;

    const next = !following;

    if (!creatorId) {
      setLocalFollowing(next); // demo data: local state is all there is
      return;
    }

    followStore.set(creatorId, next); // optimistic, updates every button at once
    setPending(true);
    try {
      await (next ? followCreator(creatorId) : unfollowCreator(creatorId));
    } catch {
      followStore.set(creatorId, !next);
      toast.error(next ? 'Could not follow, try again' : 'Could not unfollow, try again');
    } finally {
      setPending(false);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={following}
      aria-label={
        following ? `Unfollow ${author ?? 'this creator'}` : `Follow ${author ?? 'this creator'}`
      }
      className={cn(
        'shrink-0 rounded-full px-3 py-1 text-[12px] font-bold transition-all active:scale-95',
        'disabled:opacity-60 disabled:cursor-not-allowed',
        following
          ? 'border border-[#d9d9d9] text-on-surface-variant hover:bg-[#f5f5f5]'
          : 'bg-[#f36710] text-white hover:bg-[#d4580e] shadow-sm',
        className,
      )}
    >
      {following ? 'Following' : 'Follow'}
    </button>
  );
}

'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { followCreator, unfollowCreator } from '@/lib/creator';
import { cn } from '@/lib/utils';

interface FollowButtonProps {
  /** Creator profile id. Omit on mock/demo screens to toggle locally only. */
  creatorId?: string;
  author?: string;
  initialFollowing?: boolean;
  /** Hidden entirely for your own posts. */
  hidden?: boolean;
  className?: string;
}

/**
 * Compact follow pill for post headers. Updates optimistically and rolls back
 * if the request fails, so the count in the header never lies for long.
 */
export default function FollowButton({
  creatorId,
  author,
  initialFollowing = false,
  hidden = false,
  className,
}: FollowButtonProps) {
  const [following, setFollowing] = useState(initialFollowing);
  const [pending, setPending] = useState(false);

  if (hidden) return null;

  const toggle = async (event: React.MouseEvent) => {
    // Headers are often inside clickable cards.
    event.preventDefault();
    event.stopPropagation();
    if (pending) return;

    const next = !following;
    setFollowing(next);

    if (!creatorId) return;   // demo data: local state is all there is

    setPending(true);
    try {
      await (next ? followCreator(creatorId) : unfollowCreator(creatorId));
    } catch {
      setFollowing(!next);
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

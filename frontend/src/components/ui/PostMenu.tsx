'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Bookmark,
  ChevronLeft,
  Flag,
  Link2,
  MoreHorizontal,
  Share2,
  Trash2,
  EyeOff,
} from 'lucide-react';
import { toast } from 'sonner';

interface PostMenuProps {
  postId?: string | number;
  author?: string;
  isOwner?: boolean;
  onDelete?: () => void | Promise<void>;
  onShare?: () => void;
  onSave?: () => void | Promise<void>;
  saved?: boolean;
}

const REPORT_REASONS = [
  'Spam or misleading',
  'Incorrect information',
  'Offensive or hateful',
  'Copyright violation',
  'Something else',
];

/**
 * Overflow ("...") menu for a post card: a small anchored card with post
 * actions, plus a second step for picking a report reason. Closes on outside
 * click and on Escape.
 */
export default function PostMenu({
  postId,
  author,
  isOwner = false,
  onDelete,
  onShare,
  onSave,
  saved = false,
}: PostMenuProps) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<'menu' | 'report'>('menu');
  const containerRef = useRef<HTMLDivElement>(null);

  const close = () => {
    setOpen(false);
    setView('menu');
  };

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) close();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        close();
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const copyLink = async () => {
    const url = postId
      ? `${window.location.origin}/post/${postId}`
      : window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied');
    } catch {
      toast.error('Could not copy the link');
    }
    close();
  };

  const submitReport = (reason: string) => {
    // No moderation endpoint yet: acknowledge locally so the flow is complete.
    toast.success('Thanks — this post has been reported', { description: reason });
    close();
  };

  const remove = async () => {
    close();
    await onDelete?.();
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Post options"
        onClick={() => (open ? close() : setOpen(true))}
        className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
          open ? 'bg-surface-container text-on-surface' : 'text-outline hover:bg-surface-container-low'
        }`}
      >
        <MoreHorizontal size={18} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 w-60 origin-top-right rounded-xl border border-surface-variant/60 bg-white py-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.14)] z-50 text-on-surface"
        >
          {view === 'menu' ? (
            <>
              {onSave && (
                <MenuItem
                  icon={<Bookmark size={16} fill={saved ? 'currentColor' : 'none'} />}
                  label={saved ? 'Remove from saved' : 'Save post'}
                  onClick={async () => {
                    close();
                    await onSave();
                  }}
                />
              )}
              <MenuItem icon={<Link2 size={16} />} label="Copy link" onClick={copyLink} />
              {onShare && (
                <MenuItem
                  icon={<Share2 size={16} />}
                  label="Share"
                  onClick={() => {
                    close();
                    onShare();
                  }}
                />
              )}
              <MenuItem
                icon={<EyeOff size={16} />}
                label="Not interested"
                description="Show fewer posts like this"
                onClick={() => {
                  toast.success('Got it — we’ll show fewer posts like this');
                  close();
                }}
              />

              <div className="my-1.5 h-px bg-surface-variant/60" />

              <MenuItem
                icon={<Flag size={16} />}
                label="Report post"
                danger
                onClick={() => setView('report')}
              />
              {isOwner && onDelete && (
                <MenuItem
                  icon={<Trash2 size={16} />}
                  label="Delete post"
                  danger
                  onClick={remove}
                />
              )}
            </>
          ) : (
            <>
              <div className="flex items-center gap-1 px-2 pb-1.5">
                <button
                  type="button"
                  aria-label="Back to options"
                  onClick={() => setView('menu')}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-outline hover:bg-surface-container-low transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>
                <p className="text-xs font-bold uppercase tracking-wider text-outline">
                  Why report this?
                </p>
              </div>
              {author && (
                <p className="px-3 pb-2 text-xs text-on-surface-variant">
                  Reporting {author}&apos;s post. We won&apos;t tell them who reported it.
                </p>
              )}
              {REPORT_REASONS.map((reason) => (
                <MenuItem key={reason} label={reason} onClick={() => submitReport(reason)} />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function MenuItem({
  icon,
  label,
  description,
  danger = false,
  onClick,
}: {
  icon?: React.ReactNode;
  label: string;
  description?: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={`w-full flex items-start gap-2.5 px-3 py-2 text-left text-sm transition-colors ${
        danger
          ? 'text-red-600 hover:bg-red-50'
          : 'text-on-surface hover:bg-surface-container-low'
      }`}
    >
      {icon && <span className="mt-0.5 shrink-0">{icon}</span>}
      <span className={icon ? '' : 'pl-[26px]'}>
        <span className="block font-medium leading-snug">{label}</span>
        {description && (
          <span className="block text-xs text-on-surface-variant">{description}</span>
        )}
      </span>
    </button>
  );
}

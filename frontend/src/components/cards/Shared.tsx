// components/cards/Shared.tsx
'use client';

import { useState, useEffect, type ReactNode } from 'react';
import { ArrowUp, ArrowDown, MessageSquare, Share2, Bookmark, Loader2 } from 'lucide-react';
import { PostService } from '@/lib/posts';
import { Comment } from '@/types/post';
import { useAuth } from '@/hooks/useAuth';
import { CommentItem } from '@/components/post/commentItem';
import FollowButton from '@/components/ui/FollowButton';
import PostMenu from '@/components/ui/PostMenu';
import { toast } from 'sonner';

interface FeedActionsProps {
  upvotes: number | string;
  downvotes: number;
  comments: number;
  onShare?: () => void;
  onCommentToggle?: () => void;
  showComments?: boolean;
  onVote?: (value: number) => Promise<void>;
  onSave?: () => Promise<void>;
  userVote?: number;
  userSaved?: boolean;
  postId?: string;
}

interface ReelActionsProps {
  upvotes: number | string;
  comments: number;
  onCommentToggle?: () => void;
  postId?: string | number;
  /** Server state, so a vote/save survives a reload instead of resetting to 0. */
  userVote?: number;
  userSaved?: boolean;
  onVote?: (id: string, value: number) => Promise<void>;
  onSave?: (id: string) => Promise<void>;
}

export function FeedActions({
  upvotes,
  downvotes,
  comments,
  onShare,
  onCommentToggle,
  showComments,
  onVote,
  onSave,
  userVote = 0,
  userSaved = false,
}: FeedActionsProps) {
  const [isSaving, setIsSaving] = useState(false);

  const handleVote = async (value: number) => {
    if (!onVote) return;
    await onVote(value);
  };

  const handleSave = async () => {
    if (!onSave || isSaving) return;
    setIsSaving(true);
    try {
      await onSave();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-4 border-t border-gray-100 flex justify-between items-center bg-gray-50/30">
      <div className="flex items-center gap-4 md:gap-6">
        <div className="flex items-center gap-1 bg-white border border-gray-200 px-3 py-1.5 rounded-full shadow-sm">
          <button
            onClick={() => handleVote(1)}
            className={`text-gray-500 hover:text-orange-600 transition-colors ${userVote === 1 ? 'text-orange-600' : ''}`}
          >
            <ArrowUp size={18} />
          </button>
          <span className="font-bold text-sm text-gray-700 mx-1">{upvotes}</span>
          <div className="w-px h-3 bg-gray-300 mx-1"></div>
          <button
            onClick={() => handleVote(-1)}
            className={`text-gray-500 hover:text-red-600 transition-colors ${userVote === -1 ? 'text-red-600' : ''}`}
          >
            <ArrowDown size={18} />
          </button>
          <span className="font-bold text-sm text-gray-700 ml-1">{downvotes}</span>
        </div>

        <button
          onClick={onCommentToggle}
          className={`flex items-center gap-2 py-2 px-3 rounded-lg transition-colors ${showComments ? 'text-orange-600 bg-orange-50' : 'text-gray-500 hover:bg-gray-100'}`}
        >
          <MessageSquare size={18} className={showComments ? 'fill-orange-200' : ''} />
          <span className="font-medium text-sm">{comments}</span>
        </button>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={handleSave}
          className={`p-2 rounded-full transition-colors ${userSaved ? 'text-orange-600 bg-orange-50' : 'text-gray-500 hover:text-orange-600 hover:bg-orange-50'}`}
          disabled={isSaving}
        >
          <Bookmark size={18} className={userSaved ? 'fill-orange-600' : ''} />
        </button>
        <button
          onClick={onShare}
          className="text-gray-500 hover:text-orange-600 hover:bg-orange-50 p-2 rounded-full transition-colors"
        >
          <Share2 size={18} />
        </button>
      </div>
    </div>
  );
}

interface ExploreCardShellProps {
  id?: string | number;
  author?: string;
  /** Creator profile id, for the follow button. */
  creatorId?: string;
  /** The tag/type chip rendered above the content. */
  chip?: ReactNode;
  upvotes?: number | string;
  comments?: number;
  userVote?: number;
  userSaved?: boolean;
  isOwner?: boolean;
  onVote?: (id: string, value: number) => Promise<void>;
  onSave?: (id: string) => Promise<void>;
  onShare?: (id: string | number) => void;
  onDelete?: (id: string) => Promise<void>;
  children: ReactNode;
}

/**
 * Chrome shared by every explore-grid card: an author header (avatar + name +
 * follow + overflow menu with copy-link/share/save/report/delete) and a footer
 * action bar (upvote, comment, share, save) with inline comments. Wraps each
 * card type's own interactive content (`children`). Keeps optimistic vote/save
 * state seeded from the server so taps react instantly and roll back on failure.
 */
export function ExploreCardShell({
  id,
  author,
  creatorId,
  chip,
  upvotes,
  comments = 0,
  userVote,
  userSaved,
  isOwner = false,
  onVote,
  onSave,
  onShare,
  onDelete,
  children,
}: ExploreCardShellProps) {
  const [vote, setVote] = useState<0 | 1 | -1>((userVote as 0 | 1 | -1) || 0);
  const [saved, setSaved] = useState(!!userSaved);
  const [showComments, setShowComments] = useState(false);
  const [commentCount, setCommentCount] = useState(comments);

  const label =
    typeof upvotes === 'number' ? upvotes + (vote === 1 ? 1 : 0) - (userVote === 1 ? 1 : 0) : upvotes;

  const handleUpvote = async () => {
    const previous = vote;
    setVote(vote === 1 ? 0 : 1);
    if (!id || !onVote) return;
    try {
      await onVote(String(id), 1);
    } catch {
      setVote(previous);
    }
  };

  const handleSave = async () => {
    const next = !saved;
    setSaved(next);
    if (!id || !onSave) return;
    try {
      await onSave(String(id));
    } catch {
      setSaved(!next);
    }
  };

  const handleDelete = onDelete && id ? () => onDelete(String(id)) : undefined;

  return (
    <div className="bg-white rounded-xl border border-[#ece9e7] hover:shadow-md hover:border-[#e1bfb1] transition-all overflow-hidden">
      <div className="p-4 md:p-5">
        <div className="flex items-center justify-between mb-3 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-full bg-[#f36710] text-white text-[11px] font-bold flex items-center justify-center shrink-0">
              {author?.slice(0, 2).toUpperCase() || 'U'}
            </div>
            <span className="text-[13px] font-semibold text-[#1b1c1c] truncate">{author || 'Unknown'}</span>
            <FollowButton creatorId={creatorId} author={author} hidden={isOwner} />
          </div>
          <PostMenu
            postId={id}
            author={author}
            isOwner={isOwner}
            onShare={onShare && id ? () => onShare(id) : undefined}
            onSave={onSave && id ? handleSave : undefined}
            onDelete={handleDelete}
            saved={saved}
          />
        </div>
        {chip && <div className="mb-2.5">{chip}</div>}
        {children}
      </div>

      <div className="px-4 md:px-5 py-2.5 border-t border-[#f3f1ef] flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={handleUpvote}
            aria-label="Upvote"
            aria-pressed={vote === 1}
            className={`flex items-center gap-1 text-xs font-bold transition-colors ${
              vote === 1 ? 'text-[#f36710]' : 'text-[#8d7165] hover:text-[#f36710]'
            }`}
          >
            <ArrowUp size={16} strokeWidth={2.5} />
            {label}
          </button>
          <button
            onClick={() => setShowComments((v) => !v)}
            aria-label="Comments"
            className={`flex items-center gap-1 text-xs font-bold transition-colors ${
              showComments ? 'text-[#f36710]' : 'text-[#8d7165] hover:text-[#f36710]'
            }`}
          >
            <MessageSquare size={16} />
            {commentCount}
          </button>
          {onShare && (
            <button
              onClick={() => id && onShare(id)}
              aria-label="Share"
              className="text-[#8d7165] hover:text-[#f36710] transition-colors"
            >
              <Share2 size={16} />
            </button>
          )}
        </div>
        <button
          onClick={handleSave}
          aria-label={saved ? 'Remove from saved' : 'Save'}
          aria-pressed={saved}
          className={`transition-colors ${saved ? 'text-[#f36710]' : 'text-[#8d7165] hover:text-[#f36710]'}`}
        >
          <Bookmark size={16} fill={saved ? 'currentColor' : 'none'} />
        </button>
      </div>

      {showComments && (
        <CommentsSection
          show={showComments}
          postId={id}
          onCommentCountChange={(delta) => setCommentCount((c) => Math.max(0, c + delta))}
        />
      )}
    </div>
  );
}

interface CommentsSectionProps {
  show?: boolean;
  postId?: string | number;
  onCommentCountChange?: (delta: number) => void;
}

export function CommentsSection({ show, postId, onCommentCountChange }: CommentsSectionProps) {
  const { user } = useAuth();
  const postService = new PostService();

  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Point the panel at a different post and everything it holds is stale. The
  // reel keeps ONE panel mounted and swaps postId as the reader scrolls, so
  // without this reset it would show the first card's comments forever while
  // submitting replies against whichever card is on screen.
  useEffect(() => {
    setComments([]);
    setHasLoaded(false);
  }, [postId]);

  useEffect(() => {
    if (show && postId && !hasLoaded) {
      loadComments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, postId, hasLoaded]);

  const loadComments = async () => {
    if (!postId) return;
    setIsLoading(true);
    try {
      const response = await postService.getComments(String(postId), 1, 20);
      setComments(response.items);
      setHasLoaded(true);
    } catch (error) {
      console.error('Failed to load comments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!newComment.trim() || !postId) return;
    if (!user) {
      toast.error('Please login to comment');
      return;
    }

    setIsSubmitting(true);
    try {
      const comment = await postService.createComment(String(postId), newComment);
      setComments(prev => [comment, ...prev]);
      setNewComment('');
      onCommentCountChange?.(1);
    } catch (error) {
      console.error('Failed to add comment:', error);
      toast.error('Failed to add comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReply = async (body: string, parentId?: string) => {
    if (!postId) return;
    if (!user) {
      toast.error('Please login to comment');
      return;
    }
    try {
      const reply = await postService.createComment(String(postId), body, parentId);
      setComments(prev =>
        prev.map(c =>
          c.id === parentId ? { ...c, replies: [...(c.replies || []), reply] } : c
        )
      );
      onCommentCountChange?.(1);
    } catch (error) {
      console.error('Failed to add reply:', error);
      toast.error('Failed to add reply');
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;
    try {
      await postService.deleteComment(commentId);
      setComments(prev => prev.filter(c => c.id !== commentId));
      onCommentCountChange?.(-1);
    } catch (error) {
      console.error('Failed to delete comment:', error);
      toast.error('Failed to delete comment');
    }
  };

  if (!show) return null;

  return (
    <div className="p-5 border-t border-gray-100 bg-gray-50/50 animate-in slide-in-from-top-2">
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          </div>
        ) : comments.length === 0 ? (
          <p className="text-sm text-gray-500 text-center italic py-2">
            No comments yet. Be the first to share your thoughts!
          </p>
        ) : (
          comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              onReply={() => {}}
              onDelete={() => handleDelete(comment.id)}
              isOwner={user?.id === comment.user_id}
              depth={0}
              onComment={handleReply}
            />
          ))
        )}
      </div>

      <div className="flex gap-3 mt-5">
        <div className="w-8 h-8 rounded-full bg-orange-500 flex-shrink-0 flex items-center justify-center text-xs font-bold text-white shadow-sm">
          {user?.username?.slice(0, 2).toUpperCase() || 'ME'}
        </div>
        <div className="flex-1 flex gap-2">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder="Add a comment..."
            className="bg-white border border-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 rounded-xl px-4 py-2 text-sm flex-1 outline-none transition-all shadow-sm"
          />
          <button
            onClick={handleSubmit}
            disabled={!newComment.trim() || isSubmitting}
            className="bg-orange-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-orange-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Post
          </button>
        </div>
      </div>
    </div>
  );
}

export function ReelActions({
  upvotes,
  comments,
  onCommentToggle,
  postId,
  userVote,
  userSaved,
  onVote,
  onSave,
}: ReelActionsProps) {
  // Optimistic local state seeded from the server, so the rail reacts instantly
  // and still reflects reality on reload. A failed write rolls back.
  const [vote, setVote] = useState<0 | 1 | -1>((userVote as 0 | 1 | -1) || 0);
  const [saved, setSaved] = useState(!!userSaved);
  // Bumped on every fresh upvote; the value doubles as the React key so rapid
  // taps restart the burst instead of waiting for the previous one to finish.
  const [burst, setBurst] = useState(0);

  // Counts can arrive pre-formatted ("1.2k"), so only nudge real numbers.
  const upvoteLabel =
    typeof upvotes === 'number' ? upvotes + (vote === 1 ? 1 : 0) : upvotes;

  // A single timer owns teardown: relying on animationend is fragile when the
  // icon and its ring finish at different times.
  useEffect(() => {
    if (!burst) return;
    const timer = setTimeout(() => setBurst(0), 900);
    return () => clearTimeout(timer);
  }, [burst]);

  // The API toggles: sending the value that's already set clears it, so setting
  // and clearing both send the same value.
  const persistVote = async (target: 1 | -1) => {
    if (!postId || !onVote) return;
    const previous = vote;
    try {
      await onVote(String(postId), target);
    } catch {
      setVote(previous);   // the handler surfaces the error; just undo the guess
    }
  };

  const handleUpvote = () => {
    const next = vote === 1 ? 0 : 1;
    setVote(next);
    if (next === 1) setBurst((n) => n + 1);   // celebrate the upvote, not the undo
    void persistVote(1);
  };

  const handleDownvote = () => {
    setVote(vote === -1 ? 0 : -1);
    void persistVote(-1);
  };

  const handleSave = async () => {
    const next = !saved;
    setSaved(next);
    if (!postId || !onSave) return;
    try {
      await onSave(String(postId));
    } catch {
      setSaved(!next);
    }
  };

  // Cards are light, so the rail is white-on-dark to stay legible over any of
  // them. No backdrop-blur: its backdrop repaints a frame behind the scroll,
  // which made the rail look like it was drifting away from the card.
  const button =
    'w-11 h-11 rounded-full flex items-center justify-center ' +
    'bg-black/60 text-white ring-1 ring-white/15 ' +
    'shadow-[0_2px_10px_rgba(0,0,0,0.25)] active:scale-90 transition-colors hover:bg-black/75';

  const count =
    'text-white text-[11px] font-semibold [text-shadow:0_1px_3px_rgba(0,0,0,0.7)] tabular-nums';

  return (
    <>
      {/* Upvote celebration: fills the card (which is the screen on mobile),
          floats up and fades. Never intercepts taps. */}
      {burst > 0 && (
        <span key={burst} aria-hidden className="vote-burst">
          <ArrowUp size={112} strokeWidth={2.5} />
        </span>
      )}

      {/* Rendered inside the card element, so it is positioned against the card
          itself and cannot drift relative to it while the reel scrolls. */}
      <div className="absolute z-40 right-3 bottom-28 md:bottom-24 flex flex-col items-center gap-4">
      <div className="flex flex-col items-center gap-1">
        <button
          aria-label="Upvote"
          aria-pressed={vote === 1}
          onClick={handleUpvote}
          className={`${button} ${vote === 1 ? 'text-[#ff8a3d]' : ''}`}
        >
          <ArrowUp size={22} />
        </button>
        <span className={count}>{upvoteLabel}</span>
      </div>

      <button
        aria-label="Downvote"
        aria-pressed={vote === -1}
        onClick={handleDownvote}
        className={`${button} ${vote === -1 ? 'text-[#5fd0ff]' : ''}`}
      >
        <ArrowDown size={22} />
      </button>

      <div className="flex flex-col items-center gap-1">
        <button aria-label="Comments" onClick={onCommentToggle} className={button}>
          <MessageSquare size={20} />
        </button>
        <span className={count}>{comments}</span>
      </div>

      <button
        aria-label={saved ? 'Remove from saved' : 'Save'}
        aria-pressed={saved}
        onClick={handleSave}
        className={`${button} ${saved ? 'text-[#ff8a3d]' : ''}`}
      >
        <Bookmark size={20} fill={saved ? 'currentColor' : 'none'} />
      </button>

      <button aria-label="Share" className={button}>
        <Share2 size={20} />
      </button>
      </div>
    </>
  );
}
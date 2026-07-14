// components/cards/Shared.tsx
'use client';

import { useState, useEffect } from 'react';
import { ArrowUp, ArrowDown, MessageSquare, Share2, Bookmark, Loader2 } from 'lucide-react';
import { PostService } from '@/lib/posts';
import { Comment } from '@/types/post';
import { useAuth } from '@/hooks/useAuth';
import { CommentItem } from '@/components/post/commentItem';
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

  useEffect(() => {
    if (show && postId && !hasLoaded) {
      loadComments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, postId]);

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

export function ReelActions({ upvotes, comments, onCommentToggle }: ReelActionsProps) {
  const [voted, setVoted] = useState(false);

  return (
    <div className="absolute left-[calc(50%+230px)] top-1/2 -translate-y-1/2 flex flex-col gap-4 z-30">
      <div className="flex flex-col items-center gap-1">
        <button
          onClick={() => setVoted(!voted)}
          className={`w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-all text-[#1a1a1a] ${voted ? 'text-[#f36710]' : ''}`}
        >
          <ArrowUp size={24} />
        </button>
        <span className="text-white text-[12px] font-medium drop-shadow-md">{upvotes}</span>
      </div>

      <button className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-all text-[#1a1a1a] hover:bg-gray-50">
        <ArrowDown size={24} />
      </button>

      <div className="flex flex-col items-center gap-1 mt-2">
        <button
          onClick={onCommentToggle}
          className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-all text-[#1a1a1a] hover:bg-gray-50"
        >
          <MessageSquare size={22} />
        </button>
        <span className="text-white text-[12px] font-medium drop-shadow-md">{comments}</span>
      </div>

      <button className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-all text-[#1a1a1a] hover:bg-gray-50 mt-2">
        <Share2 size={22} />
      </button>
    </div>
  );
}
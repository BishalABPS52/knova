// components/comments/CommentItem.tsx
'use client';

import { useState } from 'react';
import { MessageSquare, Trash2, X, Loader2 } from 'lucide-react';
import { Comment } from '@/types/post';

interface CommentItemProps {
  comment: Comment;
  onReply: () => void;
  onDelete: () => void;
  isOwner: boolean;
  depth: number;
  onComment: (body: string, parentId?: string) => Promise<void>;
}

export function CommentItem({
  comment,
  onReply,
  onDelete,
  isOwner,
  depth,
  onComment,
}: CommentItemProps) {
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyBody, setReplyBody] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleReplySubmit = async () => {
    if (!replyBody.trim()) return;

    setIsSubmitting(true);
    try {
      await onComment(replyBody, comment.id);
      setReplyBody('');
      setShowReplyInput(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className={`${depth > 0 ? 'ml-8' : ''}`}>
      <div className="flex gap-3">
        <div className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0 flex items-center justify-center text-xs font-bold text-gray-600">
          {comment.user?.username?.slice(0, 2).toUpperCase() || 'U'}
        </div>
        <div className="flex-1">
          <div className="bg-gray-50 rounded-xl px-4 py-2.5">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-sm text-gray-900">
                {comment.user?.username || 'Unknown'}
              </span>
              <span className="text-xs text-gray-400">
                {formatDate(comment.created_at)}
              </span>
            </div>
            <p className="text-sm text-gray-700">{comment.body}</p>
          </div>
          <div className="flex items-center gap-4 mt-1.5 ml-2">
            <button
              onClick={() => setShowReplyInput(!showReplyInput)}
              className="text-xs text-gray-400 hover:text-gray-600 font-medium flex items-center gap-1"
            >
              <MessageSquare className="w-3 h-3" />
              Reply
            </button>
            {isOwner && (
              <button
                onClick={onDelete}
                className="text-xs text-red-400 hover:text-red-600 font-medium flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                Delete
              </button>
            )}
          </div>

          {/* Reply input */}
          {showReplyInput && (
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleReplySubmit();
                  }
                  if (e.key === 'Escape') {
                    setShowReplyInput(false);
                    setReplyBody('');
                  }
                }}
                placeholder="Write a reply..."
                className="flex-1 bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 rounded-lg px-3 py-1.5 text-sm outline-none transition-all"
                autoFocus
              />
              <button
                onClick={handleReplySubmit}
                disabled={!replyBody.trim() || isSubmitting}
                className="bg-orange-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
              >
                {isSubmitting ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                Reply
              </button>
              <button
                onClick={() => {
                  setShowReplyInput(false);
                  setReplyBody('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-3 space-y-4">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              onReply={onReply}
              onDelete={onDelete}
              isOwner={isOwner}
              depth={depth + 1}
              onComment={onComment}
            />
          ))}
        </div>
      )}
    </div>
  );
}
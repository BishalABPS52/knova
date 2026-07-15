// components/posts/PostDetail.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { PostService } from '@/lib/posts';
import { Post, Comment } from '@/types/post';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import FlashCard from '@/components/cards/FlashCard';
import TextCard from '@/components/cards/TextContentCard';
import McqCard from '@/components/cards/McqCard';
import { CommentItem } from '@/components/post/commentItem';

export default function PostDetail({ postId }: { postId: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const postService = new PostService();

  useEffect(() => {
    loadPost();
    loadComments();
  }, [postId]);

  const loadPost = async () => {
    try {
      const data = await postService.getPost(postId);
      setPost(data);
    } catch (error) {
      console.error('Failed to load post:', error);
      toast.error('Failed to load post');
      router.push('/posts');
    } finally {
      setIsLoading(false);
    }
  };

  const loadComments = async () => {
    try {
      const response = await postService.getComments(postId, 1, 50);
      setComments(response.items);
    } catch (error) {
      console.error('Failed to load comments:', error);
    }
  };

  const handleCommentSubmit = async () => {
    if (!newComment.trim()) return;
    if (!user) {
      toast.error('Please login to comment');
      return;
    }

    setIsSubmitting(true);
    try {
      const comment = await postService.createComment(
        postId,
        newComment,
        replyTo?.id
      );
      if (replyTo) {
        // Add as reply
        setComments(prev =>
          prev.map(c =>
            c.id === replyTo.id
              ? { ...c, replies: [...(c.replies || []), comment] }
              : c
          )
        );
      } else {
        setComments(prev => [comment, ...prev]);
      }
      setNewComment('');
      setReplyTo(null);
      setPost(prev => prev ? { ...prev, comment_count: prev.comment_count + 1 } : null);
      toast.success('Comment added');
    } catch (error) {
      console.error('Failed to add comment:', error);
      toast.error('Failed to add comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    try {
      await postService.deleteComment(commentId);
      setComments(prev => prev.filter(c => c.id !== commentId));
      setPost(prev => prev ? { ...prev, comment_count: prev.comment_count - 1 } : null);
      toast.success('Comment deleted');
    } catch (error) {
      console.error('Failed to delete comment:', error);
      toast.error('Failed to delete comment');
    }
  };

  const handleVote = async (postId: string, value: number) => {
    try {
      const updatedPost = await postService.vote(postId, value);
      setPost(updatedPost);
    } catch (error) {
      console.error('Failed to vote:', error);
      toast.error('Failed to vote');
    }
  };

  const handleSave = async (postId: string) => {
    try {
      const response = await postService.toggleSave(postId);
      setPost(prev => prev ? {
        ...prev,
        user_saved: response.saved,
        save_count: response.saved ? prev.save_count + 1 : prev.save_count - 1,
      } : null);
    } catch (error) {
      console.error('Failed to save:', error);
      toast.error('Failed to save post');
    }
  };

  const handleDeletePost = async () => {
    if (!confirm('Are you sure you want to delete this post?')) return;

    try {
      await postService.deletePost(postId);
      toast.success('Post deleted');
      router.push('/posts');
    } catch (error) {
      console.error('Failed to delete post:', error);
      toast.error('Failed to delete post');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-12 h-12 animate-spin text-orange-600" />
      </div>
    );
  }

  if (!post) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors mb-6"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>Back to feed</span>
      </button>

      {/* Post content */}
      <div className="relative">
        {post.content_type === 'flashcard' && (
          <FlashCard
            id={post.id}
            author={post.creator?.user?.username || 'Unknown'}
            authorInitial={post.creator?.user?.username?.slice(0, 2).toUpperCase() || 'U'}
            authorBg="bg-orange-500 text-white"
            time={post.published_at ? new Date(post.published_at).toLocaleDateString() : 'Just now'}
            category={post.tags?.[0] || 'General'}
            question={post.flashcard?.front}
            answer={post.flashcard?.back}
            answerBg="bg-[#f36710]"
            upvotes={post.upvote_count}
            downvotes={post.downvote_count}
            comments={post.comment_count}
            onVote={handleVote}
            onSave={handleSave}
            onDelete={handleDeletePost}
            userVote={post.user_vote}
            userSaved={post.user_saved}
            isOwner={user?.id === post.creator?.user?.id}
            variant="feed"
          />
        )}
        {post.content_type === 'text' && (
          <TextCard
            id={post.id}
            author={post.creator?.user?.username || 'Unknown'}
            authorInitial={post.creator?.user?.username?.slice(0, 2).toUpperCase() || 'U'}
            authorBg="bg-orange-500 text-white"
            time={post.published_at ? new Date(post.published_at).toLocaleDateString() : 'Just now'}
            category={post.tags?.[0] || 'General'}
            title={post.title || 'Untitled'}
            content={post.body}
            upvotes={post.upvote_count}
            downvotes={post.downvote_count}
            comments={post.comment_count}
            onVote={handleVote}
            onSave={handleSave}
            onDelete={handleDeletePost}
            userVote={post.user_vote}
            userSaved={post.user_saved}
            isOwner={user?.id === post.creator?.user?.id}
            variant="feed"
          />
        )}
        {post.content_type === 'mcq' && (
          <McqCard
            id={post.id}
            author={post.creator?.user?.username || 'Unknown'}
            authorInitial={post.creator?.user?.username?.slice(0, 2).toUpperCase() || 'U'}
            authorBg="bg-orange-500 text-white"
            time={post.published_at ? new Date(post.published_at).toLocaleDateString() : 'Just now'}
            category={post.tags?.[0] || 'General'}
            question={post.mcq?.question}
            options={post.mcq?.options}
            correctIndex={post.mcq?.correct_index}
            explanation={post.mcq?.explanation}
            upvotes={post.upvote_count}
            downvotes={post.downvote_count}
            comments={post.comment_count}
            onVote={handleVote}
            onSave={handleSave}
            onDelete={handleDeletePost}
            userVote={post.user_vote}
            userSaved={post.user_saved}
            isOwner={user?.id === post.creator?.user?.id}
            variant="feed"
          />
        )}
      </div>

      {/* Comments section */}
      <div className="mt-8 bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900">
            Comments ({post.comment_count})
          </h3>
        </div>

        {/* Comment input */}
        <div className="p-6 border-b border-gray-100">
          {replyTo && (
            <div className="flex items-center justify-between bg-gray-50 p-2 rounded-lg mb-3">
              <span className="text-sm text-gray-600">
                Replying to <span className="font-semibold">{replyTo.user?.username}</span>
              </span>
              <button
                onClick={() => setReplyTo(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
          )}
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {user?.username?.slice(0, 2).toUpperCase() || 'U'}
            </div>
            <div className="flex-1 flex gap-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleCommentSubmit();
                  }
                }}
                placeholder={replyTo ? `Reply to ${replyTo.user?.username}...` : "Add a comment..."}
                className="flex-1 bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 rounded-xl px-4 py-2.5 text-sm outline-none transition-all"
              />
              <button
                onClick={handleCommentSubmit}
                disabled={!newComment.trim() || isSubmitting}
                className="bg-orange-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Post
              </button>
            </div>
          </div>
        </div>

        {/* Comments list */}
        <div className="p-6 space-y-6">
          {comments.length === 0 ? (
            <p className="text-center text-gray-500 text-sm py-8">
              No comments yet. Be the first to share your thoughts!
            </p>
          ) : (
            comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                onReply={() => setReplyTo(comment)}
                onDelete={() => handleDeleteComment(comment.id)}
                isOwner={user?.id === comment.user_id}
                depth={0}
                onComment={async (body, parentId) => {
                  // This handles replies from the CommentItem component
                  if (!user) {
                    toast.error('Please login to comment');
                    return;
                  }
                  try {
                    const newReply = await postService.createComment(
                      postId,
                      body,
                      parentId
                    );
                    setComments(prev =>
                      prev.map(c =>
                        c.id === parentId
                          ? { ...c, replies: [...(c.replies || []), newReply] }
                          : c
                      )
                    );
                    setPost(prev => prev ? { ...prev, comment_count: prev.comment_count + 1 } : null);
                    toast.success('Reply added');
                  } catch (error) {
                    console.error('Failed to add reply:', error);
                    toast.error('Failed to add reply');
                  }
                }}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
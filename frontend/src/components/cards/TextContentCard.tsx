// components/cards/TextContentCard.tsx
'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FeedActions, ReelActions, CommentsSection, ExploreActions } from './Shared';
import FollowButton from '@/components/ui/FollowButton';
import PostMenu from '@/components/ui/PostMenu';

interface TextProps {
  variant?: 'feed' | 'reel' | 'explore' | 'profile';
  author?: string;
  /** Creator profile id, used by the follow button. */
  creatorId?: string;
  time?: string;
  category?: string;
  title?: string;
  content?: string;
  upvotes?: number | string;
  downvotes?: number;
  comments?: number;
  authorInitial?: string;
  authorBg?: string;
  tags?: string[];
  onCommentToggle?: () => void;
  tag?: string;
  color?: string;
  onShare?: (id: string | number) => void;
  onVote?: (id: string, value: number) => Promise<void>;
  onSave?: (id: string) => Promise<void>;
  onComment?: (id: string, body: string) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  /**
   * Telemetry: how far through the body the reader got, 0..1. The feed variant
   * reports a single expand (depth omitted, i.e. read in full); the reel variant
   * reports real scroll progress through its body.
   */
  onExpand?: (id: string, depth?: number) => void;
  id?: string | number;
  userVote?: number;
  userSaved?: boolean;
  isOwner?: boolean;
}

export default function TextCard(props: TextProps) {
  const { variant = 'feed' } = props;
  if (variant === 'feed') return <TextFeed {...props} />;
  if (variant === 'reel') return <TextReel {...props} />;
  if (variant === 'explore') return <TextExplore {...props} />;
  if (variant === 'profile') return <TextProfile {...props} />;
  return null;
}

function TextFeed({
  id,
  author,
  creatorId,
  time,
  title,
  content,
  upvotes,
  downvotes,
  comments,
  authorInitial,
  authorBg,
  onShare,
  onVote,
  onSave,
  onDelete,
  onExpand,
  userVote,
  userSaved,
  isOwner,
}: TextProps) {
  const [showComments, setShowComments] = useState(false);
  const [localUpvotes, setLocalUpvotes] = useState(Number(upvotes) || 0);
  const [localDownvotes, setLocalDownvotes] = useState(downvotes || 0);
  const [localUserVote, setLocalUserVote] = useState(userVote || 0);
  const [localUserSaved, setLocalUserSaved] = useState(userSaved || false);
  const [expanded, setExpanded] = useState(false);

  const handleVote = async (value: number) => {
    if (!id || !onVote) return;
    
    const previousVote = localUserVote;
    const previousUpvotes = localUpvotes;
    const previousDownvotes = localDownvotes;

    if (previousVote === value) {
      setLocalUserVote(0);
      if (value === 1) setLocalUpvotes(prev => prev - 1);
      else setLocalDownvotes(prev => prev - 1);
    } else {
      setLocalUserVote(value);
      if (value === 1) {
        setLocalUpvotes(prev => prev + 1);
        if (previousVote === -1) setLocalDownvotes(prev => prev - 1);
      } else {
        setLocalDownvotes(prev => prev + 1);
        if (previousVote === 1) setLocalUpvotes(prev => prev - 1);
      }
    }

    try {
      await onVote(id as string, value);
    } catch {
      setLocalUserVote(previousVote);
      setLocalUpvotes(previousUpvotes);
      setLocalDownvotes(previousDownvotes);
    }
  };

  const handleSave = async () => {
    if (!id || !onSave) return;
    setLocalUserSaved(!localUserSaved);
    try {
      await onSave(id as string);
    } catch (error) {
      setLocalUserSaved(!localUserSaved);
      console.error('Failed to save:', error);
    }
  };

  const handleDelete = async () => {
    if (!id || !onDelete) return;
    if (confirm('Are you sure you want to delete this post?')) {
      await onDelete(id as string);
    }
  };

  const shouldTruncate = content && content.length > 300;
  const displayContent = shouldTruncate && !expanded ? content.slice(0, 300) + '...' : content;

  // Expanding is the only in-card signal that the whole post was read; collapsing
  // again says nothing, so it isn't reported.
  const handleExpandToggle = () => {
    const expanding = !expanded;
    setExpanded(expanding);
    if (expanding && id) onExpand?.(String(id));
  };

  return (
    <div className="glass-card rounded-2xl overflow-hidden hover-lift transition-all duration-300">
      <div className="p-8 pb-4 bg-white">
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${authorBg || 'bg-orange-500 text-white'}`}>
              {authorInitial || author?.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-sm text-on-surface">{author || 'Unknown'}</p>
                <FollowButton creatorId={creatorId} author={author} hidden={isOwner} />
              </div>
              <p className="text-xs text-outline">{time || 'Just now'}</p>
            </div>
          </div>
          <PostMenu
            postId={id}
            author={author}
            isOwner={isOwner}
            onDelete={onDelete ? handleDelete : undefined}
            onShare={onShare && id ? () => onShare(id) : undefined}
            onSave={onSave && id ? handleSave : undefined}
            saved={localUserSaved}
          />
        </div>
        <h3 className="text-[24px] font-bold text-on-surface mb-4 leading-tight">{title || 'Untitled'}</h3>
        <p className="text-[18px] text-on-surface-variant leading-relaxed mb-6 whitespace-pre-wrap">
          {displayContent || content || 'No content'}
        </p>
        {shouldTruncate && (
          <button 
            onClick={handleExpandToggle}
            className="font-bold hover:underline flex items-center gap-1 mb-4 text-primary"
          >
            {expanded ? 'Show less' : 'Read more...'}
          </button>
        )}
      </div>
      <FeedActions
        upvotes={localUpvotes}
        downvotes={localDownvotes}
        comments={comments || 0}
        onShare={() => onShare && id && onShare(id)}
        onCommentToggle={() => setShowComments(!showComments)}
        showComments={showComments}
        onVote={handleVote}
        onSave={handleSave}
        userVote={localUserVote}
        userSaved={localUserSaved}
        postId={id as string}
      />
      <CommentsSection show={showComments} postId={id} />
    </div>
  );
}

function TextReel({ id, title, content, tags, author, time, upvotes, comments, onCommentToggle, userVote, userSaved, onVote, onSave, onExpand }: TextProps) {
  const bodyRef = useRef<HTMLDivElement>(null);

  // Reading progress is the reel's equivalent of the feed's "expand": a body
  // short enough not to overflow was seen in full, so it counts as depth 1.
  const reportDepth = useCallback(() => {
    const body = bodyRef.current;
    if (!body || !id) return;
    const scrollable = body.scrollHeight - body.clientHeight;
    onExpand?.(String(id), scrollable > 0 ? body.scrollTop / scrollable : 1);
  }, [id, onExpand]);

  // Fires once on mount so a non-overflowing card still reports depth 1.
  useEffect(reportDepth, [reportDepth]);

  return (
    <section className="h-[100svh] w-full snap-start flex items-center justify-center relative">
      <div className="w-full h-full bg-white flex flex-col relative z-20 text-[#1a1a1a] md:w-[440px] md:h-[88vh] md:rounded-2xl md:shadow-[0_20px_50px_rgba(0,0,0,0.4)]">
        <div
          ref={bodyRef}
          onScroll={reportDepth}
          className="flex-1 px-6 pt-24 pb-36 md:px-8 md:pt-10 md:pb-28 flex flex-col justify-center items-center text-center overflow-y-auto custom-scrollbar"
        >
          <h2 className="font-bold text-[24px] leading-tight mb-6">{title || 'Untitled'}</h2>
          <p className="text-on-surface-variant text-[16px] leading-relaxed">{content || 'No content'}</p>
        </div>

        <div className="absolute bottom-4 left-4 right-4 flex flex-col gap-2 z-30 pointer-events-none">
          <div className="flex flex-wrap gap-1.5">
            {tags?.map((tag) => (
              <span key={tag} className="px-[10px] py-[4px] bg-[#e0f6fe] text-[#0080b0] rounded-full text-[12px] font-semibold pointer-events-auto shadow-sm">
                {tag}
              </span>
            ))}
          </div>
          <div className="w-full h-px bg-[#1a1a1a]/10 mb-1" />
          <div className="flex items-center gap-3 pointer-events-auto">
            <div className="w-[36px] h-[36px] rounded-full bg-[#e0f6fe] flex items-center justify-center text-[#0080b0] font-bold text-sm shadow-sm border border-white/50">
              {author?.slice(0, 2).toUpperCase() || 'AN'}
            </div>
            <div className="drop-shadow-sm">
              <p className="text-[14px] font-bold text-[#1a1a1a] leading-none mb-1">{author || 'Anonymous'}</p>
              <p className="text-[12px] text-[#5c5c5c] font-medium leading-none">{time || 'Just now'}</p>
            </div>
          </div>
        </div>

        <ReelActions
          upvotes={upvotes || 0}
          comments={comments || 0}
          onCommentToggle={onCommentToggle}
          postId={id}
          userVote={userVote}
          userSaved={userSaved}
          onVote={onVote}
          onSave={onSave}
        />
      </div>
    </section>
  );
}

function TextExplore({ id, tag, title, content, author, upvotes, userVote, userSaved, onVote, onSave, onExpand }: TextProps) {
  const [expanded, setExpanded] = useState(false);
  const isLong = (content?.length || 0) > 160;

  const toggle = () => {
    const next = !expanded;
    setExpanded(next);
    if (next && id) onExpand?.(String(id));
  };

  return (
    <div className="bg-white rounded-xl border border-[#ece9e7] p-4 md:p-5 hover:shadow-md hover:border-[#e1bfb1] transition-all">
      <span className="inline-block text-[10px] font-bold uppercase tracking-wide text-[#8d7165] bg-[#f3f1ef] px-2 py-0.5 rounded-full mb-2.5">{tag || 'General'}</span>
      <h3 className="text-[14px] md:text-[15px] font-semibold text-[#1b1c1c] leading-snug line-clamp-2 mb-1.5">{title || 'Untitled'}</h3>
      <p className={`text-[13px] text-[#594137]/80 leading-relaxed whitespace-pre-wrap ${expanded ? '' : 'line-clamp-3'}`}>{content || 'No content'}</p>
      {isLong && (
        <button
          onClick={toggle}
          className="text-[12px] font-bold text-[#f36710] mt-1.5 hover:underline"
        >
          {expanded ? 'Show less' : 'Read more'}
        </button>
      )}
      <div className="flex items-center justify-between pt-3 mt-3 border-t border-[#f3f1ef]">
        <span className="text-xs text-[#8d7165] font-medium truncate">{author || 'Unknown'}</span>
        <ExploreActions upvotes={upvotes ?? 0} postId={id} userVote={userVote} userSaved={userSaved} onVote={onVote} onSave={onSave} />
      </div>
    </div>
  );
}

function TextProfile({ tag, title, content }: TextProps) {
  return (
    <div className="aspect-square bg-white rounded-[20px] flex flex-col p-5 border border-surface-container-high border-l-[4px] border-l-[#00afef] hover-shadow-lg transition-all hover:-translate-y-1">
      <span className="text-[10px] font-bold text-[#00afef] mb-2 uppercase tracking-wide">{tag || 'General'}</span>
      <h3 className="text-[15px] font-bold text-on-surface mb-2 leading-snug">{title || 'Untitled'}</h3>
      <p className="text-[11px] text-on-surface-variant line-clamp-4 leading-relaxed">{content || 'No content'}</p>
    </div>
  );
}
// components/cards/FlashCard.tsx
'use client';

import { useState } from 'react';
import { FeedActions, ReelActions, CommentsSection, ExploreCardShell } from './Shared';
import FollowButton from '@/components/ui/FollowButton';
import PostMenu from '@/components/ui/PostMenu';

interface CardProps {
  variant?: 'feed' | 'reel' | 'explore' | 'profile';
  author?: string;
  /** Creator profile id, used by the follow button. */
  creatorId?: string;
  time?: string;
  category?: string;
  question?: string;
  answer?: string;
  upvotes?: number | string;
  downvotes?: number;
  comments?: number;
  authorInitial?: string;
  authorBg?: string;
  answerBg?: string;
  subtitle?: string;
  theme?: string;
  tag?: string;
  onCommentToggle?: () => void;
  bg?: string;
  onShare?: (id: string | number) => void;
  onVote?: (id: string, value: number) => Promise<void>;
  onSave?: (id: string) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  onComment?: (id: string, body: string) => Promise<void>;
  /** Telemetry: fired when the answer is revealed, not when flipping back. */
  onFlip?: (id: string) => void;
  id?: string | number;
  userVote?: number;
  userSaved?: boolean;
  isOwner?: boolean;
}

export default function FlashCard(props: CardProps) {
  const { variant = 'feed' } = props;
  if (variant === 'feed') return <FlashCardFeed {...props} />;
  if (variant === 'reel') return <FlashCardReel {...props} />;
  if (variant === 'explore') return <FlashCardExplore {...props} />;
  if (variant === 'profile') return <FlashCardProfile {...props} />;
  return null;
}

function FlashCardFeed({
  id,
  author,
  creatorId,
  time,
  question,
  answer,
  upvotes,
  downvotes,
  comments,
  authorInitial,
  authorBg,
  answerBg,
  onShare,
  onVote,
  onSave,
  onDelete,
  onFlip,
  userVote,
  userSaved,
  isOwner,
}: CardProps) {
  const [flipped, setFlipped] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [localUpvotes, setLocalUpvotes] = useState(Number(upvotes) || 0);
  const [localDownvotes, setLocalDownvotes] = useState(downvotes || 0);
  const [localUserVote, setLocalUserVote] = useState(userVote || 0);
  const [localUserSaved, setLocalUserSaved] = useState(userSaved || false);

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

  // Only the reveal is a learning signal; flipping back to the question isn't.
  const handleFlip = () => {
    const revealing = !flipped;
    setFlipped(revealing);
    if (revealing && id) onFlip?.(String(id));
  };

  return (
    <div className="glass-card rounded-2xl overflow-hidden hover-lift transition-all duration-300">
      <div className="p-6 border-b border-orange-100 bg-gradient-to-r from-orange-50 via-white to-orange-50 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${authorBg || 'bg-orange-500 text-white'}`}>
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

      <div className="relative w-full h-[300px] perspective-1000 group cursor-pointer overflow-hidden" onClick={handleFlip}>
        <div className={`FlashCard-inner relative w-full h-full text-center flex flex-col items-center justify-center ${flipped ? 'is-flipped' : ''}`} style={{ transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)', transformStyle: 'preserve-3d' }}>
          <div className="FlashCard-front absolute inset-0 p-12 flex flex-col items-center justify-center bg-gradient-to-br from-white to-surface-container-low" style={{ backfaceVisibility: 'hidden' }}>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">{question || 'Question'}</h2>
            <p className="text-primary font-bold text-sm flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">touch_app</span> Tap to reveal answer
            </p>
          </div>

          <div className={`FlashCard-back absolute inset-0 p-12 flex flex-col items-center justify-center ${answerBg || 'bg-[#f36710]'} text-white`} style={{ transform: 'rotateY(180deg)', backfaceVisibility: 'hidden' }}>
            <h2 className="text-3xl font-bold text-white mb-4">{answer || 'Answer'}</h2>
            <p className="text-white/80 text-sm">Tap to see question</p>
          </div>
        </div>
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

function FlashCardReel({ id, question, answer, subtitle, theme, tag, author, time, upvotes, comments, onCommentToggle, userVote, userSaved, onVote, onSave, onFlip }: CardProps) {
  const [flipped, setFlipped] = useState(false);
  const isOrange = theme === 'orange';

  // Only the first reveal is a signal; flipping back and forth isn't new
  // information. Reported outside the state updater, which StrictMode may
  // invoke twice in development.
  const handleFlip = () => {
    if (!flipped && id) onFlip?.(String(id));
    setFlipped((wasFlipped) => !wasFlipped);
  };

  return (
    <section className="h-[100svh] w-full snap-start flex items-center justify-center relative">
      <div className="w-full h-full overflow-hidden bg-white flex flex-col relative z-20 md:w-[440px] md:h-[88vh] md:rounded-2xl md:shadow-[0_20px_50px_rgba(0,0,0,0.4)]">
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className={`h-1/2 flex items-center justify-center p-6 text-center ${isOrange ? 'bg-[#fef3ea]' : 'bg-[#e5f7fd]'}`}>
            <h2 className="text-[#1a1a1a] font-semibold text-[24px] leading-tight">{question || 'Question'}</h2>
          </div>
          <div className="flex-1 perspective-1000 cursor-pointer" onClick={handleFlip}>
            <div className={`relative w-full h-full transition-transform duration-600 transform-style-3d ${flipped ? 'rotate-y-180' : ''}`} style={{ transition: 'transform 0.6s', transformStyle: 'preserve-3d' }}>
              <div className="absolute inset-0 bg-white p-6 flex flex-col items-center justify-center backface-hidden" style={{ backfaceVisibility: 'hidden' }}>
                <span className={`material-symbols-outlined text-[36px] mb-2 ${isOrange ? 'text-[#f36710]' : 'text-[#00afef]'}`}>touch_app</span>
                <div className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase border tracking-widest shadow-sm ${isOrange ? 'text-[#f36710] border-[#f36710]/30' : 'text-[#00afef] border-[#00afef]/30'}`}>
                  Tap to flip
                </div>
              </div>
              <div className={`absolute inset-0 p-6 text-center flex flex-col items-center justify-center backface-hidden ${isOrange ? 'bg-[#f36710]' : 'bg-[#00afef]'}`} style={{ transform: 'rotateY(180deg)', backfaceVisibility: 'hidden' }}>
                <p className="text-white font-bold text-[28px] tracking-tight">{answer || 'Answer'}</p>
                <p className="text-white/80 text-sm mt-2">{subtitle}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-4 left-4 right-4 flex flex-col gap-2 z-30 pointer-events-none">
          <div className="flex flex-wrap gap-1.5">
            <span className={`px-[10px] py-[4px] ${isOrange ? 'bg-[#fef3ea] text-[#f36710]' : 'bg-[#e0f6fe] text-[#0080b0]'} rounded-full text-[12px] font-semibold pointer-events-auto shadow-sm`}>
              {tag || 'General'}
            </span>
          </div>
          <div className="w-full h-px bg-[#1a1a1a]/10 mb-1" />
          <div className="flex items-center gap-3 pointer-events-auto">
            <div className={`w-[36px] h-[36px] rounded-full ${isOrange ? 'bg-[#fef3ea] text-[#f36710]' : 'bg-[#e0f6fe] text-[#0080b0]'} flex items-center justify-center font-bold text-sm shadow-sm border border-white/50`}>
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

function FlashCardExplore({ id, tag, question, answer, author, creatorId, upvotes, comments, userVote, userSaved, isOwner, onVote, onSave, onShare, onDelete, onFlip }: CardProps) {
  const [flipped, setFlipped] = useState(false);

  const toggle = () => {
    const next = !flipped;
    setFlipped(next);
    if (next && id) onFlip?.(String(id));
  };

  const chip = (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-[#f36710] bg-[#fef3ea] px-2 py-0.5 rounded-full">
      <span className="material-symbols-outlined text-[12px]">style</span>
      {tag || 'Flashcard'}
    </span>
  );

  return (
    <ExploreCardShell
      id={id}
      author={author}
      creatorId={creatorId}
      chip={chip}
      upvotes={upvotes}
      comments={comments}
      userVote={userVote}
      userSaved={userSaved}
      isOwner={isOwner}
      onVote={onVote}
      onSave={onSave}
      onShare={onShare}
      onDelete={onDelete}
    >
      <div onClick={toggle} className="cursor-pointer">
        {!flipped ? (
          <h3 className="text-[14px] md:text-[15px] font-semibold text-[#1b1c1c] leading-snug line-clamp-4">{question || 'Question'}</h3>
        ) : (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#f36710] mb-1">Answer</p>
            <p className="text-[13px] text-[#594137] leading-relaxed line-clamp-5">{answer || 'No answer'}</p>
          </div>
        )}
        <p className="text-[11px] text-[#b0a49d] mt-2">{flipped ? 'Tap to hide answer' : 'Tap to reveal answer'}</p>
      </div>
    </ExploreCardShell>
  );
}

function FlashCardProfile({ question }: CardProps) {
  return (
    <div className="aspect-square bg-[#fef3ea] rounded-[20px] relative flex flex-col p-5 border border-primary/10 cursor-pointer hover:shadow-lg transition-all hover:-translate-y-1">
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <span className="material-symbols-outlined text-[#f36710] text-3xl mb-3 opacity-50">help_center</span>
        <h3 className="text-sm font-bold text-on-surface leading-snug">{question || 'Question'}</h3>
      </div>
      <div className="absolute bottom-4 left-0 right-0 flex justify-center opacity-40">
        <span className="text-[9px] font-bold uppercase tracking-widest text-[#f36710]">Tap to flip</span>
      </div>
    </div>
  );
}
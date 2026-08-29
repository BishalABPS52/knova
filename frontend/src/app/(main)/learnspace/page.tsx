'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, type PanInfo } from 'motion/react';
import { useRouter } from 'next/navigation';
import { ChevronUp, Sparkles, X } from 'lucide-react';
import FlashCard from '@/components/cards/FlashCard';
import McqCard from '@/components/cards/McqCard';
import TextCard from '@/components/cards/TextContentCard';
import { CommentsSection } from '@/components/cards/Shared';
import TrackedCard from '@/components/feed/TrackedCard';
import { spacePosts } from '@/data/mockData';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { PostService } from '@/lib/posts';
import { telemetry } from '@/lib/telemetry';
import type { Post } from '@/types/post';

/** One card in the reel, shaped the same way the reel card variants expect. */
interface SpaceItem {
  id: string | number;
  type: string;
  /** Topic this card belongs to — the key for the left-swipe "quiz this topic" filter. */
  topicId?: string;
  author: string;
  time: string;
  upvotes: string | number;
  comments: number;
  theme: string;
  tag?: string;
  tags?: string[];
  question?: string;
  answer?: string;
  subtitle?: string;
  title?: string;
  content?: string;
  options?: string[];
  correctIndex?: number;
  explanation?: string;
  userVote?: number;
  userSaved?: boolean;
}

const postService = new PostService();

const PAGE_SIZE = 15;

/** Horizontal travel (px) past which a drag commits to a swipe. */
const SWIPE_TRIGGER = 90;
/** A quick horizontal flick (px/s) commits even below the distance threshold. */
const SWIPE_VELOCITY = 500;

/**
 * Consecutive empty batches tolerated before the reel stops paging. The server
 * caches a feed response briefly, so the first empty batch is far more likely to
 * be a cache hit than a genuinely exhausted reader.
 */
const MAX_EMPTY_BATCHES = 3;

/** Backoff after an empty batch — comfortably past the server's feed cache TTL. */
const EMPTY_RETRY_MS = 12_000;

/** Compact, human-friendly timestamp for a post ("2h ago", "3d ago"). */
function relativeTime(iso?: string): string {
  if (!iso) return 'Just now';
  const delta = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(delta / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/** Convert a backend Post into the shape the reel variants consume. */
function mapPostToSpaceItem(post: Post, index: number): SpaceItem {
  // A short note is just a text card in this surface.
  const type = post.content_type === 'short_note' ? 'text' : post.content_type;

  const base: SpaceItem = {
    id: post.id,
    type,
    topicId: post.topic_id,
    author: post.creator?.user?.username || 'Unknown',
    time: relativeTime(post.published_at),
    upvotes: post.upvote_count || 0,
    comments: post.comment_count || 0,
    tags: post.tags || [],
    tag: post.tags?.[0] || 'General',
    // Alternate themes only for visual rhythm; the answer side is the real content.
    theme: index % 2 === 0 ? 'orange' : 'blue',
    // Seeds the action rail so a vote/save the reader already made shows as set.
    userVote: post.user_vote ?? 0,
    userSaved: post.user_saved ?? false,
  };

  if (type === 'flashcard') {
    return {
      ...base,
      question: post.flashcard?.front || 'Question',
      answer: post.flashcard?.back || 'Answer',
      subtitle: post.title || undefined,
    };
  }

  if (type === 'mcq') {
    return {
      ...base,
      question: post.mcq?.question,
      options: post.mcq?.options,
      correctIndex: post.mcq?.correct_index,
      explanation: post.mcq?.explanation,
    };
  }

  return { ...base, title: post.title || 'Untitled', content: post.body };
}

export default function SpaceReel() {
  const router = useRouter();
  const { initializing } = useAuth();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [cards, setCards] = useState<SpaceItem[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [commentsOpen, setCommentsOpen] = useState(false);
  // The post the panel is pinned to. Deliberately NOT the active card: opening
  // the panel (or the mobile keyboard appearing) nudges the reel, the scroll
  // observer advances activeIndex, and a panel following it would re-point at
  // the next card and refetch — hiding the comment the reader just submitted.
  const [commentsPostId, setCommentsPostId] = useState<string | null>(null);
  const [hasScrolled, setHasScrolled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [useMockData, setUseMockData] = useState(false);

  // Left-swipe on a card enters "quiz mode": the reel is replaced by that card's
  // topic's MCQs so the reader can drill it. Answers still flow through the normal
  // trackQuiz telemetry (surface 'topic'), which feeds mastery / kg_readiness.
  const [quizTopic, setQuizTopic] = useState<{ id: string; label: string } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  // Bumped to force the loader effect to re-run without changing the topic (used
  // after on-demand question generation).
  const [reloadNonce, setReloadNonce] = useState(0);

  const seenIdsRef = useRef<Set<string>>(new Set());
  // Guards the endless loader against concurrent/duplicate requests, and backs
  // off (rather than giving up outright) when a fetch returns nothing new.
  const loadingMoreRef = useRef(false);
  const exhaustedRef = useRef(false);
  const emptyBatchesRef = useRef(0);
  const retryAfterRef = useRef(0);

  // Telemetry is the whole point of this surface, but mock ids aren't real posts
  // and a single non-UUID makes the server reject the entire batch.
  const trackingEnabled = !useMockData;

  const commentsPost = cards.find((card) => String(card.id) === commentsPostId);

  /** Open the panel on a specific card; the same card's button closes it again. */
  const toggleComments = useCallback((postId: string) => {
    setCommentsOpen((open) => (commentsPostId === postId ? !open : true));
    setCommentsPostId(postId);
  }, [commentsPostId]);

  /** Scroll a card into view by index (clamped). */
  const goTo = useCallback((index: number) => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const target = Math.max(0, Math.min(scroller.children.length - 1, index));
    scroller.children[target]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const loadBatch = useCallback(async () => {
    if (exhaustedRef.current || loadingMoreRef.current) return;
    // Back off after an empty batch instead of re-asking on every scroll event,
    // which would otherwise burn all the retries inside one cache window.
    if (Date.now() < retryAfterRef.current) return;
    loadingMoreRef.current = true;
    try {
      const response = await postService.getFeed({ size: PAGE_SIZE });
      const fresh = response.items
        .map(mapPostToSpaceItem)
        .filter((item) => !seenIdsRef.current.has(String(item.id)));
      fresh.forEach((item) => seenIdsRef.current.add(String(item.id)));

      if (fresh.length > 0) {
        setCards((prev) => [...prev, ...fresh]);
        setUseMockData(false);
        emptyBatchesRef.current = 0;
      } else {
        // An empty batch usually just means we re-read the cached feed inside its
        // TTL, not that the reader is out of posts — the server re-runs retrieval
        // per call and returns mostly-new candidates. So only give up after
        // several consecutive empties, and let the next scroll retry once the
        // cached response has expired.
        emptyBatchesRef.current += 1;
        retryAfterRef.current = Date.now() + EMPTY_RETRY_MS;
        if (emptyBatchesRef.current >= MAX_EMPTY_BATCHES) exhaustedRef.current = true;
      }
    } catch (error) {
      console.error('Failed to load learn space from API:', error);
    } finally {
      loadingMoreRef.current = false;
      setIsLoading(false);
    }
  }, []);

  const handleVote = useCallback(async (postId: string, value: number) => {
    if (useMockData) return;
    const updated = await postService.vote(postId, value);
    // Keep the card's own counters in step, so scrolling away and back doesn't
    // resurrect the pre-vote numbers.
    setCards((prev) =>
      prev.map((card) =>
        String(card.id) === postId
          ? { ...card, upvotes: updated.upvote_count, userVote: updated.user_vote ?? 0 }
          : card,
      ),
    );
  }, [useMockData]);

  const handleSave = useCallback(async (postId: string) => {
    if (useMockData) return;
    const response = await postService.toggleSave(postId);
    setCards((prev) =>
      prev.map((card) =>
        String(card.id) === postId ? { ...card, userSaved: response.saved } : card,
      ),
    );
  }, [useMockData]);

  const handleQuizAnswer = useCallback((postId: string, correct: boolean) => {
    if (!trackingEnabled) return;
    telemetry.trackQuiz(postId, correct);
  }, [trackingEnabled]);

  const handleFlip = useCallback((postId: string) => {
    if (!trackingEnabled) return;
    telemetry.trackFlip(postId);
  }, [trackingEnabled]);

  const handleExpand = useCallback((postId: string, depth = 1) => {
    if (!trackingEnabled) return;
    telemetry.trackScroll(postId, depth);
  }, [trackingEnabled]);

  const enterQuizMode = useCallback((topicId?: string, label?: string) => {
    // Needs a real topic and real (non-mock) data — mock ids can't be filtered server-side.
    if (!topicId || useMockData) return;
    setCommentsOpen(false);
    setQuizTopic({ id: topicId, label: label || 'this topic' });
  }, [useMockData]);

  const exitQuizMode = useCallback(() => setQuizTopic(null), []);

  // Horizontal drag on a card: left = drill this card's topic as a quiz; right
  // (while in quiz mode) = back to the feed. motion's drag="x" sets touch-action
  // to pan-y, so vertical scroll-snap keeps working and the card springs back.
  const handleCardDragEnd = useCallback(
    (topicId?: string, label?: string) =>
      (_event: unknown, info: PanInfo) => {
        const left = info.offset.x < -SWIPE_TRIGGER || info.velocity.x < -SWIPE_VELOCITY;
        const right = info.offset.x > SWIPE_TRIGGER || info.velocity.x > SWIPE_VELOCITY;
        if (left && !quizTopic) enterQuizMode(topicId, label);
        else if (right && quizTopic) exitQuizMode();
      },
    [quizTopic, enterQuizMode, exitQuizMode],
  );

  // Leaving the reel by client-side navigation fires neither pagehide nor
  // visibilitychange, so the buffered batch has to be pushed on unmount.
  useEffect(() => () => { void telemetry.flush(); }, []);

  /** Reset paging bookkeeping before a fresh (re)load of the reel. */
  const resetPaging = useCallback(() => {
    seenIdsRef.current = new Set();
    exhaustedRef.current = false;
    emptyBatchesRef.current = 0;
    retryAfterRef.current = 0;
    loadingMoreRef.current = false;
  }, []);

  /** Generate practice questions for the current topic on demand, then reload. */
  const handleGenerate = useCallback(async () => {
    if (!quizTopic || isGenerating) return;
    setIsGenerating(true);
    try {
      await api(`/api/v1/quiz/topics/${quizTopic.id}/generate-now`, { method: 'POST' });
      setReloadNonce((n) => n + 1);
    } catch (error) {
      console.error('Failed to generate quiz for topic:', error);
    } finally {
      setIsGenerating(false);
    }
  }, [quizTopic, isGenerating]);

  // Load the reel for the current mode. Normal mode pulls the personalized feed
  // (with mock fallback, mirroring the home feed); quiz mode pulls only the
  // selected topic's MCQs — a finite set, so paging is disabled.
  useEffect(() => {
    // Wait for the session to settle rather than racing it — the feed needs a
    // cookie, and a premature 401 would drop the reel onto mock data.
    if (initializing) return;
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      resetPaging();
      setActiveIndex(0);
      try {
        const response = quizTopic
          ? await postService.getPosts({
              topic_id: quizTopic.id,
              content_type: 'mcq',
              size: PAGE_SIZE,
              sort_by: 'new',
            })
          : await postService.getFeed({ size: PAGE_SIZE });
        if (cancelled) return;

        const initial = response.items.map(mapPostToSpaceItem);
        seenIdsRef.current = new Set(initial.map((item) => String(item.id)));
        setCards(initial);
        setUseMockData(false);
        // A topic's MCQ set is finite — there's nothing to page in quiz mode.
        if (quizTopic) exhaustedRef.current = true;
        requestAnimationFrame(() => scrollerRef.current?.scrollTo({ top: 0 }));
      } catch (error) {
        if (cancelled) return;
        if (quizTopic) {
          // Quiz mode has no mock fallback — show an empty state and let the reader
          // generate questions or swipe back out.
          console.error('Failed to load topic quiz:', error);
          setCards([]);
          exhaustedRef.current = true;
        } else {
          console.error('Failed to load learn space, using mock data:', error);
          setCards(
            spacePosts.map((post, index) => ({
              ...post,
              id: String(post.id),
              time: post.time,
              theme: index % 2 === 0 ? 'orange' : 'blue',
            })),
          );
          exhaustedRef.current = true;
          setUseMockData(true);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void load();
    return () => { cancelled = true; };
  }, [initializing, quizTopic, reloadNonce, resetPaging]);

  // Track the card on screen (drives the comments panel and keyboard nav) and
  // append the next batch before the reader can reach the end.
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const sections = Array.from(scroller.children);
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const index = sections.indexOf(entry.target);
          if (index === -1) return;

          setActiveIndex(index);
          if (index > 0) setHasScrolled(true);

          // Endless feed: top up while two cards remain below.
          if (index >= sections.length - 2 && !useMockData) {
            void loadBatch();
          }
        });
      },
      { root: scroller, threshold: 0.6 },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [cards.length, loadBatch, useMockData]);

  // Keyboard navigation: the reel is a scroll surface, so it needs explicit keys.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const typing =
        event.target instanceof HTMLElement &&
        ['INPUT', 'TEXTAREA'].includes(event.target.tagName);
      if (typing) return;

      switch (event.key) {
        case 'ArrowDown':
        case 'j':
          event.preventDefault();
          goTo(activeIndex + 1);
          break;
        case 'ArrowUp':
        case 'k':
          event.preventDefault();
          goTo(activeIndex - 1);
          break;
        case 'Escape':
          if (commentsOpen) setCommentsOpen(false);
          else router.push('/');
          break;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeIndex, commentsOpen, goTo, router]);

  return (
    // Fixed so the reel fills the viewport instead of sitting inside the
    // main layout's padded, max-width content column.
    <div className="fixed inset-0 z-[60] bg-[#0a0f1e] text-white antialiased overflow-hidden">
      {/* Ambient background */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute -top-1/4 -left-1/4 w-[70vw] h-[70vw] rounded-full bg-[#f36710] opacity-[0.18] blur-[120px]" />
        <div className="absolute -bottom-1/4 -right-1/4 w-[70vw] h-[70vw] rounded-full bg-[#00afef] opacity-[0.18] blur-[120px]" />
      </div>

      {/* The reel */}
      <div
        ref={scrollerRef}
        className="h-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide overscroll-contain relative z-10"
      >
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <div className="w-10 h-10 rounded-full border-2 border-white/20 border-t-[#f36710] animate-spin" />
          </div>
        ) : cards.length === 0 && quizTopic ? (
          // Quiz mode with no questions yet for this topic.
          <div className="h-full flex flex-col items-center justify-center gap-4 px-8 text-center">
            <Sparkles size={32} className="text-[#f36710]" />
            <p className="text-white/80 max-w-xs">
              No practice questions for <span className="font-semibold">{quizTopic.label}</span> yet.
            </p>
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="rounded-full bg-[#f36710] px-5 py-2.5 text-sm font-semibold text-white transition-opacity disabled:opacity-60"
            >
              {isGenerating ? 'Generating…' : 'Generate questions'}
            </button>
            <button onClick={exitQuizMode} className="text-sm text-white/60 hover:text-white/90">
              Back to feed
            </button>
          </div>
        ) : (
          cards.map((post, index) => {
            const type = post.type.toLowerCase();
            const cardProps = {
              variant: 'reel' as const,
              onCommentToggle: () => toggleComments(String(post.id)),
              onVote: handleVote,
              onSave: handleSave,
              onQuizAnswer: handleQuizAnswer,
              onFlip: handleFlip,
              onExpand: handleExpand,
              ...post,
            };

            let card = null;
            if (type === 'flashcard') card = <FlashCard {...cardProps} />;
            else if (type === 'mcq') card = <McqCard {...cardProps} />;
            else if (type === 'text') card = <TextCard {...cardProps} />;
            if (!card) return null;

            // The wrapper is the scroller's child, so it carries the snap/height
            // rules and the drag gesture; TrackedCard fills it for dwell tracking.
            // Only cards with a real topic are draggable (mock/organic-less cards aren't).
            const draggable = !useMockData && !!post.topicId;
            return (
              <motion.div
                key={post.id}
                className="h-[100svh] w-full snap-start"
                drag={draggable ? 'x' : false}
                dragDirectionLock
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.7}
                dragMomentum={false}
                onDragEnd={draggable ? handleCardDragEnd(post.topicId, post.tag) : undefined}
                whileDrag={{ scale: 0.97, cursor: 'grabbing' }}
                transition={{ type: 'spring', stiffness: 500, damping: 40 }}
              >
                <TrackedCard
                  postId={String(post.id)}
                  feedPosition={index}
                  surface={quizTopic ? 'topic' : 'feed'}
                  enabled={trackingEnabled}
                  className="h-full w-full"
                >
                  {card}
                </TrackedCard>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Quiz-mode banner: shows which topic is being drilled, with a way back out. */}
      {quizTopic && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 rounded-full bg-[#f36710] px-4 py-2 shadow-lg">
          <Sparkles size={16} className="text-white" />
          <span className="text-sm font-semibold text-white">Quiz: {quizTopic.label}</span>
          <button
            aria-label="Exit quiz"
            onClick={exitQuizMode}
            className="ml-1 rounded-full p-0.5 hover:bg-white/20 transition-colors"
          >
            <X size={16} className="text-white" />
          </button>
        </div>
      )}

      {/* Swipe hint — retires once the reader moves past the first card */}
      <div
        className={`absolute bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-1 transition-opacity duration-500 ${
          hasScrolled || quizTopic ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      >
        <ChevronUp size={20} className="animate-bounce text-white/80" />
        <p className="text-[11px] font-medium text-white/70">
          <span className="md:hidden">Swipe up for the next · swipe left to quiz this topic</span>
          <span className="hidden md:inline">
            Scroll <kbd className="font-sans">↑</kbd> <kbd className="font-sans">↓</kbd>, swipe left to quiz this topic
          </span>
        </p>
      </div>

      {/* Comments: side sheet on desktop, bottom sheet on mobile */}
      <div
        onClick={() => setCommentsOpen(false)}
        className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
          commentsOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />

      <aside
        aria-hidden={!commentsOpen}
        className={`fixed z-50 bg-white text-on-surface flex flex-col transition-transform duration-300 ease-out
          inset-x-0 bottom-0 h-[72svh] rounded-t-2xl
          md:inset-x-auto md:right-4 md:top-[5vh] md:bottom-auto md:h-[90vh] md:w-[400px] md:rounded-2xl
          ${commentsOpen ? 'translate-y-0 md:translate-x-0' : 'translate-y-full md:translate-y-0 md:translate-x-[calc(100%+2rem)]'}`}
      >
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-lg font-display">
            Comments{' '}
            <span className="text-outline font-normal tabular-nums">
              {commentsPost?.comments ?? 0}
            </span>
          </h3>
          <button
            aria-label="Close comments"
            className="p-2 hover:bg-gray-100 rounded-full transition-colors flex items-center justify-center"
            onClick={() => setCommentsOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {useMockData ? (
            // Mock ids aren't real posts, so there is nothing to fetch or post to.
            <p className="p-4 text-sm text-on-surface-variant">
              Comments are unavailable while the feed is offline.
            </p>
          ) : (
            <CommentsSection
              show={commentsOpen}
              postId={commentsPostId ?? undefined}
              onCommentCountChange={(delta) =>
                setCards((prev) =>
                  prev.map((card) =>
                    String(card.id) === commentsPostId
                      ? { ...card, comments: Math.max(0, card.comments + delta) }
                      : card,
                  ),
                )
              }
            />
          )}
        </div>
      </aside>
    </div>
  );
}
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronUp, X, Bell } from 'lucide-react';
import FlashCard from '@/components/cards/FlashCard';
import McqCard from '@/components/cards/McqCard';
import TextCard from '@/components/cards/TextContentCard';
import { CommentsSection } from '@/components/cards/Shared';
import { spacePosts } from '@/data/mockData';
import { useAuth } from '@/hooks/useAuth';
import { PostService } from '@/lib/posts';
import type { Post } from '@/types/post';

/** One card in the reel, shaped the same way the reel card variants expect. */
interface SpaceItem {
  id: string | number;
  type: string;
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
}

const postService = new PostService();

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
    author: post.creator?.user?.username || 'Unknown',
    time: relativeTime(post.published_at),
    upvotes: post.upvote_count || 0,
    comments: post.comment_count || 0,
    tags: post.tags || [],
    tag: post.tags?.[0] || 'General',
    // Alternate themes only for visual rhythm; the answer side is the real content.
    theme: index % 2 === 0 ? 'orange' : 'blue',
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
  const { user } = useAuth();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [cards, setCards] = useState<SpaceItem[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [hasScrolled, setHasScrolled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [useMockData, setUseMockData] = useState(false);

  const seenIdsRef = useRef<Set<string>>(new Set());
  // Guards the endless loader against concurrent/dup requests and stops it once
  // a fetch returns nothing new (the feed serves the same top ranks repeatedly).
  const loadingMoreRef = useRef(false);
  const exhaustedRef = useRef(false);

  const activePost = cards[activeIndex];

  /** Scroll a card into view by index (clamped). */
  const goTo = useCallback((index: number) => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const target = Math.max(0, Math.min(scroller.children.length - 1, index));
    scroller.children[target]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const loadBatch = useCallback(async () => {
    if (exhaustedRef.current || loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    try {
      const response = await postService.getFeed({ size: 15 });
      const fresh = response.items
        .map(mapPostToSpaceItem)
        .filter((item) => !seenIdsRef.current.has(String(item.id)));
      fresh.forEach((item) => seenIdsRef.current.add(String(item.id)));

      if (fresh.length > 0) {
        setCards((prev) => [...prev, ...fresh]);
        setUseMockData(false);
      } else {
        // No new posts anymore; stop paging instead of spinning forever.
        exhaustedRef.current = true;
      }
    } catch (error) {
      console.error('Failed to load learn space from API:', error);
    } finally {
      loadingMoreRef.current = false;
      setIsLoading(false);
    }
  }, []);

  // Initial load: hit the personalized feed; fall back to mock data (mirrors the
  // home feed's behavior) when the endpoint can't be reached.
  useEffect(() => {
    const bootstrap = async () => {
      setIsLoading(true);
      try {
        const response = await postService.getFeed({ size: 15 });
        const initial = response.items.map(mapPostToSpaceItem);
        seenIdsRef.current = new Set(initial.map((item) => String(item.id)));
        setCards(initial);
        setUseMockData(false);
      } catch (error) {
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
      } finally {
        setIsLoading(false);
      }
    };
    const timer = setTimeout(bootstrap, 150);
    return () => clearTimeout(timer);
  }, []);

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

      {/* Top bar */}
      <header className="fixed top-0 left-0 w-full z-50 pointer-events-none">
        <div className="h-24 bg-gradient-to-b from-black/70 via-black/30 to-transparent" />
        <div className="absolute inset-x-0 top-0 h-20 flex items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-3 pointer-events-auto">
            <button
              aria-label="Close learn space"
              onClick={() => router.push('/')}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm flex items-center justify-center transition-colors"
            >
              <X size={22} />
            </button>
            <p className="text-sm font-bold font-display">Learn Space</p>
          </div>

          <div className="flex items-center gap-3 pointer-events-auto">
            <Link
              href="/notifications"
              aria-label="Notifications"
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <Bell size={20} />
            </Link>
            <div className="w-10 h-10 rounded-full border-2 border-white/40 hover:border-white overflow-hidden bg-white/10 cursor-pointer transition-colors">
              {user?.avatar_url ? (
                <img
                  alt="Profile"
                  className="w-full h-full object-cover"
                  src={user.avatar_url}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sm font-bold text-white/90">
                  {user?.username?.slice(0, 2).toUpperCase() || 'ME'}
                </div>
              )}
            </div>
          </div>
        </div>

      </header>

      {/* The reel */}
      <div
        ref={scrollerRef}
        className="h-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide overscroll-contain relative z-10"
      >
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <div className="w-10 h-10 rounded-full border-2 border-white/20 border-t-[#f36710] animate-spin" />
          </div>
        ) : (
          cards.map((post) => {
            const type = post.type.toLowerCase();
            const cardProps = {
              variant: 'reel' as const,
              onCommentToggle: () => setCommentsOpen((open) => !open),
              ...post,
            };

            if (type === 'flashcard') return <FlashCard key={post.id} {...cardProps} />;
            if (type === 'mcq') return <McqCard key={post.id} {...cardProps} />;
            if (type === 'text') return <TextCard key={post.id} {...cardProps} />;
            return null;
          })
        )}
      </div>

      {/* Swipe hint — retires once the reader moves past the first card */}
      <div
        className={`absolute bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-1 transition-opacity duration-500 ${
          hasScrolled ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      >
        <ChevronUp size={20} className="animate-bounce text-white/80" />
        <p className="text-[11px] font-medium text-white/70">
          <span className="md:hidden">Swipe up for the next card</span>
          <span className="hidden md:inline">
            Scroll, or use <kbd className="font-sans">↑</kbd> <kbd className="font-sans">↓</kbd>
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
              {activePost?.comments ?? 0}
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
          <CommentsSection
            show={commentsOpen}
            postId={activePost ? String(activePost.id) : undefined}
          />
        </div>
      </aside>
    </div>
  );
}
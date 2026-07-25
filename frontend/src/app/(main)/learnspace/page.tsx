'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronUp, X, Bell } from 'lucide-react';
import FlashCard from '@/components/cards/FlashCard';
import McqCard from '@/components/cards/McqCard';
import TextCard from '@/components/cards/TextContentCard';
import { spacePosts } from '@/data/mockData';

/** One more page of cards. Ids stay unique so React keys don't collide. */
function nextBatch(batch: number) {
  return spacePosts.map((post) => ({ ...post, id: post.id + batch * 1000 }));
}

export default function SpaceReel() {
  const router = useRouter();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [cards, setCards] = useState(spacePosts);
  const [activeIndex, setActiveIndex] = useState(0);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [hasScrolled, setHasScrolled] = useState(false);

  const activePost = cards[activeIndex];

  /** Scroll a card into view by index (clamped). */
  const goTo = useCallback((index: number) => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const target = Math.max(0, Math.min(scroller.children.length - 1, index));
    scroller.children[target]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
          if (index >= sections.length - 2) {
            setCards((current) =>
              current.length === sections.length
                ? [...current, ...nextBatch(current.length / spacePosts.length)]
                : current,
            );
          }
        });
      },
      { root: scroller, threshold: 0.6 },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [cards.length]);

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
              <img
                alt="Profile"
                className="w-full h-full object-cover"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBoL6Tz-loSXPzAFM0ngTHJa_vd-cHY-twsdup-7NcFw33hdYuWamtSvCMzW-ZipgBpOHkTbwTYWN-yrfVSV86i5W8oiFWPpqp3Qj1VTIHGuU7gKeOdM3eJSMGXylGH1vowIdWiylOz0moZvWcFCMbvacxj4ZHeOdBckiFwZEGtqDIvBfGMVFqhDA42WA56ouAUC8J5z189MFkfIQWfouE7kv_lSUpn95a8XC9ddAgfENLq1vE_EzQ8crCz5kmw0ofUeOg6HG1gaFc "
              />
            </div>
          </div>
        </div>

      </header>

      {/* The reel */}
      <div
        ref={scrollerRef}
        className="h-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide overscroll-contain relative z-10"
      >
        {cards.map((post) => {
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
        })}
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

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {MOCK_COMMENTS.map((comment) => (
            <div key={comment.name} className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-[#fef3ea] text-[#f36710] flex items-center justify-center text-xs font-bold shrink-0">
                {comment.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="bg-gray-50 p-3 rounded-2xl rounded-tl-none">
                  <p className="font-bold text-xs text-on-surface">{comment.name}</p>
                  <p className="text-sm text-on-surface-variant">{comment.body}</p>
                </div>
                <div className="flex items-center gap-4 mt-1 ml-2">
                  <span className="text-[11px] text-on-surface-variant">{comment.time}</span>
                  <button className="text-[11px] font-bold text-on-surface-variant hover:text-primary transition-colors">
                    Reply
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-gray-100 flex items-center gap-3">
          <input
            className="flex-1 bg-gray-50 border-none rounded-full px-4 py-2 text-sm focus:ring-1 focus:ring-primary-container outline-none"
            placeholder="Add a comment..."
            type="text"
          />
          <button className="text-primary-container font-bold text-sm px-2">Post</button>
        </div>
      </aside>
    </div>
  );
}

const MOCK_COMMENTS = [
  {
    name: 'Alex_Study',
    body: 'This really helped me with my exam prep today. Simple and effective!',
    time: '12m',
  },
  {
    name: 'Nabin_QA',
    body: 'Got it wrong the first time, the explanation made it click though.',
    time: '48m',
  },
  {
    name: 'mira.learns',
    body: 'Would love a follow-up card that goes one level deeper on this.',
    time: '3h',
  },
];

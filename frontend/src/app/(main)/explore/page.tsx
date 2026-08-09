'use client';

import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { Search, SlidersHorizontal, Loader2, Sparkles } from 'lucide-react';
import FlashCard from '@/components/cards/FlashCard';
import McqCard from '@/components/cards/McqCard';
import TextCard from '@/components/cards/TextContentCard';
import ShareModal from '@/components/ui/ShareModal';
import { postService } from '@/lib/posts';
import { useAuth } from '@/hooks/useAuth';
import type { Post, TopicSection } from '@/types/post';

const FOR_YOU = 'for-you';
const TOPIC_PAGE_SIZE = 10;

interface CardActions {
  currentUserId?: string;
  onVote: (id: string, value: number) => Promise<void>;
  onSave: (id: string) => Promise<void>;
  onShare: (id: string | number) => void;
  onDelete: (id: string) => Promise<void>;
}

// Explore cards are full post cards: author header with follow + overflow menu
// (copy link / share / save / report / delete), interactive content (flip /
// answer / read-more), and a vote / comment / share / save action bar.
function renderExploreCard(post: Post, actions: CardActions): ReactNode {
  const author = post.creator?.user?.username || 'Unknown';
  const tag = post.tags?.[0] || 'General';
  const common = {
    id: post.id,
    author,
    creatorId: post.creator?.id,
    upvotes: post.upvote_count || 0,
    comments: post.comment_count || 0,
    userVote: post.user_vote,
    userSaved: post.user_saved,
    isOwner: actions.currentUserId != null && actions.currentUserId === post.creator?.user?.id,
    onVote: actions.onVote,
    onSave: actions.onSave,
    onShare: actions.onShare,
    onDelete: actions.onDelete,
  };

  if (post.content_type === 'flashcard') {
    return (
      <FlashCard variant="explore" tag={tag} question={post.flashcard?.front} answer={post.flashcard?.back} {...common} />
    );
  }
  if (post.content_type === 'mcq') {
    return (
      <McqCard
        variant="explore"
        tag={tag}
        question={post.mcq?.question}
        options={post.mcq?.options}
        correctIndex={post.mcq?.correct_index}
        explanation={post.mcq?.explanation}
        {...common}
      />
    );
  }
  // text and short_note both render as the text card
  return <TextCard variant="explore" tag={tag} title={post.title} content={post.body} {...common} />;
}

function CardGrid({ posts, actions }: { posts: Post[]; actions: CardActions }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 items-start">
      {posts.map((post) => (
        <div key={post.id}>{renderExploreCard(post, actions)}</div>
      ))}
    </div>
  );
}

export default function Explore() {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [forYou, setForYou] = useState<Post[]>([]);
  const [sections, setSections] = useState<TopicSection[]>([]);
  const [pages, setPages] = useState<Record<string, number>>({});
  const [loadingTopic, setLoadingTopic] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>(FOR_YOU);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [shareId, setShareId] = useState<string | number | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await postService.getExplore({
          for_you_size: 15,
          topic_size: TOPIC_PAGE_SIZE,
          topics_limit: 8,
        });
        if (!active) return;
        setForYou(res.for_you);
        setSections(res.topics);
        setError(false);
      } catch (err) {
        if (!active) return;
        console.error('Failed to load explore:', err);
        setError(true);
      } finally {
        if (active) setIsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const loadMore = useCallback(
    async (section: TopicSection) => {
      setLoadingTopic(section.topic_id);
      try {
        const next = (pages[section.topic_id] ?? 1) + 1;
        const res = await postService.getPosts({
          topic_id: section.topic_id,
          sort_by: 'top',
          page: next,
          size: TOPIC_PAGE_SIZE,
        });
        setSections((prev) =>
          prev.map((s) => {
            if (s.topic_id !== section.topic_id) return s;
            const existing = new Set(s.items.map((p) => p.id));
            const fresh = res.items.filter((p) => !existing.has(p.id));
            return { ...s, items: [...s.items, ...fresh], has_more: res.has_next };
          })
        );
        setPages((prev) => ({ ...prev, [section.topic_id]: next }));
      } catch (err) {
        console.error('Failed to load more posts for topic:', err);
        setSections((prev) =>
          prev.map((s) => (s.topic_id === section.topic_id ? { ...s, has_more: false } : s))
        );
      } finally {
        setLoadingTopic(null);
      }
    },
    [pages]
  );

  // Patch a post wherever it appears (For You and any topic rail) so its vote/save
  // state stays consistent across tabs.
  const patchPost = useCallback((id: string, patch: (p: Post) => Post) => {
    setForYou((prev) => prev.map((p) => (p.id === id ? patch(p) : p)));
    setSections((prev) =>
      prev.map((s) => ({ ...s, items: s.items.map((p) => (p.id === id ? patch(p) : p)) }))
    );
  }, []);

  const handleVote = useCallback(
    async (id: string, value: number) => {
      try {
        const updated = await postService.vote(id, value);
        patchPost(id, (p) => ({
          ...p,
          upvote_count: updated.upvote_count,
          downvote_count: updated.downvote_count,
          user_vote: updated.user_vote,
        }));
      } catch (err) {
        console.error('Failed to vote:', err);
        throw err; // let the card roll back its optimistic state
      }
    },
    [patchPost]
  );

  const handleSave = useCallback(
    async (id: string) => {
      try {
        const res = await postService.toggleSave(id);
        patchPost(id, (p) => ({ ...p, user_saved: res.saved, save_count: res.save_count }));
      } catch (err) {
        console.error('Failed to save:', err);
        throw err;
      }
    },
    [patchPost]
  );

  const handleShare = useCallback((id: string | number) => setShareId(id), []);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return;
    try {
      await postService.deletePost(id);
      setForYou((prev) => prev.filter((p) => p.id !== id));
      setSections((prev) => prev.map((s) => ({ ...s, items: s.items.filter((p) => p.id !== id) })));
    } catch (err) {
      console.error('Failed to delete post:', err);
    }
  }, []);

  const actions: CardActions = {
    currentUserId: user?.id,
    onVote: handleVote,
    onSave: handleSave,
    onShare: handleShare,
    onDelete: handleDelete,
  };

  const tabs = [{ key: FOR_YOU, label: 'For You' }, ...sections.map((s) => ({ key: s.topic_id, label: s.topic_name }))];
  const activeSection = sections.find((s) => s.topic_id === activeTab);
  const activePosts = activeTab === FOR_YOU ? forYou : (activeSection?.items ?? []);
  const isEmpty = !isLoading && !error && forYou.length === 0 && sections.length === 0;

  return (
    <main className="min-h-screen">
      {/* Search */}
      <section className="px-4 md:px-6 pt-3 md:pt-4 pb-3">
        <div className="max-w-[640px] mx-auto">
          <div
            className="flex items-center h-12 bg-white rounded-full shadow-sm border border-[#e1bfb1] px-4 md:px-5 gap-2 focus-within:ring-2 focus-within:ring-[#00658c]/20 transition-all"
            style={{ backgroundColor: 'rgba(243,103,16,0.03)' }}
          >
            <Search className="w-5 h-5 text-[#8d7165] shrink-0" strokeWidth={2} />
            <input
              className="flex-1 bg-transparent border-none focus:ring-0 outline-none text-[15px] text-[#1b1c1c] placeholder:text-[#8d7165]"
              placeholder="Search flashcards, notes, or creators..."
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button className="flex items-center justify-center gap-1 bg-[#e9e8e7] w-8 h-8 md:w-auto md:h-auto md:px-3 md:py-1.5 rounded-full text-xs font-semibold text-[#594137] hover:bg-[#efeded] transition-colors shrink-0">
              <SlidersHorizontal className="w-4 h-4 text-[#f36710] md:text-[#594137]" strokeWidth={2} />
              <span className="hidden md:inline">Filters</span>
            </button>
          </div>
        </div>
      </section>

      {/* Topic tabs — horizontally scrollable, sticky under the navbar */}
      {!isLoading && !error && !isEmpty && (
        <div className="sticky top-[68px] z-30 bg-[#f5f5f5]/95 backdrop-blur-sm border-b border-[#e9e8e7]">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar whitespace-nowrap px-4 md:px-6 py-3">
            {tabs.map((tab) => {
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`shrink-0 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[13px] md:text-sm font-semibold transition-all border ${
                    active
                      ? 'bg-[#f36710] text-white border-[#f36710] shadow-sm'
                      : 'bg-white text-[#594137] border-[#e1bfb1] hover:border-[#f36710]'
                  }`}
                >
                  {tab.key === FOR_YOU && <Sparkles className="w-3.5 h-3.5" strokeWidth={2.5} />}
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="px-4 md:px-6 pt-4 md:pt-6 pb-8">
        {isLoading && (
          <div className="flex items-center justify-center gap-2 text-[#8d7165] py-20">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Loading your explore feed...</span>
          </div>
        )}

        {error && (
          <div className="text-center py-20">
            <p className="text-[#594137] font-medium">Couldn&apos;t load the explore feed.</p>
            <p className="text-sm text-[#8d7165] mt-1">Please try again in a moment.</p>
          </div>
        )}

        {isEmpty && (
          <div className="text-center py-20">
            <p className="text-[#594137] font-medium">Nothing to explore yet.</p>
            <p className="text-sm text-[#8d7165] mt-1">Pick some interests to personalize your feed.</p>
          </div>
        )}

        {!isLoading && !error && !isEmpty && (
          <>
            {activePosts.length > 0 ? (
              <CardGrid posts={activePosts} actions={actions} />
            ) : (
              <p className="text-center text-[#8d7165] py-16">No posts in this topic yet.</p>
            )}

            {activeSection?.has_more && (
              <div className="flex justify-center pt-6">
                <button
                  onClick={() => loadMore(activeSection)}
                  disabled={loadingTopic === activeSection.topic_id}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-bold text-[#f36710] bg-white border border-[#e1bfb1] hover:border-[#f36710] transition-colors disabled:opacity-60"
                >
                  {loadingTopic === activeSection.topic_id ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Loading...
                    </>
                  ) : (
                    'Load more'
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <ShareModal isOpen={shareId !== null} onClose={() => setShareId(null)} contentId={shareId} />
    </main>
  );
}

'use client';

import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { Search, SlidersHorizontal, Loader2, Sparkles } from 'lucide-react';
import FlashCard from '@/components/cards/FlashCard';
import McqCard from '@/components/cards/McqCard';
import TextCard from '@/components/cards/TextContentCard';
import { postService } from '@/lib/posts';
import type { Post, TopicSection } from '@/types/post';

// Explore-variant cards are display-only, so we only need the preview fields.
function renderExploreCard(post: Post): ReactNode {
  const author = post.creator?.user?.username || 'Unknown';
  const tag = post.tags?.[0] || 'General';
  const upvotes = post.upvote_count || 0;

  if (post.content_type === 'flashcard') {
    return (
      <FlashCard
        variant="explore"
        question={post.flashcard?.front}
        author={author}
        upvotes={upvotes}
      />
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
        author={author}
        upvotes={upvotes}
      />
    );
  }

  // text and short_note both render as the text card
  return (
    <TextCard
      variant="explore"
      tag={tag}
      title={post.title}
      content={post.body}
      author={author}
      upvotes={upvotes}
    />
  );
}

function MasonryGrid({ posts }: { posts: Post[] }) {
  return (
    <div className="max-w-[1440px] w-full columns-2 md:columns-3 xl:columns-4 gap-3 md:gap-6">
      {posts.map((post) => (
        <div key={post.id} className="break-inside-avoid mb-3 md:mb-6">
          {renderExploreCard(post)}
        </div>
      ))}
    </div>
  );
}

// One topic rail. Owns its own "see all" pagination so it can pull more posts
// for just this topic via the existing filtered list endpoint.
function TopicRail({ section }: { section: TopicSection }) {
  const [posts, setPosts] = useState<Post[]>(section.items);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(section.has_more);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadMore = useCallback(async () => {
    setLoadingMore(true);
    try {
      const next = page + 1;
      const res = await postService.getPosts({
        topic_id: section.topic_id,
        sort_by: 'top',
        page: next,
        size: section.items.length || 10,
      });
      const existing = new Set(posts.map((p) => p.id));
      const fresh = res.items.filter((p) => !existing.has(p.id));
      setPosts((prev) => [...prev, ...fresh]);
      setPage(next);
      setHasMore(res.has_next);
    } catch (err) {
      console.error('Failed to load more posts for topic:', err);
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  }, [page, posts, section.items.length, section.topic_id]);

  return (
    <section className="w-full max-w-[1440px]">
      <div className="flex items-center justify-between mb-3 md:mb-4">
        <h2 className="text-lg md:text-xl font-bold text-[#1b1c1c]">{section.topic_name}</h2>
        {hasMore && (
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="flex items-center gap-1 text-[13px] md:text-sm font-bold text-[#f36710] hover:underline disabled:opacity-60"
          >
            {loadingMore ? <Loader2 className="w-4 h-4 animate-spin" /> : 'See all'}
          </button>
        )}
      </div>
      <MasonryGrid posts={posts} />
    </section>
  );
}

export default function Explore() {
  const [query, setQuery] = useState('');
  const [forYou, setForYou] = useState<Post[]>([]);
  const [topics, setTopics] = useState<TopicSection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await postService.getExplore({
          for_you_size: 15,
          topic_size: 10,
          topics_limit: 8,
        });
        if (!active) return;
        setForYou(res.for_you);
        setTopics(res.topics);
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

  const isEmpty = !isLoading && !error && forYou.length === 0 && topics.length === 0;

  return (
    <main className="min-h-screen bg-[#f5f5f5] pt-[104px] md:pt-[96px] pb-24 md:pb-16">
      {/* Search Section */}
      <section className="flex flex-col items-center px-4 md:px-10 pt-2 md:pt-10 pb-4 md:pb-6 w-full">
        <div className="w-full max-w-[720px] relative">
          <div
            className="flex items-center h-12 md:h-auto bg-white rounded-full shadow-sm border border-[#e1bfb1] px-4 md:px-6 gap-2 md:py-3.5 focus-within:ring-2 focus-within:ring-[#00658c]/20 transition-all"
            style={{ backgroundColor: 'rgba(243,103,16,0.03)' }}
          >
            <Search className="w-5 h-5 text-[#8d7165] md:mr-2 shrink-0" strokeWidth={2} />
            <input
              className="flex-1 bg-transparent border-none focus:ring-0 outline-none text-[15px] text-[#1b1c1c] placeholder:text-[#8d7165]"
              placeholder="Search for flashcards, notes, or creators..."
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className="hidden md:block h-6 w-[1px] bg-[#e1bfb1] mx-1" />
            <button className="flex items-center justify-center md:gap-1 bg-[#e9e8e7] w-8 h-8 md:w-auto md:h-auto md:px-4 md:py-1.5 rounded-full text-xs font-semibold text-[#594137] hover:bg-[#efeded] transition-colors shrink-0">
              <SlidersHorizontal className="w-4 h-4 text-[#f36710] md:text-[#594137]" strokeWidth={2} />
              <span className="hidden md:inline">Filters</span>
            </button>
          </div>
        </div>
      </section>

      {/* Content */}
      <div className="flex flex-col items-center gap-8 md:gap-12 w-full px-4 md:px-10">
        {isLoading && (
          <div className="flex items-center gap-2 text-[#8d7165] py-16">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Loading your explore feed...</span>
          </div>
        )}

        {error && (
          <div className="text-center py-16">
            <p className="text-[#594137] font-medium">Couldn&apos;t load the explore feed.</p>
            <p className="text-sm text-[#8d7165] mt-1">Please try again in a moment.</p>
          </div>
        )}

        {isEmpty && (
          <div className="text-center py-16">
            <p className="text-[#594137] font-medium">Nothing to explore yet.</p>
            <p className="text-sm text-[#8d7165] mt-1">Pick some interests to personalize your feed.</p>
          </div>
        )}

        {!isLoading && !error && (
          <>
            {/* For You */}
            {forYou.length > 0 && (
              <section className="w-full max-w-[1440px]">
                <div className="flex items-center gap-2 mb-3 md:mb-4">
                  <Sparkles className="w-5 h-5 text-[#f36710]" strokeWidth={2} />
                  <h2 className="text-lg md:text-xl font-bold text-[#1b1c1c]">For You</h2>
                </div>
                <MasonryGrid posts={forYou} />
              </section>
            )}

            {/* Topic sections */}
            {topics.map((section) => (
              <TopicRail key={section.topic_id} section={section} />
            ))}
          </>
        )}
      </div>
    </main>
  );
}

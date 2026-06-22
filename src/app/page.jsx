'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import BottomBar from '@/components/layout/BottomBar';
import CreatorCard from '@/components/cards/CreatorCard';
import FlashCard from '@/components/cards/FlashCard';
import TextCard from '@/components/cards/TextContentCard';
import McqCard from '@/components/cards/McqCard';
import { FeedSkeleton } from '@/components/ui/Skeleton';
import ShareModal from '@/components/ui/ShareModal';
import { feedItems } from '@/data/feedData';

export default function HomePage() {
  const [isLoading, setIsLoading] = useState(true);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareContentId, setShareContentId] = useState(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);

    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', checkScreenSize);
    };
  }, []);

  const handleShare = (id) => {
    setShareContentId(id);
    setShareModalOpen(true);
  };

  const handleCloseShare = () => {
    setShareModalOpen(false);
    setShareContentId(null);
  };

  return (
    <div className="flex min-h-screen">
      <main className={`flex-1 ${isMobile ? 'px-4 py-6 pb-[100px]' : 'px-4 md:px-[64px] py-12 pt-32 pb-12'}`}>
        <CreatorCard />

        {isLoading ? (
          <FeedSkeleton />
        ) : (
          <div className={`${isMobile ? 'flex flex-col gap-6' : 'max-w-4xl mx-auto space-y-8'}`}>
            {feedItems.map((item) => {
              if (item.type === 'flashcard') {
                return <FlashCard key={item.id} {...item} onShare={handleShare} />;
              } else if (item.type === 'text') {
                return <TextCard key={item.id} {...item} onShare={handleShare} />;
              } else if (item.type === 'mcq') {
                return <McqCard key={item.id} {...item} onShare={handleShare} />;
              }
              return null;
            })}
          </div>
        )}
      </main>

      <BottomBar />

      {!isMobile && (
        <button className="fixed bottom-8 right-8 w-16 h-16 rounded-full bg-primary-container text-white shadow-2xl shadow-primary/40 flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-50">
          <span className="material-symbols-outlined text-3xl">add</span>
        </button>
      )}

      <ShareModal isOpen={shareModalOpen} onClose={handleCloseShare} contentId={shareContentId} />
    </div>
  );
}
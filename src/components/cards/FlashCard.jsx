'use client';

import { useState, useEffect } from 'react';
import { CardHeader, EngagementBar, CommentsSection } from '@/components/ui/CardParts';

export default function FlashCard({ item, onShare }) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isCommentsExpanded, setIsCommentsExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => setIsMobile(window.innerWidth < 768);
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const toggleFlip = () => setIsFlipped(!isFlipped);
  const toggleComments = () => setIsCommentsExpanded(!isCommentsExpanded);

  if (isMobile) {
    return (
      <article className="bg-card-bg rounded-xl shadow-md overflow-hidden">
        <div className="p-4">
          <CardHeader
            author={item.author}
            avatar={item.avatar}
            timeAgo={item.timeAgo}
            category={item.category}
            isMobile={true}
          />
          <div
            className="perspective-1000 w-full h-48 mb-4 cursor-pointer"
            onClick={toggleFlip}
          >
            <div className={`card-flip-inner relative w-full h-full preserve-3d ${isFlipped ? 'card-flipped' : ''}`}>
              <div className="absolute inset-0 backface-hidden bg-orange-tint rounded-xl flex flex-col items-center justify-center p-6 text-center border border-primary-fixed">
                <p className="font-headline-sm text-on-primary-container px-4">{item.question}</p>
                <span className="mt-4 text-label-md text-primary opacity-60 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">touch_app</span> Tap to reveal
                </span>
              </div>
              <div className="absolute inset-0 backface-hidden rotate-y-180 bg-primary rounded-xl flex flex-col items-center justify-center p-6 text-center border border-primary">
                <p className="font-headline-md text-white px-4">{item.answer}</p>
                {item.additionalInfo && (
                  <p className="text-body-sm text-white/90 mt-2 px-4">{item.additionalInfo}</p>
                )}
              </div>
            </div>
          </div>
          <EngagementBar
            likes={item.likes}
            dislikes={item.dislikes}
            commentsCount={item.comments.length}
            onToggleComments={toggleComments}
            isCommentsExpanded={isCommentsExpanded}
            onShare={() => onShare(item.id)}
            id={item.id}
            isMobile={true}
          />
          <CommentsSection
            comments={item.comments}
            isExpanded={isCommentsExpanded}
            onToggleComments={toggleComments}
            isMobile={true}
          />
        </div>
      </article>
    );
  }

  return (
    <article className="glass-card rounded-2xl overflow-hidden hover-lift transition-all duration-300">
      <CardHeader
        author={item.author}
        avatar={item.avatar}
        timeAgo={item.timeAgo}
        category={item.category}
      />
      <div
        className="relative w-full h-[300px] perspective-1000 group/flashcard cursor-pointer"
        onClick={toggleFlip}
      >
        <div className={`flashcard-inner relative w-full h-full flex flex-col items-center justify-center ${isFlipped ? 'is-flipped' : ''}`}>
          <div className="flashcard-front absolute inset-0 p-8 flex flex-col items-center justify-center bg-gradient-to-br from-white to-surface-container-low">
            <h2 className="text-headline-lg font-headline-lg text-on-surface mb-4 text-center px-8">
              {item.question}
            </h2>
            <p className="text-primary font-bold text-sm flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">touch_app</span> Tap to reveal answer
            </p>
          </div>
          <div className="flashcard-back absolute inset-0 p-8 flex flex-col items-center justify-center bg-primary-container text-white">
            <h2 className="text-headline-lg font-headline-lg text-white mb-4 text-center px-8">
              {item.answer}
            </h2>
            <p className="text-white/80 text-sm">Tap to see question</p>
          </div>
        </div>
      </div>
      <EngagementBar
        likes={item.likes}
        dislikes={item.dislikes}
        commentsCount={item.comments.length}
        onToggleComments={toggleComments}
        isCommentsExpanded={isCommentsExpanded}
        onShare={() => onShare(item.id)}
        id={item.id}
      />
      <CommentsSection
        comments={item.comments}
        isExpanded={isCommentsExpanded}
        onToggleComments={toggleComments}
      />
    </article>
  );
}
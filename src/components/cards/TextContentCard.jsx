'use client';

import { useState, useEffect } from 'react';
import { CardHeader, EngagementBar, CommentsSection } from '@/components/ui/CardParts';

export default function TextContentCard({ item, onShare }) {
  const [isCommentsExpanded, setIsCommentsExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => setIsMobile(window.innerWidth < 768);
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

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
          <div className="mb-4">
            <h3 className="font-headline-sm text-on-surface mb-2">{item.title}</h3>
            <p className="text-body-md text-on-surface-variant">{item.content}</p>
            <button className="text-secondary font-label-lg mt-3">Read more...</button>
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
      <div className="p-8 pb-4">
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-secondary-fixed flex items-center justify-center text-on-secondary-fixed font-bold">
              {typeof item.avatar === 'string' && item.avatar.length <= 2 ? item.avatar : 'JD'}
            </div>
            <div>
              <p className="font-label-sm text-label-sm text-on-surface">{item.author}</p>
              <p className="text-xs text-outline">{item.timeAgo}</p>
            </div>
          </div>
          <button className="material-symbols-outlined text-outline">more_horiz</button>
        </div>
        <h3 className="font-headline-md text-headline-md text-on-surface mb-4">{item.title}</h3>
        <p className="font-body-lg text-body-lg text-on-surface-variant leading-relaxed mb-6">
          {item.content}
        </p>
        <a
          className="text-secondary font-bold hover:text-on-secondary-fixed-variant hover:underline flex items-center gap-1 mb-4"
          href="#"
        >
          Read more...
        </a>
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
'use client';

import { useState, useEffect } from 'react';
import { CardHeader, EngagementBar, CommentsSection } from '@/components/ui/CardParts';

export default function McqCard({ item, onShare }) {
  const [selectedOption, setSelectedOption] = useState(null);
  const [isCommentsExpanded, setIsCommentsExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => setIsMobile(window.innerWidth < 768);
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const handleOptionSelect = (index) => {
    setSelectedOption(index);
  };

  const toggleComments = () => setIsCommentsExpanded(!isCommentsExpanded);
  const optionLetters = ['A', 'B', 'C', 'D'];

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
            <p className="font-headline-sm text-on-surface mb-4">{item.question}</p>
            <div className="flex flex-col gap-2.5">
              {item.options.map((option, index) => {
                const isCorrect = index === item.correctAnswerIndex;
                const isSelected = selectedOption === index;
                const showResult = selectedOption !== null;

                let borderColor = 'border-border-subtle';
                let bgColor = 'bg-white';
                let textColor = 'text-on-surface';
                let markerClasses = 'border border-border-subtle';

                if (showResult) {
                  if (isCorrect) {
                    borderColor = 'border-primary';
                    bgColor = 'bg-orange-tint';
                    textColor = 'text-primary font-semibold';
                    markerClasses = 'border-4 border-primary';
                  } else if (isSelected) {
                    borderColor = 'border-red-500';
                    bgColor = 'bg-red-50';
                    textColor = 'text-red-500';
                    markerClasses = 'border-4 border-red-500';
                  }
                }

                return (
                  <button
                    key={index}
                    className={`w-full p-4 text-left border ${borderColor} rounded-xl font-body-md hover:bg-orange-tint hover:border-primary transition-colors flex justify-between items-center group ${bgColor}`}
                    onClick={() => handleOptionSelect(index)}
                  >
                    <span className={textColor}>
                      {optionLetters[index]}) {option}
                    </span>
                    <span className={`w-5 h-5 rounded-full ${markerClasses}`}></span>
                  </button>
                );
              })}
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
      <div className="p-6 bg-surface-container-high/50 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-secondary">
            <div className="w-full h-full bg-secondary flex items-center justify-center text-white font-bold">
              {typeof item.avatar === 'string' && item.avatar.length <= 2 ? item.avatar : 'K'}
            </div>
          </div>
          <div>
            <p className="font-label-sm text-label-sm text-on-surface">{item.author}</p>
            <p className="text-xs text-outline">{item.timeAgo}</p>
          </div>
        </div>
        <button className="material-symbols-outlined text-outline">more_horiz</button>
      </div>
      <div className="p-8">
        <h4 className="font-headline-md text-headline-md text-on-surface mb-8">{item.question}</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {item.options.map((option, index) => {
            const isCorrect = index === item.correctAnswerIndex;
            const isSelected = selectedOption === index;
            const showResult = selectedOption !== null;

            let borderColor = 'border-outline-variant';
            let bgColor = 'bg-surface-container';
            let textColor = 'text-on-surface-variant';
            let markerBg = 'bg-surface-container';

            if (showResult) {
              if (isCorrect) {
                borderColor = 'border-green-500';
                bgColor = 'bg-green-50';
                textColor = 'text-primary';
                markerBg = 'bg-green-500';
              } else if (isSelected) {
                borderColor = 'border-red-500';
                bgColor = 'bg-red-50';
                textColor = 'text-error';
                markerBg = 'bg-red-500';
              }
            }

            return (
              <button
                key={index}
                className={`flex items-center gap-4 p-4 rounded-xl border ${borderColor} hover:border-primary transition-all text-left group ${bgColor}`}
                onClick={() => handleOptionSelect(index)}
              >
                <span
                  className={`w-10 h-10 rounded-lg ${markerBg} flex items-center justify-center font-bold ${textColor} group-hover:bg-primary group-hover:text-white transition-colors`}
                >
                  {optionLetters[index]}
                </span>
                <span className="font-body-md text-body-md">{option}</span>
              </button>
            );
          })}
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
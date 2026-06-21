'use client';

import { useState } from 'react';

export function FeedActions({ upvotes, downvotes, comments }: any) {
  return (
    <div className="p-4 border-t border-surface-variant flex justify-between items-center bg-white">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-1 bg-surface-container px-3 py-1.5 rounded-full">
          <button className="material-symbols-outlined text-primary hover:text-primary transition-colors">arrow_upward</button>
          <span className="font-bold text-sm mx-1">{upvotes}</span>
          <div className="w-px h-3 bg-outline-variant mx-1"></div>
          <button className="material-symbols-outlined text-on-surface-variant hover:text-error transition-colors">arrow_downward</button>
          <span className="font-bold text-sm ml-1">{downvotes}</span>
        </div>
        <button className="flex items-center gap-2 text-secondary hover:bg-surface-container py-2 px-3 rounded-lg transition-colors">
          <span className="material-symbols-outlined">forum</span>
          <span className="font-medium text-sm">{comments}</span>
        </button>
      </div>
      <div className="flex gap-2">
        <button className="material-symbols-outlined text-secondary p-2 hover:bg-surface-container rounded-full transition-colors">
          share
        </button>
      </div>
    </div>
  );
}

export function ReelActions({ upvotes, comments, onCommentToggle }: any) {
  const [voted, setVoted] = useState(false);

  return (
    <div className="absolute left-[calc(50%+230px)] top-1/2 -translate-y-1/2 flex flex-col gap-4 z-30">
      <div className="flex flex-col items-center gap-1">
        <button 
          onClick={() => setVoted(!voted)}
          className={`w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-all text-[#1a1a1a] ${voted ? 'text-[#f36710]' : ''}`}
        >
          <span className="material-symbols-outlined text-[24px]">arrow_upward</span>
        </button>
        <span className="text-white text-[12px] font-medium drop-shadow-md">{upvotes}</span>
      </div>
      
      <button className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-all text-[#1a1a1a] hover:bg-gray-50">
        <span className="material-symbols-outlined text-[24px]">arrow_downward</span>
      </button>

      <div className="flex flex-col items-center gap-1 mt-2">
        <button 
          onClick={onCommentToggle}
          className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-all text-[#1a1a1a] hover:bg-gray-50"
        >
          <span className="material-symbols-outlined text-[22px]">chat_bubble</span>
        </button>
        <span className="text-white text-[12px] font-medium drop-shadow-md">{comments}</span>
      </div>

      <button className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-all text-[#1a1a1a] hover:bg-gray-50 mt-2">
        <span className="material-symbols-outlined text-[22px]">share</span>
      </button>
    </div>
  );
}

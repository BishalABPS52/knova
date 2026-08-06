'use client';

import { useState, useEffect } from 'react';

export default function CreatorCard({ onCreateClick }: { onCreateClick?: () => void }) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  if (isMobile) {
    return (
      <div className="bg-white px-4 py-6 border-b border-[#e5e5e5] shadow-sm mb-6">
        <div className="flex flex-col gap-4">
          <div className="relative">
            <textarea
              className="w-full bg-[#f7f7f7] border-none rounded-xl px-4 py-3 text-[15px] leading-[22px] focus:ring-2 focus:ring-[#f36710]/20 placeholder:text-[#8a7a72]/70 text-[#1b1c1c] resize-none outline-none"
              placeholder="Write your content here...."
              rows={2}
              onClick={onCreateClick}
            ></textarea>
          </div>
          <button
            onClick={onCreateClick}
            className="bg-[#f36710] text-white w-full h-12 rounded-xl font-semibold text-lg flex items-center justify-center active:scale-95 transition-transform shadow-lg shadow-[#f36710]/20"
          >
            Create
          </button>
        </div>
      </div>
    );
  }

  return (
    <section className="max-w-4xl mx-auto text-center mb-12">
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-[#f36710] to-[#00658c] opacity-10 blur rounded-2xl group-hover:opacity-20 transition duration-1000 group-hover:duration-200"></div>
        <div className="relative bg-white p-6 rounded-2xl shadow-xl flex flex-col md:flex-row items-center gap-4 border border-[#e4e2e2]">
          <div className="flex-1 w-full text-left">
            <input
              className="w-full text-[20px] leading-[28px] font-semibold border-none focus:ring-0 placeholder-[#8a7a72]/40 bg-transparent py-4 outline-none"
              placeholder="Write a topic to generate content..."
              type="text"
              onFocus={onCreateClick}
            />
          </div>
          <button
            onClick={onCreateClick}
            className="w-full md:w-auto bg-[#f36710] text-white font-bold px-10 py-4 rounded-xl hover:bg-[#d95a0d] transition-all active:scale-95 shadow-lg shadow-[#f36710]/20"
          >
            Create
          </button>
        </div>
      </div>
    </section>
  );
}
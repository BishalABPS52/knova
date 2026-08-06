'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, SlidersHorizontal, BookOpen, HelpCircle, FileText } from 'lucide-react';
import FlashCard from '@/components/cards/FlashCard';
import McqCard from '@/components/cards/McqCard';
import TextCard from '@/components/cards/TextContentCard';
import { exploreFilters, explorePosts } from '@/data/mockData';

export default function Explore() {
  const [activeFilter, setActiveFilter] = useState<string>('All');
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <main className="min-h-screen bg-[#f5f5f5] pt-[104px] md:pt-[96px] pb-24 md:pb-16">
      {/* Search Section */}
      <section className="flex flex-col items-center px-4 md:px-10 pt-2 md:pt-10 pb-4 md:pb-6 w-full">
        <div className="w-full max-w-[720px] relative" ref={searchRef}>
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
              onFocus={() => setSearchOpen(true)}
            />
            <div className="hidden md:block h-6 w-[1px] bg-[#e1bfb1] mx-1" />
            <button className="flex items-center justify-center md:gap-1 bg-[#e9e8e7] w-8 h-8 md:w-auto md:h-auto md:px-4 md:py-1.5 rounded-full text-xs font-semibold text-[#594137] hover:bg-[#efeded] transition-colors shrink-0">
              <SlidersHorizontal className="w-4 h-4 text-[#f36710] md:text-[#594137]" strokeWidth={2} />
              <span className="hidden md:inline">Filters</span>
            </button>
          </div>

          {/* Search Dropdown */}
          {searchOpen && (
            <div
              className="absolute top-full left-0 right-0 mt-2 md:mt-3 bg-white rounded-xl shadow-xl border border-[#e9e8e7] overflow-hidden z-50"
              style={{ backgroundColor: 'rgba(243,103,16,0.02)' }}
            >
              <div className="p-4 space-y-1">
                <p className="text-[11px] font-bold text-[#8d7165] uppercase tracking-widest mb-2 px-1">
                  Recent Results
                </p>

                <button className="w-full flex items-center gap-3 p-2.5 hover:bg-[#efeded] rounded-lg transition-colors text-left group">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: 'rgba(243,103,16,0.08)' }}
                  >
                    <BookOpen className="w-5 h-5 text-[#f36710]" strokeWidth={2} />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-[#1b1c1c] group-hover:text-[#f36710]">
                      Data Structures Flashcards
                    </p>
                    <span
                      className="text-[10px] text-[#f36710] px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: 'rgba(243,103,16,0.08)' }}
                    >
                      Flashcards
                    </span>
                  </div>
                </button>

                <button className="w-full flex items-center gap-3 p-2.5 hover:bg-[#efeded] rounded-lg transition-colors text-left group">
                  <div className="w-10 h-10 rounded-lg bg-[#e0f6fe] flex items-center justify-center shrink-0">
                    <HelpCircle className="w-5 h-5 text-[#00658c]" strokeWidth={2} />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-[#1b1c1c] group-hover:text-[#00658c]">
                      Scheduling Algorithms Mock Test
                    </p>
                    <span className="text-[10px] text-[#00658c] bg-[#e0f6fe] px-2 py-0.5 rounded-full">
                      MCQ
                    </span>
                  </div>
                </button>

                <button className="w-full flex items-center gap-3 p-2.5 hover:bg-[#efeded] rounded-lg transition-colors text-left group">
                  <div className="w-10 h-10 rounded-lg bg-[#efeded] flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-[#594137]" strokeWidth={2} />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-[#1b1c1c] group-hover:text-[#f36710]">
                      TCP/IP Protocol Suite
                    </p>
                    <span className="text-[10px] text-[#594137] bg-[#efeded] px-2 py-0.5 rounded-full">
                      Note
                    </span>
                  </div>
                </button>
              </div>
              <button className="w-full text-center py-2.5 text-[#f36710] font-bold text-[13px] border-t border-[#e9e8e7] hover:bg-[#efeded] transition-colors">
                See all results
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Filter Chips */}
      <section className="mb-6 md:mb-8 flex justify-center w-full">
        <div className="flex items-center gap-2 md:gap-3 overflow-x-auto pb-2 md:pb-4 no-scrollbar whitespace-nowrap px-4 md:px-10 max-w-full">
          {exploreFilters.map((f: string) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`shrink-0 px-4 md:px-5 py-1.5 md:py-2 rounded-full text-[13px] md:text-sm font-semibold transition-all border ${
                activeFilter === f
                  ? 'bg-[#f36710] text-white border-[#f36710] shadow-sm'
                  : 'bg-white text-[#594137] border-[#e1bfb1] hover:border-[#f36710]'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </section>

      {/* Masonry Grid */}
      <section className="flex justify-center w-full px-4 md:px-10">
        <div className="max-w-[1440px] w-full columns-2 md:columns-3 xl:columns-4 gap-3 md:gap-6">
          {explorePosts.map((post) => {
            if (post.type === 'FlashCard') {
              return (
                <div key={post.id} className="break-inside-avoid mb-3 md:mb-6">
                  <FlashCard variant="explore" {...post} />
                </div>
              );
            } else if (post.type === 'mcq') {
              return (
                <div key={post.id} className="break-inside-avoid mb-3 md:mb-6">
                  <McqCard variant="explore" {...post} />
                </div>
              );
            } else if (post.type === 'text') {
              return (
                <div key={post.id} className="break-inside-avoid mb-3 md:mb-6">
                  <TextCard variant="explore" {...post} />
                </div>
              );
            }
            return null;
          })}
        </div>
      </section>
    </main>
  );
}
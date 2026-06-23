'use client';

import { useState, useEffect } from 'react';

export function FeedSkeleton() {
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
      <div className="flex flex-col gap-6">
        {[...Array(3)].map((_, i) => (
          <article key={i} className="bg-card-bg rounded-xl shadow-md overflow-hidden animate-pulse">
            <div className="p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-gray-200"></div>
                <div>
                  <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-16"></div>
                </div>
              </div>
              {i % 3 === 0 ? (
                <div className="w-full h-48 mb-4 bg-gray-200 rounded-xl"></div>
              ) : i % 3 === 1 ? (
                <div className="mb-4">
                  <div className="h-5 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-5/6 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-4/6"></div>
                </div>
              ) : (
                <div className="mb-4">
                  <div className="h-5 bg-gray-200 rounded w-3/4 mb-4"></div>
                  {[...Array(4)].map((_, j) => (
                    <div key={j} className="h-12 bg-gray-200 rounded-xl mb-2.5"></div>
                  ))}
                </div>
              )}
              <div className="flex items-center justify-between pt-2 border-t border-border-subtle/50">
                <div className="flex items-center gap-4">
                  <div className="flex items-center bg-surface-container-low rounded-full px-3 py-1.5 gap-3">
                    <div className="flex items-center gap-1">
                      <div className="w-5 h-5 bg-gray-200 rounded"></div>
                      <div className="h-4 w-6 bg-gray-200 rounded"></div>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-5 h-5 bg-gray-200 rounded"></div>
                      <div className="h-4 w-4 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 bg-gray-200 rounded"></div>
                    <div className="h-4 w-4 bg-gray-200 rounded"></div>
                  </div>
                </div>
                <div className="w-5 h-5 bg-gray-200 rounded"></div>
              </div>
            </div>
          </article>
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="glass-card rounded-2xl overflow-hidden animate-pulse">
          <div className="p-6 border-b border-surface-variant flex justify-between items-center bg-surface-container-lowest">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-200"></div>
              <div>
                <div className="h-3 bg-gray-200 rounded w-16 mb-1"></div>
                <div className="h-2 bg-gray-200 rounded w-12"></div>
              </div>
            </div>
            <div className="w-5 h-5 bg-gray-200 rounded"></div>
          </div>
          {i % 3 === 0 ? (
            <div className="w-full h-[300px] bg-gray-200"></div>
          ) : i % 3 === 1 ? (
            <div className="p-8 pb-4">
              <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-4/6 mb-6"></div>
              <div className="h-4 w-24 bg-gray-200 rounded"></div>
            </div>
          ) : (
            <div className="p-8">
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-8"></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                {[...Array(4)].map((_, j) => (
                  <div key={j} className="flex items-center gap-4 p-4 rounded-xl border border-gray-200">
                    <div className="w-10 h-10 rounded-lg bg-gray-200"></div>
                    <div className="h-4 bg-gray-200 rounded w-full"></div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="p-4 border-t border-surface-variant flex justify-between items-center bg-surface-container-lowest">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-1 bg-surface-container px-3 py-1.5 rounded-full">
                <div className="w-5 h-5 bg-gray-200 rounded"></div>
                <div className="h-3 w-6 bg-gray-200 rounded"></div>
                <div className="w-px h-3 bg-gray-200 mx-1"></div>
                <div className="w-5 h-5 bg-gray-200 rounded"></div>
                <div className="h-3 w-4 bg-gray-200 rounded"></div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 bg-gray-200 rounded"></div>
                <div className="h-3 w-4 bg-gray-200 rounded"></div>
              </div>
            </div>
            <div className="flex gap-2">
              <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
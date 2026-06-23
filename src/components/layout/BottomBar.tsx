'use client';

import { useState, useEffect } from 'react';

export default function BottomBar() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  if (!isMobile) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-[390px] mx-auto h-[64px] bg-white border-t border-border-subtle flex items-center justify-around z-50">
      <div className="flex flex-col items-center justify-center gap-0.5 text-primary">
        <span className="material-symbols-outlined active-icon">home</span>
        <span className="text-[10px] font-semibold">Home</span>
      </div>
      <div className="flex flex-col items-center justify-center gap-0.5 text-on-surface-variant">
        <span className="material-symbols-outlined">school</span>
        <span className="text-[10px] font-medium">Space</span>
      </div>
      <div className="relative -top-4">
        <button className="w-[56px] h-[56px] bg-primary rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform text-white">
          <span className="material-symbols-outlined text-[32px]">add</span>
        </button>
      </div>
      <div className="flex flex-col items-center justify-center gap-0.5 text-on-surface-variant">
        <span className="material-symbols-outlined">explore</span>
        <span className="text-[10px] font-medium">Explore</span>
      </div>
      <div className="flex flex-col items-center justify-center gap-0.5 text-on-surface-variant">
        <span className="material-symbols-outlined">person</span>
        <span className="text-[10px] font-medium">Profile</span>
      </div>
    </nav>
  );
}
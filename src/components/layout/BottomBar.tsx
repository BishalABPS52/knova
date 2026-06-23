'use client';

import { useState, useEffect } from 'react';

interface BottomBarProps {
  onOpenCreate?: () => void;
}

export default function BottomBar({ onOpenCreate }: BottomBarProps) {
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
    <nav className="fixed bottom-0 w-full max-w-[390px] mx-auto left-0 right-0 z-50 rounded-t-xl bg-surface shadow-[0_-4px_12px_rgba(0,0,0,0.1)] flex justify-around items-center h-20 px-2 pb-2">
      <a className="flex flex-col items-center justify-center text-[#f36710] font-semibold active:scale-90 transition-transform duration-200" href="#">
        <span className="material-symbols-outlined active-icon text-[#f36710]">home</span>
        <span className="text-[10px] font-medium mt-1">Home</span>
      </a>
      <a className="flex flex-col items-center justify-center text-on-surface-variant active:scale-90 transition-transform duration-200" href="#">
        <span className="material-symbols-outlined">school</span>
        <span className="text-[10px] font-medium mt-1">Space</span>
      </a>
      <button 
        onClick={onOpenCreate}
        className="flex flex-col items-center justify-center active:scale-90 transition-transform duration-200 relative -top-2"
      >
        <div className="w-14 h-14 bg-primary rounded-full flex items-center justify-center shadow-lg shadow-primary/30">
          <span className="material-symbols-outlined text-white text-[32px]">add</span>
        </div>
        <span className="text-[10px] font-medium mt-1 text-primary">Create</span>
      </button>
      <a className="flex flex-col items-center justify-center text-on-surface-variant active:scale-90 transition-transform duration-200" href="#">
        <span className="material-symbols-outlined">explore</span>
        <span className="text-[10px] font-medium mt-1">Explore</span>
      </a>
      <a className="flex flex-col items-center justify-center text-on-surface-variant active:scale-90 transition-transform duration-200" href="#">
        <span className="material-symbols-outlined">person</span>
        <span className="text-[10px] font-medium mt-1">Profile</span>
      </a>
    </nav>
  );
}
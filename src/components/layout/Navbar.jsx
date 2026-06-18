'use client';

import { useState, useEffect } from 'react';

export default function Navbar() {
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
      <nav className="sticky top-0 z-50 w-full h-[56px] bg-white flex items-center justify-between px-4 border-b border-border-subtle">
        <div className="flex items-center gap-1.5">
          <span 
            className="material-symbols-outlined text-primary" 
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            auto_awesome
          </span>
          <h1 className="font-bold text-[22px] tracking-tight">
            <span className="text-primary">K</span>
            <span className="text-secondary">nova</span>
          </h1>
        </div>
        <div className="relative active:scale-95 transition-transform cursor-pointer">
          <span className="material-symbols-outlined text-[#1a1a1a]">notifications</span>
          <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-error rounded-full border-2 border-white"></span>
        </div>
      </nav>
    );
  }

  return (
    <header className="w-full top-0 z-50 bg-surface dark:bg-surface-dim shadow-sm flex justify-between items-center px-6 lg:px-[64px] py-4 fixed">
      <div className="flex items-center gap-6 flex-1">
        <div className="flex items-center gap-2">
          <span 
            className="material-symbols-outlined text-primary text-3xl" 
            style={{ fontVariationSettings: "'FILL' 1, 'wght' 700" }}
          >
            auto_awesome
          </span>
          <h1 className="font-bold text-2xl tracking-tight">
            <span className="text-primary">K</span>
            <span className="text-secondary">nova</span>
          </h1>
        </div>
        <nav className="hidden xl:flex items-center gap-1 flex-1 justify-center">
          <a
            className="text-primary-container font-bold flex items-center gap-2 py-2 px-4 rounded-xl bg-primary-container/10"
            href="#"
          >
            <span 
              className="material-symbols-outlined text-xl" 
              style={{ fontVariationSettings: "'FILL' 1, 'wght' 700" }}
            >
              home
            </span>
            <span className="font-bold text-label-sm">Home</span>
          </a>
          <a
            className="text-on-surface-variant hover:bg-surface-container-high transition-colors flex items-center gap-2 py-2 px-4 rounded-xl group"
            href="#"
          >
            <span 
              className="material-symbols-outlined text-xl group-hover:text-primary transition-colors" 
              style={{ fontVariationSettings: "'FILL' 0, 'wght' 600" }}
            >
              school
            </span>
            <span className="font-semibold text-label-sm">Space</span>
          </a>
          <a
            className="text-on-surface-variant hover:bg-surface-container-high transition-colors flex items-center gap-2 py-2 px-4 rounded-xl group"
            href="#"
          >
            <span 
              className="material-symbols-outlined text-xl group-hover:text-primary transition-colors" 
              style={{ fontVariationSettings: "'FILL' 0, 'wght' 600" }}
            >
              explore
            </span>
            <span className="font-semibold text-label-sm">Explore</span>
          </a>
          <a
            className="text-on-surface-variant hover:bg-surface-container-high transition-colors flex items-center gap-2 py-2 px-4 rounded-xl group"
            href="#"
          >
            <span 
              className="material-symbols-outlined text-xl group-hover:text-primary transition-colors" 
              style={{ fontVariationSettings: "'FILL' 0, 'wght' 600" }}
            >
              person
            </span>
            <span className="font-semibold text-label-sm">Profile</span>
          </a>
          <a
            className="text-on-surface-variant hover:bg-surface-container-high transition-colors flex items-center gap-2 py-2 px-4 rounded-xl group"
            href="#"
          >
            <span 
              className="material-symbols-outlined text-xl group-hover:text-primary transition-colors" 
              style={{ fontVariationSettings: "'FILL' 0, 'wght' 600" }}
            >
              settings
            </span>
            <span className="font-semibold text-label-sm">Settings</span>
          </a>
        </nav>
      </div>
      <div className="flex items-center gap-4 lg:gap-6">
        <div className="flex items-center gap-4">
          <button 
            className="material-symbols-outlined text-on-surface-variant" 
            style={{ fontVariationSettings: "'FILL' 0, 'wght' 600" }}
          >
            notifications
          </button>
          <div className="h-9 w-9 rounded-full bg-secondary-container flex items-center justify-center overflow-hidden border border-surface-variant">
            <div className="w-full h-full bg-primary flex items-center justify-center text-white font-bold">
              U
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
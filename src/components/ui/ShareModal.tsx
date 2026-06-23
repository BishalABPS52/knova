'use client';

import { useState, useEffect } from 'react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  contentId: string | number;
}

export default function ShareModal({ isOpen, onClose, contentId }: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const shareUrl = `https://knova.edu/content/${contentId}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        onClose();
      }, 1000);
    });
  };

  if (!isOpen) return null;

  if (isMobile) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4">
        <div className="w-full max-w-[320px] bg-white rounded-2xl p-6 flex flex-col gap-4 shadow-2xl">
          <div className="flex justify-between items-center mb-1">
            <h3 className="font-headline-sm text-on-surface">Share knowledge</h3>
            <button className="material-symbols-outlined text-on-surface-variant" onClick={onClose}>
              close
            </button>
          </div>
          <div className="bg-surface-container-low p-4 rounded-xl border border-border-subtle flex flex-col gap-2">
            <p className="text-label-md text-on-surface-variant">Direct Link</p>
            <span className="text-body-sm truncate text-on-surface font-medium">{shareUrl}</span>
          </div>
          <button
            className={`w-full h-12 rounded-xl font-label-lg flex items-center justify-center active:scale-95 transition-transform ${
              copied ? 'bg-secondary text-white' : 'bg-primary text-white'
            }`}
            onClick={handleCopy}
          >
            {copied ? 'Copied!' : 'Copy Link'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-headline-md font-headline-md text-on-surface">Share this content</h3>
          <button className="material-symbols-outlined text-outline hover:text-on-surface" onClick={onClose}>
            close
          </button>
        </div>
        <div className="space-y-4">
          <p className="text-body-md text-on-surface-variant">Copy the link below to share with others:</p>
          <div className="flex items-center gap-2 p-3 bg-surface-container rounded-xl border border-outline-variant">
            <input
              className="bg-transparent border-none focus:ring-0 text-sm flex-1 font-mono text-outline"
              readOnly
              value={shareUrl}
            />
            <button
              className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors ${
                copied ? 'bg-green-600 text-white' : 'bg-primary text-white hover:bg-on-primary-fixed-variant'
              }`}
              onClick={handleCopy}
            >
              <span className="material-symbols-outlined text-sm">
                {copied ? 'check' : 'content_copy'}
              </span>
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
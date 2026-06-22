'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';

export default function Navbar() {
  const pathname = usePathname();

  if (pathname === '/space') return null;

  const links = [
    { name: 'Home', href: '/', icon: 'home' },
    { name: 'Space', href: '/learnspace', icon: 'school' },
    { name: 'Explore', href: '/explore', icon: 'explore' },
    { name: 'Profile', href: '/profile', icon: 'person' },
    { name: 'Settings', href: '/settings', icon: 'settings' },
  ]

  return (
    <header className="w-full top-0 z-50 bg-white border-b border-[#d9d9d9] shadow-sm flex justify-between items-center px-6 lg:px-margin-desktop py-4 fixed h-[68px]">
      <div className="flex items-center gap-6 flex-1">
        <div className="flex items-center gap-2">
          <Image
            src="/KnovaWordmark.png"
            alt="Knova Logo"
            width={56}
            height={56}
            className=" object-contain"
            priority
          />
        </div>

        <nav className="hidden xl:flex items-center gap-1 flex-1 justify-center">
          {links.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.name}
                href={link.href}
                className={`flex items-center gap-2 py-2 px-4 rounded-xl group transition-colors ${
                  isActive
                    ? 'font-bold bg-primary-container/10 text-primary-container'
                    : 'text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                <span
                  className={`material-symbols-outlined text-xl transition-colors ${
                    isActive ? '' : 'group-hover:text-primary'
                  }`}
                  style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
                >
                  {link.icon}
                </span>
                <span className="font-label-sm text-label-sm">{link.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex items-center gap-4 lg:gap-6">
        <div className="flex items-center gap-4">
          <button className="material-symbols-outlined text-on-surface-variant hover:text-on-surface transition-colors">
            notifications
          </button>
          <div className="h-9 w-9 rounded-full bg-secondary-container flex items-center justify-center overflow-hidden border border-surface-variant cursor-pointer">
            <img
              alt="User profile"
              className="w-full h-full object-cover"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCEu-3t0uD8i4XHinactyZVIgU5H7GfzqCbS8sWTAWqp4bu2FT6BQazk7xznnRfgM79DLGKmUOMfhSZ7ZltOxkaZa4BoxVzMoWBZN7lWq7-H6-zOpZ9cKOQ5DLXJwgCf1DA_64LXRFB-k5-ObAh7PVKgli4I3MLEGQJypaipzHqdLm8T22ZAA8J9LaS4pj7subHocFLNZZuTFi7B_raIxHTm8roMmUnzUmkzQZ0Qdb3ISzIyr9Lherefvbt-zrfl6GK2WBp1rfXz5g"
            />
          </div>
        </div>
      </div>
    </header>
  );
}

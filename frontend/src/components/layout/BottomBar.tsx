'use client';

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, GraduationCap, Plus, Compass, User, LucideIcon } from "lucide-react";

const LINKS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/learnspace", label: "Space", icon: GraduationCap },
  // Create sits between these two
  { href: "/explore", label: "Explore", icon: Compass },
  { href: "/profile", label: "Profile", icon: User },
];

export default function BottomBar({
  onCreateClick,
}: {
  onCreateClick?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();

  // Learn Space is a full-bleed reel with its own controls (matches Navbar).
  if (pathname === '/learnspace') return null;

  // Prefix match so nested routes still light up their tab — /profile/alex is
  // still "Profile". "/" has to be exact or it would match everything.
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const [home, space, explore, profile] = LINKS;

  return (
    <nav
      aria-label="Primary"
      className="md:hidden fixed inset-x-4 z-50 bottom-[calc(1rem+env(safe-area-inset-bottom))]"
    >
      <div className="grid grid-cols-5 items-center h-16 rounded-[26px] bg-white/90 backdrop-blur-xl border border-black/[0.06] shadow-[0_10px_30px_-6px_rgba(0,0,0,0.22)]">
        <NavItem {...home} active={isActive(home.href)} />
        <NavItem {...space} active={isActive(space.href)} />

        <button
          onClick={() => {
            if (onCreateClick) {
              onCreateClick();
            } else if (pathname === "/") {
              window.dispatchEvent(new CustomEvent("open-create-modal"));
            } else {
              router.push("/?create=true");
            }
          }}
          aria-label="Create a post"
          className="flex flex-col items-center justify-center gap-1 h-full"
        >
          {/* Lifted out of the bar; the white ring cuts it away from the pill. */}
          <span className="-mt-8 w-12 h-12 rounded-2xl bg-gradient-to-br from-[#f97a2b] to-[#f36710] ring-4 ring-white shadow-lg shadow-orange-500/35 flex items-center justify-center active:scale-95 transition-transform">
            <Plus className="w-6 h-6 text-white" strokeWidth={2.5} />
          </span>
          <span className="text-[10px] font-semibold leading-none text-[#f36710]">
            Create
          </span>
        </button>

        <NavItem {...explore} active={isActive(explore.href)} />
        <NavItem {...profile} active={isActive(profile.href)} />
      </div>
    </nav>
  );
}

function NavItem({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className="group flex flex-col items-center justify-center gap-1 h-full"
    >
      <span
        className={`flex items-center justify-center h-7 w-12 rounded-full transition-colors ${
          active
            ? "bg-[#fef3ea] text-[#f36710]"
            : "text-stone-400 group-hover:text-[#f36710]"
        }`}
      >
        <Icon className="w-5 h-5" strokeWidth={active ? 2.5 : 2} />
      </span>
      <span
        className={`text-[10px] leading-none transition-colors ${
          active ? "font-bold text-[#f36710]" : "font-medium text-stone-400"
        }`}
      >
        {label}
      </span>
    </Link>
  );
}

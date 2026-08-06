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

  // Learn Space is a full-bleed reel with its own controls.
  if (pathname === "/learnspace") return null;

  // Prefix match so nested routes still light up their tab — /profile/alex is
  // still "Profile". "/" has to be exact or it would match everything.
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const [home, space, explore, profile] = LINKS;

  return (
    <nav
      aria-label="Primary"
      className="md:hidden fixed bottom-0 left-0 w-full z-50 rounded-t-xl bg-white shadow-[0_-4px_12px_rgba(0,0,0,0.1)] flex justify-around items-center h-20 px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]"
    >
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
        className="flex flex-col items-center justify-center relative -top-2 active:scale-90 transition-transform duration-200"
      >
        <div className="w-14 h-14 rounded-full bg-[#f36710] flex items-center justify-center shadow-lg shadow-[#f36710]/30">
          <Plus className="w-8 h-8 text-white" strokeWidth={2.5} />
        </div>
        <span className="text-[10px] font-medium mt-1 text-[#f36710]">
          Create
        </span>
      </button>

      <NavItem {...explore} active={isActive(explore.href)} />
      <NavItem {...profile} active={isActive(profile.href)} />
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
            : "text-[#594137] group-hover:text-[#f36710]"
        }`}
      >
        <Icon className="w-5 h-5" strokeWidth={active ? 2.5 : 2} />
      </span>
      <span
        className={`text-[10px] leading-none transition-colors ${
          active ? "font-bold text-[#f36710]" : "font-medium text-[#594137]"
        }`}
      >
        {label}
      </span>
    </Link>
  );
}
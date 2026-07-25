'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowUp,
  AtSign,
  BellOff,
  BrainCircuit,
  CheckCheck,
  MessageSquare,
  UserPlus,
} from 'lucide-react';

type NotificationKind = 'vote' | 'comment' | 'follow' | 'mention' | 'quiz';

interface Notification {
  id: number;
  kind: NotificationKind;
  actor: string;
  text: string;
  time: string;
  href: string;
  read: boolean;
}

const FILTERS: { key: 'all' | 'unread' | NotificationKind; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'vote', label: 'Votes' },
  { key: 'comment', label: 'Comments' },
  { key: 'follow', label: 'Follows' },
];

// Visual language per kind, so the list is scannable without reading every row.
const STYLES: Record<NotificationKind, { icon: React.ReactNode; ring: string }> = {
  vote: { icon: <ArrowUp size={16} />, ring: 'bg-[#fef3ea] text-[#f36710]' },
  comment: { icon: <MessageSquare size={15} />, ring: 'bg-[#e0f6fe] text-[#0080b0]' },
  follow: { icon: <UserPlus size={15} />, ring: 'bg-[#eef0f9] text-[#525f71]' },
  mention: { icon: <AtSign size={15} />, ring: 'bg-[#e8f6ee] text-[#1c7c4a]' },
  quiz: { icon: <BrainCircuit size={15} />, ring: 'bg-[#fdf0f0] text-[#c00012]' },
};

// Placeholder feed: there is no notifications endpoint yet, so this renders the
// shape the API should return (see GET /api/v1/notifications, to be added).
const SEED: Notification[] = [
  {
    id: 1,
    kind: 'vote',
    actor: 'BioSpark_101',
    text: 'and 23 others upvoted your flashcard “What is the powerhouse of the cell?”',
    time: '2m ago',
    href: '/profile',
    read: false,
  },
  {
    id: 2,
    kind: 'comment',
    actor: 'Alex_Study',
    text: 'commented: “This really helped me with my exam prep today.”',
    time: '18m ago',
    href: '/',
    read: false,
  },
  {
    id: 3,
    kind: 'follow',
    actor: 'MoleMentor',
    text: 'started following you',
    time: '1h ago',
    href: '/profile/MoleMentor',
    read: false,
  },
  {
    id: 4,
    kind: 'quiz',
    actor: 'Knova',
    text: 'New practice questions were generated for Algorithms — 5 quizzes are ready',
    time: '3h ago',
    href: '/learnspace',
    read: true,
  },
  {
    id: 5,
    kind: 'mention',
    actor: 'net_ninja',
    text: 'mentioned you in a comment on “Understanding TCP 3-Way Handshake”',
    time: '6h ago',
    href: '/',
    read: true,
  },
  {
    id: 6,
    kind: 'vote',
    actor: 'Econ_Everyday',
    text: 'upvoted your note “Why Compound Interest Feels Like Magic”',
    time: '1d ago',
    href: '/profile',
    read: true,
  },
  {
    id: 7,
    kind: 'comment',
    actor: 'mira.learns',
    text: 'replied to your comment: “Would love a follow-up card on this.”',
    time: '2d ago',
    href: '/',
    read: true,
  },
];

export default function NotificationsPage() {
  const [items, setItems] = useState<Notification[]>(SEED);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['key']>('all');

  const unreadCount = items.filter((n) => !n.read).length;

  const visible = useMemo(() => {
    if (filter === 'all') return items;
    if (filter === 'unread') return items.filter((n) => !n.read);
    return items.filter((n) => n.kind === filter);
  }, [items, filter]);

  const markAllRead = () =>
    setItems((current) => current.map((n) => ({ ...n, read: true })));

  const markRead = (id: number) =>
    setItems((current) => current.map((n) => (n.id === id ? { ...n, read: true } : n)));

  return (
    <div className="max-w-[720px] mx-auto p-4 space-y-4">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-[#1b1c1c]">Notifications</h1>
          <p className="text-sm text-[#5c5c5c]">
            {unreadCount > 0 ? `${unreadCount} unread` : 'You’re all caught up'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-1.5 text-sm font-semibold text-[#f36710] hover:bg-[#fef3ea] rounded-lg px-3 py-2 transition-colors"
          >
            <CheckCheck size={16} />
            Mark all read
          </button>
        )}
      </header>

      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {FILTERS.map((f) => {
          const active = filter === f.key;
          const count = f.key === 'unread' ? unreadCount : 0;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              aria-pressed={active}
              className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
                active
                  ? 'bg-[#f36710] text-white border-[#f36710]'
                  : 'bg-white text-[#5c5c5c] border-[#e5e5e5] hover:border-[#f36710] hover:text-[#f36710]'
              }`}
            >
              {f.label}
              {count > 0 && (
                <span className={active ? 'ml-1.5' : 'ml-1.5 text-[#f36710]'}>{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.05)] py-16 flex flex-col items-center gap-3 text-center px-6">
          <div className="w-12 h-12 rounded-full bg-[#f5f5f5] flex items-center justify-center text-[#8d7165]">
            <BellOff size={22} />
          </div>
          <p className="font-semibold text-[#1b1c1c]">Nothing here yet</p>
          <p className="text-sm text-[#5c5c5c] max-w-[280px]">
            Votes, comments and new followers will show up here as people find your posts.
          </p>
        </div>
      ) : (
        <ul className="bg-white rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.05)] overflow-hidden divide-y divide-[#f0f0f0]">
          {visible.map((n) => {
            const style = STYLES[n.kind];
            return (
              <li key={n.id}>
                <Link
                  href={n.href}
                  onClick={() => markRead(n.id)}
                  className={`flex gap-3 px-4 py-4 transition-colors hover:bg-[#faf9f8] ${
                    n.read ? '' : 'bg-[#fffaf6]'
                  }`}
                >
                  <div className="relative shrink-0">
                    <div className="w-10 h-10 rounded-full bg-[#efeded] flex items-center justify-center font-bold text-xs text-[#594137]">
                      {n.actor.slice(0, 2).toUpperCase()}
                    </div>
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center border-2 border-white ${style.ring}`}
                    >
                      {style.icon}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#1b1c1c] leading-snug">
                      <span className="font-bold">{n.actor}</span>{' '}
                      <span className="text-[#5c5c5c]">{n.text}</span>
                    </p>
                    <p className="text-xs text-[#8d7165] mt-1">{n.time}</p>
                  </div>

                  {!n.read && (
                    <span
                      aria-label="Unread"
                      className="shrink-0 self-center w-2 h-2 rounded-full bg-[#f36710]"
                    />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

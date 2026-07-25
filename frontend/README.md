# Knova — Frontend

Next.js (App Router) client for Knova, the telemetry-driven educational content
platform. It renders the personalized feed, the full-screen **Learn Space** reel,
and the learner/creator surfaces (auth, onboarding, profile, settings).

For the product overview and the backend, see the [root README](../README.md).

---

## Getting Started

```bash
npm install
npm run dev
```

App: <http://localhost:3000>

The client talks to the FastAPI service, expected on `http://localhost:8000` by
default. Point it elsewhere with an env var:

```bash
# .env.local
NEXT_PUBLIC_API_URL=https://your-api-host
```

Auth is **cookie-based** — the API sets `access_token` / `refresh_token` cookies, so
the API host must be reachable from the browser and allowed by the backend's
`ALLOW_ORIGINS`.

### Scripts

| Command              | Description                     |
|----------------------|---------------------------------|
| `npm run dev`        | Dev server (Turbopack)          |
| `npm run build`      | Production build                |
| `npm start`          | Serve the production build      |
| `npm run lint`       | ESLint                          |
| `npx tsc --noEmit`   | Type-check without emitting     |

---

## Structure

```
src/
├── app/
│   ├── (auth)/            login, register — no nav chrome
│   ├── (main)/            everything inside the nav shell
│   ├── onboarding/        interest picker (post-register)
│   ├── layout.tsx         root layout: fonts, AuthProvider
│   └── globals.css        theme tokens + custom utilities
├── components/
│   ├── cards/             content cards (one file per content type)
│   ├── layout/            Navbar (desktop) + BottomBar (mobile)
│   ├── post/              post detail + comments
│   └── ui/                shared widgets (Spinner, PostMenu, modals…)
├── context/AuthContext    session state, exposes the current user
├── hooks/                 useAuth, useProfile, useOnboarding
├── lib/                   API client + one module per API area
├── data/                  seed data for surfaces without an endpoint yet
├── schemas/               zod schemas for form validation
└── types/                 shared response types
```

### Routes

| Route                         | Surface                                                |
|-------------------------------|--------------------------------------------------------|
| `/`                           | Personalized feed (`GET /posts/feed`)                  |
| `/learnspace`                 | Full-screen vertical reel, endless scroll              |
| `/explore`                    | Topic/tag browsing                                     |
| `/notifications`              | Activity list (votes, comments, follows, mentions)      |
| `/profile`                    | Redirects to the signed-in user's profile              |
| `/profile/[username]`         | Profile, stats, and **profile editing**                |
| `/settings`                   | Personal info, password, preferred topics              |
| `/onboarding`                 | Pick ≥5 interests, saved as topic interests            |
| `/login`, `/register`         | Auth                                                   |
| `/about`, `/help`, `/contact` | Static pages                                           |

---

## Content Cards

Each content type has one component that renders **four variants** through a
`variant` prop, so the same card works on every surface:

| Variant   | Used by                                           |
|-----------|---------------------------------------------------|
| `feed`    | Main feed and post detail — full header + actions |
| `reel`    | Learn Space — full-bleed, overlaid action rail    |
| `explore` | Compact grid tile                                 |
| `profile` | Profile grid                                      |

`cards/Shared.tsx` holds `FeedActions` (feed engagement bar), `ReelActions` (the
overlaid reel rail), and `CommentsSection`.

Post headers compose two shared widgets: `ui/FollowButton` (optimistic, hidden on
your own posts) and `ui/PostMenu` (the "…" menu — save, copy link, share, not
interested, report, owner-only delete).

### Learn Space

`app/(main)/learnspace/page.tsx` is a scroll-snap reel: one card per viewport,
full-bleed on mobile and a 440px card from `md` up. It appends the next batch of
cards two from the end (endless scroll), tracks the visible card with an
`IntersectionObserver`, supports keyboard nav (`↑`/`↓`, `j`/`k`, `Esc`), and opens
comments as a bottom sheet on mobile / side sheet on desktop.

Two non-obvious constraints, both learned from bugs:

- The action rail renders **inside** the card element. As a sibling of the card it
  was positioned against the section and visibly drifted while scrolling.
- Overlays on scrolling cards avoid `backdrop-filter` — its backdrop repaints a frame
  behind the scroll, which reads as the overlay sliding away from the card.

---

## Styling

Tailwind CSS v4, configured entirely in `app/globals.css` via `@theme`. There is no
JS theme config (`tailwind.config.js` only lists content globs).

### Fonts

Self-hosted with `next/font` in `app/layout.tsx` — **Manrope** for body/UI and
**Plus Jakarta Sans** for display. Use `font-sans` (already the `body` default) and
`font-display` (applied to `h1`–`h6` automatically). Material Symbols still loads
from Google as an icon font; general iconography uses `lucide-react`.

### ⚠️ Don't add `--spacing-*` theme tokens

Tailwind v4 resolves `max-w-*` against the **spacing** scale before the container
scale, so a `--spacing-md` token turns `max-w-md` into `max-width: 16px` — which
silently broke several modals down to a sliver. Project spacing values therefore live
outside that namespace as `--knova-space-*`. Follow that prefix for new ones.

### Custom utilities

Defined in `globals.css`, not from a plugin:

- `.scrollbar-hide` — scrollable with no visible scrollbar (reel surfaces)
- `.custom-scrollbar` — slim scrollbar for scrollable card bodies
- `.vote-burst` — centred upvote burst animation in Learn Space
- `.glass-card`, `.hover-lift` — card surface treatments

---

## Conventions

- **Client components** for interactive surfaces (`'use client'`); data is fetched in
  hooks/effects rather than server components, because auth is cookie-based.
- **All API access goes through `lib/api.ts`**, which extracts JSON error messages and
  does a refresh-and-retry on `401` (skipped for `/auth/*` so it can't recurse). Add a
  module under `lib/` per API area instead of calling `fetch` from components.
- **Optimistic updates with rollback** for votes, saves, and follows — update local
  state immediately, then revert and toast on failure (`sonner`).
- **Seed data lives in `src/data/`** for surfaces whose endpoint doesn't exist yet.
  Shape it like the eventual API response so swapping it out stays a small diff.

---

## Known Gaps

- `react-icons` is listed in `package.json` but may be missing from `node_modules`;
  `contact/page.tsx` imports it, so `npm run build` fails until it is installed.
- **Follow** calls `POST|DELETE /creator/{id}/follow`, which the backend does not
  implement yet — the button rolls back with an error toast.
- **Notifications** renders seed data; there is no notifications endpoint yet.
- **Report** (in `PostMenu`) acknowledges locally; no moderation endpoint yet.

---

## Contributing

See [`CONTRIBUTING.md`](../CONTRIBUTING.md). All work branches from and targets
**`dev`** — never `main`.

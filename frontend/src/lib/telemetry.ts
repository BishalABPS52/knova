// lib/telemetry.ts
/**
 * Buffered engagement telemetry for POST /api/v1/interactions.
 *
 * The server already writes an impression row for every post the feed serves,
 * carrying the things only it can know (interest match, follow state, difficulty
 * gap, ranking provenance). This client supplies the other half — what the user
 * actually did — and the two merge into one row per (user, post).
 *
 * The contract that makes this safe: every value sent is the ABSOLUTE cumulative
 * total for the current session, never a delta. The server recomputes the
 * lifetime total as (previous - this session's last report + the new one), so a
 * duplicated, replayed or retried batch is a no-op instead of double-counting.
 * That is why a failed flush can simply be re-queued: the next attempt sends the
 * same absolute numbers, only fresher.
 *
 * Deliberately bypasses the `api<T>()` wrapper — a telemetry 401 must not enter
 * the shared refresh dedup and delay real requests behind it.
 */

import { getApiUrl } from "@/lib/api";

/** Mirrors InteractionSurface in backend/src/db/models.py. */
export type TelemetrySurface = "feed" | "profile" | "search" | "topic" | "saved";

const ENDPOINT = "/api/v1/interactions";
const SESSION_KEY = "knova.telemetry.session";

const FLUSH_INTERVAL_MS = 10_000;
const FLUSH_AT_DIRTY = 20;

// InteractionBatch caps `events` at 50 and `dwell_sec` at 3600. Exceeding either
// is a 422 that rejects the whole batch, so both are enforced here instead.
const MAX_EVENTS_PER_BATCH = 50;
const MAX_SECONDS = 3600;

// A 401 while logged out would otherwise retry on every interval, forever.
const AUTH_BACKOFF_MS = 60_000;

// Post ids are UUIDs server-side. Several screens still render mock data with
// numeric ids; one of those in a batch would 422 the entire flush, so they are
// dropped at the door rather than guarded at each call site.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface InteractionEvent {
  post_id: string;
  surface: TelemetrySurface;
  feed_position: number | null;
  dwell_sec: number;
  scroll_depth: number | null;
  quiz_answered: boolean | null;
  quiz_correct: boolean | null;
  card_flipped: boolean | null;
  flip_time_sec: number | null;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const round = (value: number) => Math.round(value * 100) / 100;

class TelemetryClient {
  /**
   * Cumulative session state per post. Never evicted: the values are absolute,
   * so dropping an entry and later re-reporting a smaller number for the same
   * session would make the server *decrement* that post's lifetime dwell. Each
   * entry is a few dozen bytes and the map is bounded by how many posts one tab
   * can scroll through, which is a cheaper problem than corrupting training data.
   */
  private posts = new Map<string, InteractionEvent>();

  /** Posts changed since the last successful flush. */
  private dirty = new Set<string>();

  private sessionId: string | null = null;
  private timer: number | null = null;
  private retryAfter = 0;

  // ---------------------------------------------------------------- tracking

  /**
   * Register a post as served without claiming it was seen. Deliberately does
   * not mark the entry dirty: `view_count` stays 0 until a real signal arrives,
   * which is what lets the backend tell "served" apart from "actually viewed".
   */
  trackImpression(
    postId: string,
    feedPosition?: number,
    surface: TelemetrySurface = "feed",
  ): void {
    const entry = this.entry(postId, surface);
    if (!entry) return;
    entry.surface = surface;
    if (feedPosition !== undefined && feedPosition >= 0) {
      entry.feed_position = Math.round(feedPosition);
    }
  }

  /** Add on-screen milliseconds. The hook calls this while a card is visible. */
  addDwell(postId: string, ms: number): void {
    if (!(ms > 0)) return;
    const entry = this.entry(postId);
    if (!entry) return;
    entry.dwell_sec = round(clamp(entry.dwell_sec + ms / 1000, 0, MAX_SECONDS));
    this.mark(postId);
  }

  trackQuiz(postId: string, correct: boolean): void {
    const entry = this.entry(postId);
    if (!entry) return;
    entry.quiz_answered = true;
    // First answer is the honest one; a re-render must not overwrite it.
    if (entry.quiz_correct === null) entry.quiz_correct = correct;
    this.mark(postId);
  }

  /**
   * Flashcard reveal. `flip_time_sec` is the dwell accrued before the flip —
   * time-to-recall — so it is read off the buffer rather than passed in.
   */
  trackFlip(postId: string): void {
    const entry = this.entry(postId);
    if (!entry) return;
    entry.card_flipped = true;
    if (entry.flip_time_sec === null) entry.flip_time_sec = entry.dwell_sec;
    this.mark(postId);
  }

  /** Monotonic: scroll depth only ever goes up. */
  trackScroll(postId: string, depth: number): void {
    const entry = this.entry(postId);
    if (!entry) return;
    const next = clamp(depth, 0, 1);
    if (entry.scroll_depth === null || next > entry.scroll_depth) {
      entry.scroll_depth = round(next);
      this.mark(postId);
    }
  }

  // ----------------------------------------------------------------- flushing

  /**
   * Send every dirty post. Chunks to the server's batch limit and re-queues any
   * chunk that fails — safe precisely because the payload is absolute.
   */
  async flush(): Promise<void> {
    if (typeof window === "undefined") return;
    if (this.dirty.size === 0 || Date.now() < this.retryAfter) return;

    const sessionId = this.session();
    if (!sessionId) return;

    const ids = Array.from(this.dirty);
    this.dirty.clear();

    // Serialise every chunk before sending any of them. Logout dispatches a
    // flush and immediately resets the buffer, so reading `posts` between awaits
    // would leave the later chunks empty.
    const batches: { ids: string[]; body: string }[] = [];
    for (let i = 0; i < ids.length; i += MAX_EVENTS_PER_BATCH) {
      const chunk = ids.slice(i, i + MAX_EVENTS_PER_BATCH);
      const events = chunk
        .map((id) => this.posts.get(id))
        .filter((e): e is InteractionEvent => e !== undefined);
      if (events.length === 0) continue;
      batches.push({ ids: chunk, body: JSON.stringify({ session_id: sessionId, events }) });
    }

    for (const batch of batches) {
      const ok = await this.send(batch.body);
      if (!ok) batch.ids.forEach((id) => this.dirty.add(id));
    }
  }

  /** Drop everything and start a new session. Call on logout. */
  reset(): void {
    this.posts.clear();
    this.dirty.clear();
    this.sessionId = null;
    this.retryAfter = 0;
    if (typeof window !== "undefined") {
      try {
        window.sessionStorage.removeItem(SESSION_KEY);
      } catch {
        // private-mode sessionStorage; the in-memory reset above is enough
      }
    }
  }

  // ----------------------------------------------------------------- internals

  private entry(postId: string, surface: TelemetrySurface = "feed"): InteractionEvent | null {
    if (typeof window === "undefined") return null;
    if (!postId || !UUID_RE.test(postId)) return null;

    let entry = this.posts.get(postId);
    if (!entry) {
      entry = {
        post_id: postId,
        surface,
        feed_position: null,
        dwell_sec: 0,
        scroll_depth: null,
        quiz_answered: null,
        quiz_correct: null,
        card_flipped: null,
        flip_time_sec: null,
      };
      this.posts.set(postId, entry);
    }
    this.install();
    return entry;
  }

  private mark(postId: string): void {
    this.dirty.add(postId);
    if (this.dirty.size >= FLUSH_AT_DIRTY) void this.flush();
  }

  /** One id per browser tab, surviving reloads so dwell keeps accumulating. */
  private session(): string | null {
    if (this.sessionId) return this.sessionId;
    if (typeof window === "undefined") return null;

    let id: string | null = null;
    try {
      id = window.sessionStorage.getItem(SESSION_KEY);
    } catch {
      // sessionStorage can throw in private mode; fall through to a fresh id
    }

    if (!id) {
      id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      try {
        window.sessionStorage.setItem(SESSION_KEY, id);
      } catch {
        // in-memory only for this page load
      }
    }

    this.sessionId = id;
    return id;
  }

  /** Install the interval and unload hooks once, on first tracked signal. */
  private install(): void {
    if (this.timer !== null || typeof window === "undefined") return;

    this.timer = window.setInterval(() => void this.flush(), FLUSH_INTERVAL_MS);

    // Hiding the tab is the last reliable moment on mobile, where pagehide often
    // never fires. The page is still alive here, so a normal keepalive fetch works.
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") void this.flush();
    });

    window.addEventListener("pagehide", () => void this.flush());
  }

  private send(body: string): Promise<boolean> {
    const url = `${getApiUrl()}${ENDPOINT}`;
    try {
      // keepalive, not sendBeacon: auth is a cross-origin cookie (samesite=none)
      // and beacon's JSON content type forces a preflight that browsers routinely
      // drop during unload. Beacon stays as the fallback below.
      return fetch(url, {
        method: "POST",
        credentials: "include",
        keepalive: true,
        headers: { "Content-Type": "application/json" },
        body,
      })
        .then((res) => {
          if (res.status === 401 || res.status === 403) {
            // Probably an expired access token. Back off rather than retrying on
            // every interval; a normal request will renew the cookie meanwhile.
            this.retryAfter = Date.now() + AUTH_BACKOFF_MS;
            return false;
          }
          if (res.status === 422) {
            // The server will reject this payload however many times we resend it.
            console.warn("telemetry: batch rejected as invalid, dropping");
            return true;
          }
          return res.ok;
        })
        .catch(() => this.beacon(url, body));
    } catch {
      return Promise.resolve(this.beacon(url, body));
    }
  }

  private beacon(url: string, body: string): boolean {
    if (typeof navigator === "undefined" || !navigator.sendBeacon) return false;
    try {
      return navigator.sendBeacon(url, new Blob([body], { type: "application/json" }));
    } catch {
      return false;
    }
  }
}

export const telemetry = new TelemetryClient();

# 0002 — Coordinate devices via hidden-playlist boards (single-writer, LWW)

**Status:** Accepted

## Context

The app needs two things Plex doesn't provide for third-party clients: a durable
per-book/chapter progress store it can read back on open, and a live view of
what other devices are doing (for handoff). Plex offers no key-value store, no
Companion registration for our clients, and — critically — **no compare-and-swap**
on any writable object.

## Decision

Each device owns **hidden Plex playlists** as "boards", using the playlist
summary as a small JSON blob:

- **Presence** (`pb_dev_<id>`) — ephemeral live state `{book,track,pos,at,state,
  speed,claim}`, published only on events (play/pause/seek/track/stop) plus a
  liveness pulse; position is **extrapolated** locally (`livePos`) so there are
  no periodic position writes.
- **Progress** (`pb_prog_<id>`) — durable book + chapter records, each carrying a
  server-clock `ts`.

**Single-writer per board:** a device writes only its OWN board; everyone reads
all boards and merges. Merges are **Last-Write-Wins by server-clock `ts`**,
independently per book record and per (book,track) chapter record.

## Consequences

- Single-writer is what makes the common case (independent concurrent playback)
  safe **without CAS** — concurrent read-modify-write on one shared blob would be
  last-write-wins on the *whole* blob, i.e. lost updates. It also buys per-device
  attribution for free and lets a garbage peer board be dropped in isolation.
- The cost is paid only by **global** operations. Reset Progress can't just
  delete a record (a bare delete has no `ts` to win LWW), so it needs a durable
  tombstone + read-time suppression; an offline peer's stale board persists
  server-side and must be filtered on every poll. That read-time suppression is
  irreducible — do not try to design it away.
- Clock skew (the one LWW footgun) is handled by normalizing every `ts` to the
  Plex server clock via the response `Date` header.

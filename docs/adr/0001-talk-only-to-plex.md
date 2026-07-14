# 0001 — Talk only to Plex, no user-run server

**Status:** Accepted

## Context

TomeRoam competes with Prologue as a Plex audiobook client. Requiring users to
run their own backend (a proxy, a sync server) would make it a niche tool. But
Plex has a hard limitation that motivates most of this app: **Plex hides an
audiobook's saved `viewOffset` over its HTTP metadata API** — it is present only
in Plex's own database and, for a *live* session, on the notification WebSocket
and `/status/sessions`. So the API cannot simply hand a saved position back when
you open a book.

## Decision

The app talks **only to Plex**, using the same surfaces the official clients use
(plex.tv PIN sign-in, `*.plex.direct` / Remote Access for library, art, audio,
and progress writes). It runs no server of its own. Because the API won't return
a saved position, the app **keeps its own durable progress** (see
[0002](0002-coordination-via-hidden-playlist-boards.md)) rather than depending on
Plex to remember where you were.

## Consequences

- Zero-infrastructure: install the PWA / APK, sign in, done.
- Everything must fit within what Plex exposes to a client. Several verified Plex
  facts are load-bearing and hard to re-derive; they're documented in code
  comments in `js/plex.js` (e.g. `connect()` must probe connections
  *sequentially*; the section listing omits `leafCount`/`viewedLeafCount`).
- The user's Plex is often **relay-only and slow** (multi-second, frequent
  failures); every network, timeout, and offline assumption must hold there, not
  just on a fast LAN.

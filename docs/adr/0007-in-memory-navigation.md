# 0007 — In-memory navigation with a single History entry

**Status:** Accepted

## Context

A natural SPA pattern is one `history.pushState` per screen so the browser back
button and the OS back gesture "just work". On an **iOS standalone PWA** this is a
trap: whenever any back-history exists, the interactive back-**swipe** triggers a
full page reload — which destroys audio playback, in-memory buffers, and resets
playback speed to 1×.

## Decision

Navigation is **in-memory**. The History API is held at a **single entry**; an
internal `navStack` / `fwdStack` drives an `applyScreen(desc)` renderer.
Transitions are a true filmstrip (both panes translate); overlays slide as their
own real elements over an untouched page. Each browse screen is built once into
its own node and LRU-cached, so revisiting is a toggle with no re-fetch or flash.

## Consequences

- Playback, buffers, and speed survive navigation and the iOS back-swipe.
- The trade-off is that desktop browser back/forward no longer drive the app;
  iOS/Android are the target platforms, so this is accepted.
- Off-screen views are kept **painted** (`translateX` off-screen, not
  `display:none`) because `display:none` drops image decodes on iOS (re-show
  flashes) and reports sub-scroller offsets as 0.
- Several dead ends are documented in code (a two-entry history guard, cloning
  `.app` for overlay swipes) — don't retry them.

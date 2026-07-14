# 0005 — Cache-first service worker with a single build stamp

**Status:** Accepted

## Context

The app must open and render fully offline after one successful load (GitHub is
an install/update host, not a runtime dependency), while never stranding a device
on a half-updated shell. A recurring, painful failure was the **mixed build**: a
stale `index.html` paired with fresh JS (or vice versa) shipped live more than
once.

## Decision

- **Cache-first service worker with auto-takeover.** The shell is cached
  atomically under a build-versioned name; `install` calls `skipWaiting()` and
  the new worker claims clients. Old caches are pruned only after the new shell
  is verified complete (else the old one is kept as a fallback).
- **One build stamp, propagated.** `build.json` is the source of truth; a single
  `YYYY-MM-DD.N` id is stamped into `sw.js`, `js/debug.js`, the `index.html`
  meta, and **every `?v=` asset URL** by `npm run stamp`. Because the SW precache
  uses the same `?v=` URLs, a stale `index.html` can only request *its own*
  build's assets — a mixed build is impossible by construction. A test and a CI
  step guard the coherence.

## Consequences

- Offline works after one load; downloaded audio plays with no network.
- To ship: edit `build.json`'s `build`, run `npm run stamp`, commit together.
- Auto-takeover beats a waiting-worker/update-prompt flow: a waiting worker can't
  dislodge a still-controlling old SW, which is exactly how devices got stranded
  on stale HTML. In-session *application* of an update is still user-gated (a
  staged build applies on the next cold launch or an explicit "App update" tap),
  so the app never silently reloads mid-listen.
- A cache-first layer must **not** treat "served from cache" as a network
  failure; doing so drove a reconnect storm until reachability was only marked
  stale on a genuine revalidation failure.

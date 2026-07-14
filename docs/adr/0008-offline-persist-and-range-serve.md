# 0008 — Offline: persist to IndexedDB, play via the SW range path

**Status:** Accepted

## Context

Offline playback had to be **solid and non-hacky** — "mp3 resume is a
long-solved problem." Guessing byte ranges over the network, or transcode-offset
seeking, were explicitly rejected. The complication: iOS `<audio>` **rejects a
`blob:` object URL created from an IndexedDB-retrieved Blob** (it fails with
`AUDIO_ERR` code 4). RAM object URLs work only while the blob is fresh in memory.

## Decision

- **Persist to IndexedDB.** Downloaded and buffered audio are stored as blobs in
  IDB (`js/store.js`), with metadata cached separately so eviction can sort by
  age without loading gigabytes.
- **Play through the service worker.** Local audio is served via a SW route
  `./__dl/<track>` that reads the blob from IDB and answers HTTP **range**
  requests (206 / Content-Range) — which the media element accepts where a raw
  IDB `blob:` URL fails. (The suffix range `bytes=-N` must serve the *tail*, for
  M4B metadata reads.)
- **Two tiers, visibly distinct:** **downloaded = pinned** (blue), **buffered =
  evictable** (gray). Buffering write-throughs the existing look-ahead selection;
  eviction is oldest-first and **must protect the currently-playing track's
  bytes** (they're served through the same range path — evicting them 404s the
  next range mid-listen).

## Consequences

- Whole books play with no network; buffered audio survives a restart.
- The SW is the single serving path for local audio, so its range math is
  covered by unit tests (`js/swkit.js`).
- Freeing the *played* portion of a single in-progress file would need
  MSE/SourceBuffer (iOS-flaky) and is deferred; the current file is whole-file
  banked for drop-resilience.

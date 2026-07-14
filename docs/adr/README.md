# Architecture Decision Records

Short records of the load-bearing decisions behind TomeRoam — the ones that are
non-obvious, that shaped the whole design, or that are tempting to "simplify"
without knowing why they're the way they are. Each captures the **context**, the
**decision**, and the **consequences** so a future contributor (or reviewer)
doesn't have to re-derive or re-litigate them from scattered code comments.

These describe *why*, not *how*; the code and its comments remain the source of
truth for mechanics. If a decision here is reversed, update the ADR's status
rather than deleting it.

| # | Decision |
|---|----------|
| [0001](0001-talk-only-to-plex.md) | Talk only to Plex — no user-run server |
| [0002](0002-coordination-via-hidden-playlist-boards.md) | Coordinate devices via hidden-playlist boards (single-writer, LWW) |
| [0003](0003-most-recent-wins.md) | Resume is most-recent-wins, not most-advanced |
| [0004](0004-build-free-no-bundler.md) | Build-free: no bundler, classic-script modules, no-build type checking |
| [0005](0005-cache-first-sw-build-coherence.md) | Cache-first service worker with a single build stamp |
| [0006](0006-no-platform-detection.md) | No platform detection — structural fixes only |
| [0007](0007-in-memory-navigation.md) | In-memory navigation with a single History entry |
| [0008](0008-offline-persist-and-range-serve.md) | Offline: persist to IndexedDB, play via the SW range path |
| [0009](0009-lms-plugin-is-additive.md) | The app is standalone; the LMS plugin is additive-only |

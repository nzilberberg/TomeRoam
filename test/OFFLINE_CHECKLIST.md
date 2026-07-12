# Offline-resilience manual test checklist

Automated unit tests cover the pure logic (conflict rules: `test/syncqueue.test.js`;
deploy guards: `test/build.test.js`). The behaviours below need a real browser /
device and are verified on the live deploy. Open **Options → Diagnostics → Cache**
to read cache/SW/storage/connectivity/sync state at any point ("Copy sanitized"
shares it safely — no tokens).

The connectivity model tracks these axes SEPARATELY (GitHub reachable ≠ Plex
reachable): `browserThinksOnline`, `appHostReachable`, `plexReachable`,
`plexAuthValid`, `cachedAppShellAvailable`, `cachedMetadataAvailable`,
`pendingSyncCount`, `updateReady`.

### Test 1 — First load / install
1. Open the app online.
2. Diagnostics → Cache: **app-shell complete: YES (N/N)**, service worker
   registered + active + controller present.

### Test 2 — Offline startup
1. Load once online (let a couple of covers load).
2. Close the tab / app. Turn off Wi-Fi + data.
3. Reopen.
   - ✅ Full UI renders (no blank screen, no browser error page).
   - ✅ Continue Listening + Recently Added show cached books.
   - ✅ Previously-seen covers render; unseen ones show the TomeRoam placeholder.
   - ✅ Offline banner: "Offline — showing cached library from …".
   - ✅ Startup did NOT block on GitHub.

### Test 3 — GitHub down / Plex up
Simulate app host unreachable (e.g. block `build.json` / `github.io`), keep Plex
reachable. ✅ App starts from cache; Plex browse/playback work; update check fails
silently (Diagnostics: last app-host check → unreachable).

### Test 4 — GitHub up / Plex down
App host reachable, Plex server unreachable (kill Plex / block it).
✅ App starts, cached library displays, banner: "Plex unavailable — showing cached
data…", playback shows unavailable. Diagnostics: `plexReachable=false`.

### Test 5 — Images
Load covers online → go offline → revisit the same screens.
✅ Previously loaded covers come from the SW image cache; missing ones use the
bundled placeholder (never a broken-image glyph).

### Test 6 — Pending progress queue
1. Start with Plex reachable; play a book.
2. Make Plex unreachable; keep listening / scrub.
3. ✅ Banner shows "N change(s) will sync when Plex is reachable" and
   `pendingSyncCount` climbs (Diagnostics).
4. Restore Plex. ✅ A reconnect pass runs; pending drops to 0; conflict rules
   respected (a newer remote position is NOT overwritten by a stale/near-zero
   local write — check Diagnostics "last result": conflicts held, not clobbered).

### Test 7 — Storage clearing
1. Clear site data. Open offline → app can't load (shell gone) but the failure is
   an understandable browser message, not a silent hang.
2. Open online → SW reinstalls, shell + metadata rebuild cleanly.

### Test 8 — Build update
1. Running build N.
2. Deploy build N+1 (bump BUILD in `sw.js` + `js/debug.js` + `build.json`).
3. Reopen / foreground: build N starts instantly; N+1 downloads + caches in the
   background; banner: "Update available — reload to apply".
4. Tap Reload → after reload Diagnostics shows build N+1.

### Test 9 — Mixed-cache prevention
Deploy changed JS/CSS/index; interrupt the update mid-download; reload.
✅ Never a mix (index build 50 + JS build 48): the page runs entirely from ONE
build's versioned cache — either the old complete build or the new complete one.

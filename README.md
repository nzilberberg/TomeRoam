# TomeRoam

A vanilla-JS mobile web app (PWA) audiobook player for Plex that does the two
things Prologue won't: **read your saved position back when you open a book**
(not just write it), and **hand playback off between your devices** so each one
resumes exactly where the last left off.

Works with Plex; not affiliated with Plex. iPhone runs the PWA (Add to Home
Screen); Android runs a self-contained WebView build published under Releases.

## What it does

- **Standalone.** Signs into your Plex account (standard plex.tv PIN flow) and
  talks directly to Plex for library, cover art, audio, and progress — there is
  no separate server to run. Continue Listening comes from Plex's own
  recently-played data.
- **Resumes where you left off**, on the same device and across devices. Each
  device publishes its position to a hidden Plex playlist "board"; the others
  read and merge them **most-recent-wins**, so a rewind is honored rather than
  overwritten by a stale forward position. This 2-way sync is the part Prologue
  doesn't do.
- **Offline.** After one successful load the app opens and renders fully offline
  (cache-first service worker + IndexedDB). Whole books can be downloaded and
  played with no network.
- **Optional Lyrion (LMS) add-on.** If you also run the companion Lyrion plugin
  on your server, TomeRoam *additionally* surfaces the resume offset for books
  you played in **other** Plex apps (Prologue, Plexamp, …). Plex's metadata API
  never returns a saved audiobook `viewOffset`, and once the session ends that
  value survives only in Plex's own database — which a server-side plugin can
  read. Purely additive: the app is fully functional without the plugin, and
  nothing else depends on it.

## Why a position needs syncing at all

Plex exposes an audiobook's live position only while a session is **actively
playing** (via its notification WebSocket and `/status/sessions`); the metadata
API hides the saved `viewOffset` for audiobook tracks. So TomeRoam keeps its own
durable per-device progress instead of relying on the API to hand a saved
position back on open.

## Project layout

| Path | What |
|------|------|
| `index.html`, `css/`, `js/` | the app — classic `<script>` modules, no bundler |
| `sw.js` | service worker (cache-first shell + cover cache + `__dl` range serving) |
| `build.json` | build stamp + update / Android-OTA manifest |
| `test/` | Node `--test` suites — pure kernels, contract/seam tests, and DOM tests driven against the real `index.html` |
| `tools/` | desktop debug tooling — see [`tools/README.md`](tools/README.md) |
| `types/` | ambient type declarations for `// @ts-check` (dev-only) |
| `android/` | self-contained WebView APK (raw aapt2/d8 build, no Gradle) |

Key modules:

| Module | Owns |
|--------|------|
| `js/logic.js` | pure decision kernel — resume/merge/handoff/retry rules, no DOM |
| `js/plex.js` | Plex client: PIN sign-in, connection ranking (local → remote → relay), the playlist "boards" |
| `js/presence.js`, `js/progress.js` | the live and the durable halves of the multi-device layer |
| `js/nav.js` | screen state: which view is visible, the screen dispatch, the transitions |
| `js/playback.js` | the playback intent/retry/recovery state machine |
| `js/browse.js` | library lists — cached page nodes, A–Z index, per-page scroll memory |
| `js/store.js`, `js/net.js`, `js/downloads.js`, `js/banking.js`, `js/syncqueue.js` | offline: IndexedDB, connectivity, downloads + auto-buffering, the durable write queue |
| `js/*-screen.js` | one module per screen — the Options hub and its General / Playback / Buffering / Downloads sub-screens, plus Home, Now-Playing, Sign-in |
| `js/app.js` | the playback core, the nav stacks + swipe gesture, and the wiring that injects the above |

Modules are plain IIFEs that publish themselves on `window` and read the world
through dependencies injected at `init()` — that boundary is what makes them
testable without a browser.

## Development

The app is **build-free**: it is static files with no bundler or compile step,
and GitHub Pages serves the repo as-is. Everything below is dev-only tooling; the
shipped app gains no runtime dependency on any of it. Requires Node ≥ 18.

```
npm test              # Node unit + contract tests
npm run lint          # ESLint (a narrow, high-signal rule set)
npm run typecheck     # tsc --noEmit over files opted in with // @ts-check
npm run stamp:check   # verify the build stamp is coherent across files
```

### Tests

Tests here are meant to be able to **fail**, which shapes how they're written:

- DOM and screen tests parse the **real `index.html`** rather than a hand-written
  fixture. A fixture written from the same assumptions as the code reproduces its
  bugs instead of catching them — that has happened here, so the shipped file is
  the fixture.
- Several suites are **structural guards** over things nothing else keeps in sync.
  The settings-screen list, for example, is encoded in `index.html`, `js/nav.js`,
  `js/scrollbar.js` and `css/app.css`; a test asserts all four agree. Another
  decodes the shipped icon PNGs and checks they're intact, centred and not blank
  (a broken icon is invisible to lint, types, and every other test).
- The pure kernels in `js/logic.js` are tested in isolation; the async ownership
  rules (generation guards) are driven with fake timers and fake animation frames
  so interleavings are deterministic rather than racy.

### The build stamp

Every deploy carries a single build id (`YYYY-MM-DD.N`). `build.json` is the
source of truth; `npm run stamp` propagates it into `sw.js`, `js/debug.js`, and
every `?v=` in `index.html`, so a stale `index.html` can never pair with fresh
JS (a mixed-build failure that has bitten this app before). To ship a change:
edit `build.json`'s `build`, run `npm run stamp`, and commit the files together.
CI (`.github/workflows/ci.yml`) runs stamp-check + lint + typecheck + tests on
every push.

## Security

The app holds no secrets, the Plex token stays on the device, and TomeRoam talks
only to Plex (plus GitHub Pages for the app and an update check). The trust model
— including the built-in remote debug channel's boundary — is in
[SECURITY.md](SECURITY.md).

## Hosting

Static files served over HTTPS by GitHub Pages. The Android build is a
dependency-free WebView shell that bundles the same web files and self-updates
over the air; releases are published under **Releases**.

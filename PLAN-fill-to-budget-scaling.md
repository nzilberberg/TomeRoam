# TomeRoam — Fill-to-Budget Library Scaling — Implementation Plan (v2, APPROVED)

**Status:** approved after two review cycles. Both parties agree. This is the plan of record; supersedes the v1 proposal.
**Problem:** the app assumes a modest library (author's own ≈145 books). As a public app it can't control library size; some users have tens of thousands. This plan makes the app safe and graceful at large sizes **with zero change to the small-library experience** — while being honest about exactly which crash class it removes and which it doesn't.

---

## 0. Design principles (govern every workstream)

1. **Fill-to-budget, one mechanism.** No "small vs large mode." Behaviour is governed by budgets; for a small library no budget is reached, so the new machinery is inert and output is byte-for-byte today's. Resident window = `min(itemCount, budget)`.
2. **Per-page item count, not global N.** The render decision for a list keys off *that list's* `items.length` (Books, Authors, and one author's books are three independent cardinalities). Global library size governs only warmer + cache policy.
3. **One data model + one visual design; full vs windowed realization chosen per page.** Same rows, same look; only *how many are materialized* differs. There IS a realization-path threshold (item 600 full-renders, 601 virtualizes) — output is identical across it, but the virtual path therefore cannot be exercised by the 145-book production library and **must** be tested synthetically.
4. **Honest scope.** WS1 bounds **DOM rows**, removing the DOM-driven crash class. It does **not** bound the metadata arrays (`getBooks` maps/sorts/groups the whole library; Home derives carousels from the full result). True *arbitrary*-size support needs WS4.2 **plus a Home redesign** and is explicitly out of scope here.
5. **Each step is a no-op on the author's own library**, so each can ship and be verified live without regressing daily use.

### Resolved review positions (settled, do not relitigate)
- **Row height:** book rows are uniform except when a live peer name (`.pline .pname`) shows. Fix = reserve fixed geometry in virtual lists (a `min-height` on `.pline`), **not** a measured/variable-height virtualizer.
- **Recycling:** use **keyed materialization** (create/remove whole rows by ratingKey); **never** rebind a row node into a different item — closures in `bookRow`/`authorRow`/dlbtn capture the item, and ArtLoader won't reload a mutated `data-art`.
- **pageCache:** hidden pages **dematerialize to ~0 realized rows** (keep data + scroll anchor only). The "12×800 resident rows" fear does not apply; controllers deactivate/destroy on hide/evict.

---

## 1. Current state (grounding — verified against source)

| Concern | Where | Scales? |
|---|---|---|
| Rendered pages | `browse.js` `pageCache` (Map, LRU `MAX_PAGES=12`) | pages capped ✔; **each page renders all rows** ✗ |
| Rows per list | `browse.js` `listView`/`authorView` (loops entire array; `authorView` at :260) | ✗ |
| Row height | `.book` flex, cover 60px dominant; only `.pline .pname` varies (app.css:143–158, 508–518) | uniform except live peer |
| Row identity | `bookRow`/`authorRow` closures capture item; dlbtn binder captures book (browse.js:308/336/338) | recycling-by-rebind unsafe ✗ |
| Cover images | `artloader.js` IO + `data-art` + concurrency cap 3; MutationObserver watches **added nodes only**, `observe()` early-returns on `data-art-observed` | already windowed ✔; no rebind, no release ✗ |
| Cover disk cache | `sw.js` `IMG_CACHE`; caches **opaque** responses (:326); `cache.put` fire-and-forget, **not** in `waitUntil` (:329) | unbounded, byte size unreadable ✗ |
| Metadata fetch | `plex.js` `getBooks`/`getAuthors`, `BIG={Container-Size:20000}` | one big request; **silently truncates at 20k** ✗ |
| Warmer | `warmer.js` `buildWork`: **2 req/author** + 1/book (:37) | throttled but never finishes ✗ |
| Home carousels | `loadHomeData` ← full `getBooks()` | bounded rows ✔, but depends on whole-library fetch |
| Navigation | swipe clones outgoing view (`cloneNode`, copies `scrollLeft`, app.js:250/262–272); clones must not re-trigger artloader (:264) | stateful virtual page must survive clone/swap ✗ |

---

## 2. Budgets & constants (evidence-tunable; all set above a ~500-book library)

```
FULL_RENDER_MAX     = 600            // per page: itemCount ≤ this → existing full renderer, untouched
OVERSCAN_PX         = innerHeight*1.5// virtual: realize viewport ± this (→ realized rows ≈ dozens)
WARM_WORK_BUDGET    = ~1500 requests // startup warmer, measured in REQUESTS not books
COVER_CACHE_HIGH    = 4000 entries   // trim trigger
COVER_CACHE_LOW     = 3600 entries   // trim target
```
Small-library proof: 500 authors/books ≤ 600 → full render, no virtualization; warm work (≈145 books ⇒ ~435 req) ≤ 1500 → warms all as today; ~500 covers ≪ 4000 → never evicts.

---

## 3. Workstreams — in rollout order

Each is independently shippable and inert on the author's library. WS4.1 → WS2a → WS3 first (small, safe guards), then WS1 in three sub-steps, then the deferred pieces.

### WS4.1 — Truncation detection (SHIP FIRST)
**Goal:** stop losing books silently past 20k.
**Change (`plex.js` `getBooks`/`getAuthors` live fns):** compare `Number(mc.totalSize)` to returned count.
```
total > returned            → definitely truncated
!isFinite(total) && returned === 20000 → possibly truncated
```
Apply independently to authors and books. Surface in **diagnostics/status**, not only a debug breadcrumb.
**Tests:** unit the predicate (definitely/possibly/complete-exactly-20000). **Risk:** trivial. **Done:** a >20k fixture flags truncated; a 20,000-exact fixture does not false-flag when `totalSize===20000`.

### WS2a — Startup warmer request budget (SHIP SECOND)
**Goal:** bound warmer work regardless of author/book counts.
**Change (`warmer.js`):** budget in **expected requests** (`authorBooks`+`author` = up to 2/author; `tracks` = 1/book), with a dedup set. Selection order: recently-played books → recently-added books → their unique authors → remaining until `WARM_WORK_BUDGET` filled. **If the full work list fits under budget, keep today's exact authors-first ordering** (so small-library network behaviour is unchanged — a recency reorder would alter it even if all work eventually runs). `log()` the skipped count (no silent cap).
**Tests:** extend `test/warmer.test.js` — budget respected, dedup, unchanged ordering under budget. **Risk:** low (list construction). **Done:** large synthetic author/book counts produce ≤ budget requests; ≤145-book input produces today's list in today's order.

### WS3 — Cover-cache entry-count FIFO (SHIP THIRD)
**Goal:** bound `IMG_CACHE` on disk without byte accounting or hot-path LRU writes.
**Change (`sw.js`):** approximate insertion-order FIFO with high/low-water marks.
- Maintain lightweight insertion order (e.g. a small ordered key list in the cache/IDB), NOT per-hit access rewrites.
- On write crossing `COVER_CACHE_HIGH`, trim to `COVER_CACHE_LOW`.
- **Tie writes + trims to the fetch event's `waitUntil`** (worker may terminate after returning the image).
- **Serialize** trims (a shared promise) so concurrent image fetches don't each walk the cache.
- Do **not** call `cache.keys()` + walk 4000 entries on every write; amortize/lazy-maintain.
- Reconcile ordering metadata when `EVICT_IMG` removes a poisoned entry.
- Handle an already-over-budget cache on first write / a lazy maintenance pass.
**Tests:** unit the trim math (high→low) and the serialization guard where feasible; manual SW verification otherwise. **Risk:** low-medium (SW lifecycle correctness). **Done:** cache count stays ≤ high-water under sustained scrolling of a large synthetic list; evicted cover re-fetches via the normal miss path; no double-trim under concurrency.

### WS1a — Virtual-list model + synthetic harness (no integration yet)
**Goal:** a pure, tested windowing model and a dev harness, before touching Browse.
**Build:**
- **Per-group-shell model.** Each letter group = a materialized header + a reserved row area sized `headerStride + group.items.length * rowStride`. Visible rows are absolutely positioned within their group shell. Gives stable headers, exact letter offsets, natural document height, and O(1) global-index→group/local mapping — no global top/bottom spacer.
- **Fixed geometry for virtual lists:** `.virtual-list .book { height: var(--virtual-book-row-height) }` and `.virtual-list .pline { min-height: <two-line> }` so a live peer name never changes stride. Ordinary (non-virtual) lists keep today's natural layout.
- **Window math:** from `scrollTop`, `OVERSCAN_PX`, `rowStride`, and per-group offsets → the set of visible `(groupIndex, localIndex)` → keys to realize.
- **Synthetic harness (dev-only):** inject arrays directly, no Plex server. Fixtures: 500, 601 (threshold), 5 000, 20 000, skewed (12 000 under "S"), rows whose resume/peer state mutates while visible, structural SWR updates before/inside viewport.
**Tests (automated, on the pure model):** per-page threshold decision; group/letter offset calc; first & last valid windows; rapid jumps A→Z→M; a single letter with more rows than the resident window; anchor preservation after insert/remove/re-sort; orientation/viewport-height change recompute.
**Risk:** medium (the core math). **Done:** all model tests green; harness renders each fixture with realized rows ≈ dozens and correct letter offsets.

### WS1b — Integrate Books + Authors (keyed materialization)
**Goal:** wire the model into `listView` for the two flat lists.
**Change (`browse.js`):**
- When `items.length ≤ FULL_RENDER_MAX` → **existing `listView` path, unchanged.** Else → virtual path.
- **Keyed materialization:** preserve rows whose keys stay in the window; create rows (via the existing `bookRow`/`authorRow` factories — closures/dlbtn/sig logic intact) for entering keys; remove rows for leaving keys. **Never** convert a row for key A into key B.
- **ArtLoader.release(img):** add disposal (`io.unobserve`, drop from pending queue, clear/flag retry timers) and call it when a row leaves the window — IO retains observed targets; disconnected-node checks alone leak under repeated scrolling.
- Presence tick (`o.onRender`) reapplies live numbers to a row **on materialization**, not only on tick.
**Tests:** correct click/play/download target after repeated window changes; old cover URL never appears in a newly materialized row; ArtLoader disposal (no lingering observed/queued targets); a11y — realized rows expose `aria-posinset`/`aria-setsize`, off-window content reachable via keyboard/SR. **Risk:** medium-high. **Done:** Books & Authors virtualize on large fixtures with flat DOM, correct actions, no cover bleed, no leak; identical to today at ≤600.

### WS1c — Author pages, SWR anchoring, pageCache lifecycle, swipe
**Goal:** finish integration and make virtual pages first-class citizens of the cache/nav system.
**Change:**
- **`authorView`** uses the same virtualizer (nonvirtual header, no A–Z index) above `FULL_RENDER_MAX`. `filesView` unchanged, but `log()` pathological chapter counts.
- **SWR scroll anchoring:** before applying fresh data, record `{anchorKey, offsetWithinAnchorPx}`; after rebuilding the sorted/grouped model, restore the anchor's screen position (nearest surviving neighbour if removed). Replaces the "just re-render the window" gap.
- **pageCache → stateful controllers.** Record `{ el, order, controller }` with `activate()/deactivate()/destroy()/update(items)`:
  - only the visible page listens to document scroll; hidden pages stop scheduling/rendering and **dematerialize to ~0 realized rows** (retain data + anchor).
  - `evictLRU`, `reset()`, `clearCache()` **destroy the controller** (listeners, IO/observers, row maps, rAF, timers) before removing the element.
- **Swipe:** ensure a cloned ghost page doesn't react to document scroll and the real page's controller survives the app-view swap (respect app.js:264 — clones must not re-trigger the art loader).
**Tests:** controller activate/deactivate/destroy; **no scroll-listener leak after pageCache eviction**; hidden-page reactivation restores window + anchor; anchor preserved after insertion/removal/re-sort inside vs before viewport; edge-swipe in/out of a virtual page leaves no live hidden controller. **Risk:** high (lifecycle + nav interaction). **Done:** navigate/swipe/evict cycles leak nothing; SWR never jumps the viewport; author pages virtualize.

### WS2b — On-demand neighborhood warming (DEFERRED until WS1 stable)
Not list-trimming — new Browse→Warmer plumbing. Enqueue only **after the viewport settles**; debounce rapid scroll; prefer selected/adjacent rows; **do not** warm every row crossed in an A–Z sweep; dedup against WS2a's set. **Done:** scrolling a large list warms only settled neighborhoods, never floods the relay.

### WS4.2 — Ranged metadata fetch (DEFERRED; coordinated architecture change)
Only when a real user hits painful cold-load. Not a Browse-only optimization — requires a **Home redesign** and answers to: recently-played/added without all books; global alphabetical sort + letter boundaries before all pages fetched; paged storage/revalidation; page-boundary shifts on add/remove; whether Plex server ordering is stable enough for numeric viewport paging. Capture `totalSize`, size a virtual list from the count, fetch pages near the viewport (`Container-Start`/`Container-Size`), evict far pages. **This is the item that actually delivers "arbitrary size"** — WS1 does not.

---

## 4. Verification

**Automated** (Node suite, keep green): WS4.1 predicate; WS2a budget/dedup/ordering; WS3 trim math + serialization; WS1a model matrix; WS1b/c integration (targets, cover bleed, disposal, lifecycle, leaks, anchoring, a11y).

**On-device (the real verdict — can't reproduce locally; no "fixed" until confirmed):**
- **Author's ~145-book library:** confirm *zero* visible change — covers, scroll, letter index, progress bars, resume, presence numbers. This is the acceptance gate for "small libraries sacrifice nothing."
- **Synthetic large fixtures:** flat memory scrolling A→Z; letter-jump lands correctly; hard fling shows ≤1–2 frames of skeleton then fills; playback never starves (warmer gates hold); cover cache stays ≤ high-water; edge-swipe leaves no live hidden controller.

**On-device diagnostics object (expose):**
```
{ pageKey, totalItems, realizedRows, firstIndex, lastIndex,
  activeControllers, renderMs, rowStride,
  warmerQueued, warmerSkipped, coverCacheEntries }
```
Keep it live through the rollout so confirmation is objective, not assumed.

---

## 5. Non-goals / unchanged
- Small-library UX (provably inert — no budget tripped).
- artloader's lazy/concurrency-capped pipeline + `art-instant` cache-hit paint.
- Home carousels' current derivation (until WS4.2's Home redesign).
- Standing architecture: tile/line engine + playback core stay in `app.js`; **no PlaybackController.**
- Deploy discipline: push, user tests live on github.io; all of WS1–WS3 are web-layer JS/CSS + one `sw.js` change → APK self-updates via OTA, **no native rebuild** needed.

## 6. Dead-ends (do not revisit)
- **No pre-decoding a large off-screen band** to "eliminate all pop-in" — decoded bitmaps are ~25× metadata cost, rebuild the unbounded-memory problem, and no finite band survives an arbitrary scrollbar jump. Placeholder-then-fill on settle is correct.
- **No second reachability/stale signal** — cache-first serving is normal, not failure (a prior `withCache` "cache serve == stale" bug stormed reconnects). The virtualizer must not reintroduce it.
- **No measured variable-height virtualizer** — reserve `.pline` geometry instead (see §0).
- **Reuse existing gates** (`elementBusy()`/`foregroundBusy()`) — don't invent new watermarks (prior gold-plating dead-end).

## 6.5 — v2.1 implementation pitfall enumeration (written BEFORE code, 2026-07-17)

Per the no-assumed-success discipline: every state, owner, and boundary named on
paper first; the implementation is checked against this list, not against intent.

**A. The virtual-page controller is a STATE MACHINE — enumerated:**
| state | meaning | entered by | exits |
|---|---|---|---|
| created | model built, shells sized, 0 rows realized | render() cache-miss on a >600 list | activate |
| active | realizes windows from document scroll | showPage(this) while browse visible | deactivate, destroy |
| inactive | hidden; **dematerialized to 0 realized rows**, keeps data+anchor | showPage(other), leaving browse | activate, destroy |
| destroyed | rows released (ArtLoader), maps cleared, deregistered | evictLRU / clearCache / reset | — |
- ONE shared document-scroll listener in the virtualizer dispatches to the ACTIVE
  controller only — leak-proof by construction (no per-controller listeners to forget).
- `update(items)` is legal in created/active/inactive: rebuild model, restore anchor
  (active) or store it (inactive). activate/deactivate idempotent.
- Owner of every transition: browse.js (showPage / evictLRU / clearCache / reset /
  patchInPlace). No transition happens anywhere else.

**B. Data-type/inheritance sweep (which standing invariants apply):**
- Nothing here is durable/destructive user data — the verify-before-destroy gate does
  NOT apply (cover-cache trim deletes refetchable bytes; DOM eviction rebuilds).
- The invariants that DO apply: single-source constants (`FULL_RENDER_MAX` lives in
  js/virtuallist.js ONLY; stride lives in CSS, JS reads it — no JS copy to diverge);
  no silent caps (warmer + truncation + cover trim all log what they dropped);
  cache-first is not a failure signal (virtualizer must not touch reachability).

**C. Traps beyond the v2 review set (each a test obligation):**
1. `patchRows` counts rows — on a virtual page realized ≠ total → it would ALWAYS
   report structural change → full rebuild loop. patchInPlace must route virtual
   pages to `controller.update(items)`, never patchRows/buildFor.
2. Scroll-restore ordering: entry scroll (`sy`) needs document height BEFORE
   scrollTo — group shells are sized synchronously at build, so height exists with
   0 rows realized. The `restoring` gate suppresses the *sy recorder*, not the
   controller's realize-on-scroll (separate listeners).
3. ArtLoader release semantics: `release(img)` = unobserve + purge from pending
   queue + released flag; the retry setTimeout must find the flag and drop (the
   timer itself may outlive the row briefly — flagged, not chased).
4. Newly materialized rows must get live presence/resume numbers ON materialization
   (rAF-debounced onRender), not at the next 1s tick.
5. Swipe ghost: `cloneNode` copies absolutely-positioned realized rows fine; the
   clone has no controller and freezeArt strips re-trigger — but the REAL page's
   controller must survive the swap untouched (no destroy on ghost cleanup).
6. The A–Z jump scrolls to a group SHELL that may have zero realized rows — the
   resulting scroll event realizes the window; shells must exist for every letter
   at all times.
7. Warmer selection needs book→author linkage: `mapBook` must carry
   `parentRatingKey` (currently absent) — without it "their unique authors" is
   unimplementable and would be silently skipped.
8. SW image-index reconciliation: `cache.keys()` order is NOT spec-guaranteed
   insertion order — the index entry is authoritative; keys unknown to the index
   (SW died before flush) are treated as OLDEST (evicted first), deterministic.
   The index entry's own key is excluded from counts/trims. All index ops
   serialized through one promise chain, tied to `event.waitUntil`.
9. Free parameters pinned HOSTILE in tests: 600 vs 601 exactly; a single letter
   group larger than the whole resident window; scrollY at exact group boundaries;
   warmer at budget±1; cover cache at high-water±1; fakes whose `cache.put` can
   reject and whose `keys()` returns shuffled order.
10. Truncation surfacing is user-visible on the affected LIST (header note), not
    only a debug line — no silent caps.

**Rollout builds:** A = WS4.1+WS2a+WS3 · B = WS1a (pure model + tests only) ·
C = WS1b+WS1c (integration). Each gate-green, each inert at ≤600 items.

## 7. Native-port note
Android today is a WebView shell of this web app → all of the above applies as-is. A *true* native port (Compose/SwiftUI) would get windowing/recycling/anchoring/a11y-setsize **for free** from the platform list views (WS1 would not be reused), but **WS2–WS4 (warmer request budget, cover-cache eviction, truncation detection, ranged fetch + Home redesign) port across conceptually** — they're data/network concerns, not rendering.

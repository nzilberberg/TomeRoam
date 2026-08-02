# Fact sheet — the Books page that arrives with structure and no rows

**Subject:** the device-confirmed defect where a Home→Books swipe lands on a Books page whose
header, section letters, row containers and A–Z strip are present and whose rows are absent.
**Derived at:** HEAD `af16852`, build `2026-08-01.300`, tree clean.
**Scope:** the render/cache/hold path that decides whether a browse page carries rows at the
moment a swipe reveals it. Compositor and paint behaviour are out of scope — this defect is DOM
content, and every fact below is a node count or a source line.
**Reproduction:** `Claude/Linnaeus/repro-empty-books-page.js` (headless, jsdom, real
`js/browse.js` + `js/virtuallist.js`). Run: `node Claude/Linnaeus/repro-empty-books-page.js`.
4/4 checks pass at this HEAD.

Marks: **[LB]** load-bearing · **[C]** context · **[U]** underived.

---

## 1. What the instrument's three numbers actually measure

**F1 [LB]** `rows`, `imgs` and `withSrc` on the `FLASH … @reveal` line are sampled from the
**whole `#browse` container**, not from the destination page — `rootEl.querySelectorAll('.book, .author').length`,
`…querySelectorAll('img').length`, and the subset carrying a `src`
(`js/app.js:848-850`). The root passed for a non-home destination is `$('browse')`
(`js/app.js:1114`). So `rows=0 imgs=0 withSrc=0` states that **every cached browse page in the
container held zero rows and zero images**, not merely the page being revealed.

**F2 [LB]** Those three numbers are sampled **before** the commit applies the destination
screen: `reportReveal(...)` is `js/app.js:1114`, `applyScreen(dest, …)` is `js/app.js:1120`.
The emptiness therefore already existed when the gesture settled; nothing the commit did
caused it.

**F3 [LB]** `#N` on the `SWIPE` line and on the `FLASH` line are the same allocation
(`js/app.js:779-781`), and both are logged inside the same synchronous finalize. On the quoted
log that puts the `rows=0` sample at ≈`18:34:06.327` — about 2 ms after the `SWIPE #15` line and
**≈105 ms before** the `CACHE getBooks live` line at `.432`. The `win=505ms` is the mutation-watch
window that closes at `.832` (`js/app.js:1017`, timeout 500 ms).

**F4 [C]** The skeleton placeholder is **not** what was on screen. `placeholderFor` emits nine
`<div class="book skrow">` rows for a list view (`js/browse.js:89-98`), and `.skrow` carries the
class `book`, so a page showing the placeholder reports `rows=9`, not `rows=0`.

---

## 2. What `base n/a` proves

**F5 [LB]** `base n/a` is printed when **either** `revealBase` **or** `now` is falsy —
`const cmp = (!revealBase || !now) ? 'base n/a' : …` (`js/app.js:971`). It is not specifically a
statement about the baseline.

**F6 [LB]** Both values come from `snapBrowse()`, which returns `null` **iff there is no
`.browsepage` inside `#browse` that lacks the `hidden` class**:
`const p = [...document.querySelectorAll('#browse .browsepage')].find((x) => !x.classList.contains('hidden')); if (!p) return null;`
(`js/app.js:283-285`). `revealBase` is captured at gesture start (`js/app.js:547`); `now` is
captured when the watch window closes (`js/app.js:965`).

**F7 [LB]** Therefore `base n/a` proves exactly one of:
(a) at **gesture start** there was no non-hidden `.browsepage` in `#browse`, or
(b) at **window close** (+505 ms) there was none.
It does **not** prove the destination page was missing at the reveal, and it does not prove
anything about rows: a page with zero rows still satisfies `snapBrowse`, so a shells-only page
would have printed the full `ROWS KEPT …` string instead. **`base n/a` says a whole page NODE was
absent at one of those two instants.** Note `snapBrowse` tests only `hidden` — a `.parked` page
(off-viewport but painted) still counts as the visible one.

---

## 3. The step that produces rows=0 with the structure intact

**F8 [LB]** The reported visual — header, section letter, row containers at correct heights,
A–Z strip, no row content — is precisely the virtualizer's shell output plus `listView`'s chrome.
`buildShells()` empties the list container, then per group appends `.lettergroup.vshell`
containing a `.letterhead` (the section letter) and a `.vrows` box whose height is set to
`count × rowStride` — the row containers at their correct heights and nothing inside them
(`js/virtuallist.js:179-201`). The `.browsetitle` header and the `.alphaindex` strip are built
**outside** the controller by `listView`/`virtualView` (`js/browse.js:713`, `js/browse.js:707`),
which is why they survive anything the controller does — a property the code states explicitly at
`js/browse.js:465-473`.

**F9 [LB]** `update()` dematerializes every row, rebuilds the shells, and **realizes only when the
controller is `active`**:
`dematerialize(); model = buildModel(...); buildShells(); if (state === 'active') { … _realize(); } else { … }`
(`js/virtuallist.js:295-313`). A controller in `inactive` or `suspended` therefore ends `update()`
with **zero materialized rows and complete shells**.

**F10 [LB]** Nothing later refills it by accident. `_realize()` returns immediately unless the
state is `active` (`js/virtuallist.js:211`), and `activate()` returns **without realizing** when
the controller is already active and is the current `activeCtl` (`js/virtuallist.js:236`).

**F11 [LB]** `ctl.update()` has exactly one caller: `patchInPlace` (`js/browse.js:492-497`), which
is reached only from the `repaint` closure (`js/browse.js:557`) — the `onFresh` callback handed to
`Plex.getBooks` for the books screen (`js/browse.js:397`, passed at `js/browse.js:560`). **The only
thing in the app that can empty a built browse page's rows in place is a stale-while-revalidate
repaint.**

**F12 [LB]** That repaint is guarded while a gesture is live: `if (holdRows) { heldRepaints.set(key, …); return; }`
(`js/browse.js:550-553`), and `endHold` replays the parked repaints **after** it has activated and
explicitly realized the landed page (`js/browse.js:189-190` then `220-222`). The guard's reason is
recorded in source at `js/browse.js:124-131`: *"an SWR repaint destroys them by a different door
(patchInPlace → ctl.update → dematerialize …)"*. **The defect is this guard not holding.**

**F13 [LB]** Executed, not argued: repro check **A** builds a 145-book virtual page, suspends its
controller the way `showPage` does during a swipe (`js/browse.js:329`), routes one repaint through
the real `patchInPlace`, and measures `rows=0 imgs=0 withSrc=0` with the header, every section
letter, the A–Z strip and every `.vrows` height byte-identical to before. Check **B** then shows
`showPage` under a live hold does not refill it, because `returningFromSwipe` skips `activate()`
(`js/browse.js:355-356`). Check **C** is the control: with the hold intact the same repaint is
deferred and `endHold` restores the rows.

**F14 [LB]** The virtual path is a **precondition**, not a given. `usesVirtual` is
`(forceVirtual && itemCount > 0) || itemCount > FULL_RENDER_MAX` with `FULL_RENDER_MAX = 600`
(`js/virtuallist.js:33, 45`). At 145 books the virtual renderer runs **only** if the Diagnostics
"Windowed browse" override is on, persisted as `localStorage['pb_forceVirtual'] === '1'`
(`js/virtuallist.js:39-41`). With it off, `listView` builds rows inline
(`js/browse.js:724-732`) and a shells-without-rows state is unreachable.

---

## 4. The two candidate end-states, and the tension between them

The log and the screenshot support **different** end-states, and the source cannot collapse them.

**F15 [LB] Candidate E1 — the container was emptied.** `Browse.clearCache()` destroys every
controller and removes every page node (`js/browse.js:76-81`). One call produces all four of the
observed instrument readings at once: `rows=0`, `imgs=0`, `withSrc=0`, and `snapBrowse() → null`
hence `base n/a`. Repro check **D** executes this and asserts all four. E1 requires no race, no
virtual mode and no ordering argument. **What E1 does not explain: a header, a section letter and
an A–Z strip on screen — an emptied `#browse` has none of them.**

**F16 [LB] Candidate E2 — the page survived with empty shells.** F8–F13 above, executed in check A.
E2 explains the screenshot exactly and explains `rows=0 imgs=0 withSrc=0`. **What E2 does not
explain on its own: `base n/a`** — a shells-only page is still a non-hidden `.browsepage`, so
`now` is non-null, and E2 needs `revealBase` to have been null at gesture start (F7a) for a
separate reason.

**F17 [LB] The discriminators, all available without a new build:**
1. **The screenshot.** If the A–Z strip and the section letter are on screen, `#browse` was not
   emptied and E1 is out. Per the standing rule that the user's plain-language element report is
   authoritative, this observation outranks the instrument.
2. **`RECONNECT pass (…)` in the full log** near `18:34:06` (`js/net.js:132`). Its presence puts
   `Browse.clearCache()` in the gesture; its absence removes E1's only mid-gesture producer.
3. **`FLASH repaint deferred (books) — swipe in flight`** (`js/browse.js:552`). Present ⇒ the
   guard held and the repaint was parked. Absent, while a books repaint demonstrably fired ⇒
   `holdRows` was false when it arrived, which is E2's precondition.
4. **Diagnostics → "Windowed browse"** / `localStorage['pb_forceVirtual']` (F14). Off ⇒ E2 is
   unreachable at 145 books.

---

## 5. Why a cache write inside the gesture is the discriminator

**F18 [LB]** The books pair in the log carries **no `cache-first` line**, and that is a decisive
signal. `withCache` logs `<kind> cache-first (revalidating)` on every unforced read that finds a
cache (`js/plex.js:448`), and `opts.force` skips that entire branch (`js/plex.js:433`). The
authors pair the user quotes as the contrast — `CACHE authors cache-first (revalidating)` →
`CACHE wrote 18 authors` — is the ordinary shape. **The books read on gesture #15 was a FORCED
read.**

**F19 [LB]** A forced `getBooks` comes from `loadHomeData({ force: true })`
(`js/home-screen.js:124`), whose callers are `enterApp`, pull-to-refresh (`js/app.js:1384`),
`Net.onReconnect` (`js/app.js:3127`) and `doResetProgress` (`js/app.js:2523`).

**F20 [LB]** Two of those four call `Browse.clearCache()` in the same breath:
- `refreshHome` — `Plex.clearCaches(); Browse.clearCache(); await loadHomeData({ force: true });`
  (`js/app.js:1384`), with **no browse re-render at all**.
- `Net.onReconnect` — `Plex.clearCaches(); Browse.clearCache();` then a re-render **only if the
  current descriptor is not `home`/`nowplaying`/`options`**, then `await loadHomeData({ force: true })`
  (`js/app.js:3118-3127`).

**F21 [LB]** The ordering that matters on a Home→Books gesture: the navigation stack is pushed
inside finalize (`js/app.js:783-786`), so **while the drag is in flight `currentDesc()` is still
`home`** — and `Net.onReconnect`'s guard at `js/app.js:3126` therefore **skips** the browse
re-render. The clear happens; the repair does not.

**F22 [LB]** `Browse.clearCache()` also calls `dropHold()` (`js/browse.js:77`), which sets
`holdRows = false`, bumps `holdGen` and clears `heldRepaints` (`js/browse.js:246`). Two consequences:
the repaint guard (F12) is disarmed for the remainder of the gesture, and the gesture's own
`endHold(token, landed)` becomes a no-op because `token !== holdGen` (`js/browse.js:166`) — so the
landed page is never un-parked, never activated and never realized. Repro check **D** asserts the
stale-token no-op against a matching-token control.

**F23 [C]** The source already names this class. `js/app.js:316-317`: *"Three other paths destroy
browse DOM with no gesture awareness (the SWR repaint's rebuild, `Net.onReconnect` → `clearCache`,
`evictLRU`)."*

---

## 6. Why it is intermittent

**F24 [LB]** The trigger is an **edge**, not a timer and not a TTL. `noteFresh` fires a reconnect
pass on a false→true transition: `if (was === false) reconnectPass('data-path-recovered');`
(`js/net.js:301`). The poller has the same edge (`js/net.js:116`, `'plex-recovered'`).

**F25 [LB]** `plexReachable` is set false by `markCachedRead` (`js/net.js:286`), which
`cacheHook.stale` calls from three places: a read taken while known-offline (`js/plex.js:442`), a
background revalidate that **failed** (`js/plex.js:446`), and a live read that failed and fell back
to cache (`js/plex.js:458`). **One failed background revalidate arms the trap; the next successful
live read springs it.**

**F26 [LB]** The pass is deduped by a single in-flight flag (`js/net.js:129`), so it runs once per
edge — which is why the event is rare rather than repeating.

**F27 [LB]** Rapid back-and-forth swiping is a real amplifier, by construction rather than by
coincidence: each browse render issues a revalidate (`js/browse.js:397`, `js/plex.js:444`), so more
navigations mean more reads, more chances of one failing, and a wider share of wall-clock spent
inside a gesture. There is no cooldown between a revalidate landing and a gesture being live.

**F28 [C]** In-flight coalescing (`js/plex.js:375-390`) merges concurrent reads of the same kind,
so a burst of Books renders produces fewer live reads than renders — the amplification is
sub-linear.

**F29 [U] Underived — which of the two producers fired on gesture #15.** `Net.onReconnect` and
pull-to-refresh are byte-similar at this seam (F20) and the quoted log excerpt contains neither a
`RECONNECT pass` line nor a pull-to-refresh marker. Settleable from the **full** device log
already in hand (F17.2); no new build required.

---

## 7. Blast radius

**F30 [LB] Neither settle branch re-renders.** Commit applies the destination with `{ render: false }`
(`js/app.js:1120`) and abort with `{ render: false, resetScroll: false }` (`js/app.js:1126`);
`Nav.applyScreen` calls `renderBrowse` only when `render` is true (`js/nav.js:153`). Both branches
therefore assume the drag-start render already built and cached the destination page. **Any event
that invalidates that page mid-gesture is unrecoverable at the settle.**

**F31 [LB] Every transition landing on a browse view is exposed**, not only Home→Books: the
destination render happens at drag start for `browse-host` and `browse-page` alike
(`js/app.js:570-571` → `showAppView` → `Browse.render`, `js/app.js:526-527`), and the settle is
render-free for all of them. That covers Home→Books, Home→Authors, overlay→browse,
browse→browse, and back-navigations landing on a browse page. It also covers **aborts** landing on
a browse page.

**F32 [LB] The reconnect's own repair has a hole shaped like the exposure.** `js/app.js:3126`
re-renders only when the current descriptor is not `home`/`nowplaying`/`options`. A gesture
**starting from Home** is exactly the case the guard excludes (F21), so the transition most likely
to be damaged is the one the repair declines to fix. A gesture starting from a browse view is
repaired.

**F33 [LB] It does not self-heal.** Nothing re-renders a browse page on a timer. `updateTruncNote`
only rewrites the truncation note (`js/browse.js:652-665`); the presence tick calls `o.onRender()`,
which refreshes numbers on existing rows and creates none. Recovery requires a call that reaches
`Browse.render` with `render:true` — a navbar tap, a drill-down, a back navigation, or a later
`applyScreen(d, { render: true })`. Under E1 that render is a cache **miss** and rebuilds; under
E2 it is a cache **hit**, and the hit path (`js/browse.js:524-529`) calls `showPage` →
`activate()` → `_realize()`, which refills **provided** the controller is not left `suspended`
under a live hold (F10, repro check B).

**F34 [C]** A second, smaller consequence of a mid-gesture clear: `Browse.pageElFor` **throws** on
a cache miss by design (`js/browse.js:229-241`), so a new gesture arming after the clear and
resolving a `browse-page` source fails at the seam (`js/app.js:561`) rather than silently.

---

## 8. Whether the Stage 2 de-clone changes the exposure

**F35 [LB] For a COMMIT — which is what gesture #15 was — the de-clone changes nothing. The line
is byte-identical across the revert boundary.**

- HEAD `af16852`, `js/app.js:1120`:
  `if (commit) applyScreen(dest, dest.v === 'home' ? { render: false, resetScroll: false } : { render: false });`
- Pre-de-clone `e787d12`, `js/app.js:1256`: the same statement, character for character.

This is an independent source-level explanation of the user's own observation that the defect
reproduces on builds with **and** without the de-clone.

**F36 [LB] For an ABORT the de-clone widens exposure.** Pre-de-clone `e787d12:1261` was
`applyScreen(dest, { render: cur.finPlan.abortRender === 'rerender', resetScroll: false })` — an
abort could re-render, and a re-render rebuilds a page the clear had removed. HEAD `js/app.js:1126`
is unconditional `{ render: false }`. So an abort landing on a browse page that was invalidated
mid-gesture used to be repairable on some paths and now is not.

**F37 [LB]** The de-clone also retired a held-reveal branch that applied the destination with
`{ render: true, resetScroll: false, keepGhosts: true }` (`e787d12:1230`); HEAD has no such call.
That removes a third pre-existing re-render opportunity, again on the abort/held side.

**F38 [C]** Nothing in the de-clone touches `Browse.clearCache`, `dropHold`, the repaint guard,
`Net.onReconnect`, or `withCache` — the whole chain from F11 through F27 predates it and is
unchanged by it.

**Summary for the planner:** on the commit branch the de-clone is **neutral**; on the abort branch
it **narrows the accidental repairs** that used to mask the same underlying invalidation. It is
not the cause of the observed defect, and reverting it would not remove the defect.

---

## 9. Underived facts

**U1** Which of `Net.onReconnect` and pull-to-refresh produced the forced read on gesture #15
(F29). Settleable from the full device log: the `RECONNECT pass (…)` line, `js/net.js:132`.

**U2** Which end-state the device actually reached — E1 (emptied container) or E2 (shells with no
rows) — F15/F16. Settleable from the screenshot plus the two log lines named in F17. Source cannot
discriminate them because both produce the same three instrument numbers.

**U3** Whether `localStorage['pb_forceVirtual']` is set on the device (F14). Settleable from
Diagnostics, or from the presence of `.vshell`/`.vrows` in the screenshot. E2 is unreachable
without it.

**U4** Whether the failing gesture's `revealBase` was null at gesture start (F7a). Not readable
from source — it depends on the DOM state left by the preceding gesture in the burst. The FLASH
lines for #13 and #11 printed a full `ROWS KEPT` string, so `revealBase` was non-null on those.

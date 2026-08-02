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

## 3. How a built page can be left with structure and no rows

> **Scope correction, 2026-08-01 (device log, 48k lines).** F11–F13 below describe a
> **real and reachable** way to empty a built page — an SWR repaint reaching `ctl.update()`.
> It is **not what happened on gesture #15**: the log contains no
> `FLASH repaint deferred (books)` line, and §10 shows the rows were destroyed by the ordinary
> `deactivate()` on the preceding commit→home instead. Read F8–F10 as the general facts (they
> stand and are load-bearing for §10 too) and F11–F13 as a second, unexercised door.

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

## 5. The cache write — what it does and does not tell us

**F18 [LB] — CORRECTED 2026-08-01. My original inference was wrong and I withdraw it.** I wrote
that the absence of a `cache-first` line near the books pair proved a FORCED read. That does not
follow, because **the two lines are not adjacent in time.** `withCache` logs
`<kind> cache-first (revalidating)` at `js/plex.js:448` the instant it serves the cache, while the
background `runLive` logs `getBooks live:` only when the network answers (`js/plex.js:684`) — one
whole round-trip later. So a `cache-first` line for the same kind can sit hundreds of milliseconds
earlier in the log and belong to the very pair in question. The authors pair looked "adjacent"
only because its round-trip was fast. **Correct form of the test:** a read is forced only if there
is no `books cache-first` line anywhere between the previous `getBooks live` and this one — a
window question, not a proximity question, and answerable only against the full log.

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

> **REFUTED 2026-08-01 — `Net.onReconnect` did not fire, and I name that plainly: my leading
> producer was wrong.** The device STATE snapshot for that session (build `2026-08-01.298`,
> `2026-08-02T01:34:11.890Z`) carries `"lastReconnectAt": 0` with `plexReachable: true` and
> `lastPlexResult: "ok"`, and 48k log lines contain no `RECONNECT pass` line
> (`js/net.js:132`). `lastReconnectAt` is written at the top of `reconnectPass`
> (`js/net.js:131`), **before** its first await, so a value of 0 proves the function was never
> entered — the field cannot be missed by a pass that ran. F19–F22 remain a correct enumeration
> of what those callers *would* do; none of them ran. §10 supersedes this as the account of the
> incident.

---

## 6. The reachability edge — a correct mechanism that did NOT fire here

> **Superseded as the trigger, 2026-08-01.** F24–F28 correctly describe the reconnect edge, and
> they remain the right account of *when a reconnect fires*. They are **not** the trigger for this
> defect: no reconnect ever fired on this device (see the note at F23). The operative
> intermittency is in §10.6.

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

## 9. Superseded

The original §9 listed four underived facts. Three are now settled by the 48k-line device log
(§10.7); the current list is §11.

---

## 10. The account of gesture #15, re-derived against the full device log (2026-08-01)

The log the coordinator pulled refutes two of my claims and supplies the sequence that replaces
them. Reproduction checks **E/F/G** in `repro-empty-books-page.js` execute this whole sequence
against the real modules; 7/7 pass at HEAD.

### 10.1 The destroyer is named in the log, and it is not a repaint

**F39 [LB]** The FLASH line for gesture **#14** — `commit→home`, 18:34:05.885 — reads
`rows=0 imgs=46 … realized 15→0 released=15`. `realized` and `released` are the fields of
`snapBrowse`'s comparison and of `ArtLoader.stats()` (`js/app.js:297`, `js/app.js:957-960`).
**15 realizations became 0 and exactly 15 covers were released, on the commit to Home.** That is
`deactivate() → dematerialize()`, which removes every row and calls `opts.release(el)` per row
(`js/virtuallist.js:251-263, 203-206`) through `releaseRow` (`js/browse.js:44-47`). The counts
match one-for-one.

**F40 [LB]** That deactivate is ordinary and intended. Leaving Browse calls `browseWillHide()`
before `display:none` lands (`js/nav.js:55-61`), wired to `Browse.deactivate()`
(`js/browse.js:371`). **Nothing is wrong at this step** — a hidden page is supposed to hold zero
rows.

**F41 [LB]** So the SWR repaint is out as the producer for this incident, independently of F18:
the guard's own diagnostic never fired. The only `FLASH repaint deferred` lines in 48k lines are
at 19:46 for `files:6240`, an hour later on a different view. **I withdraw the repaint as the
cause here.**

### 10.2 The step that turns a normal deactivate into a stuck empty page

**F42 [LB]** On a commit to Home the hold is released **after** `#browse` has been hidden.
`runFinalize()` calls `applyScreen(dest, …)` at `js/app.js:1120`; `dropRowHold()` runs in
`finalize`'s `finally` at `js/app.js:1163-1164`, i.e. strictly later. `dropRowHold` calls
`Browse.endHold(t, currentDesc())` (`js/app.js:371-375`) with `currentDesc()` now `home`.

**F43 [LB]** `keyOf({v:'home'})` returns `'home'` (`js/browse.js:22-23` — not `authorBooks`, not
`files`, so the descriptor's own `v`), and `pageCache.has('home')` is false. `endHold` therefore
takes its **else** branch (`js/browse.js:191-217`), whose last act is
`const shown = activeEntry(); if (shown && shown.el._vctl) { shown.el._vctl.activate(); shown.el._vctl._realize(); }`
(`js/browse.js:211-212`). `activeEntry()` returns the first page that is neither `hidden` nor
`parked` (`js/browse.js:253-256`) — on a browse→home commit `showPage` never ran, so that is the
Books page.

**F44 [LB] Therefore `endHold` activates and realizes the Books page while `#browse` is already
`display:none`.** This contradicts the ordering rule the same file states twice in its own words —
*"a hidden box measures zero"* (`js/browse.js:174-177`, `js/nav.js:56-58`) — which is exactly why
`deactivate()` is called *before* the hide. The else branch does the opposite, *after* it.

**F45 [LB]** A zero-measuring box realizes **zero rows**, by arithmetic, not by guess.
`overscan()` is `Math.round(metrics.viewportH() * 1.5)` when not injected
(`js/virtuallist.js:177`; production never injects — `vlOpts` is test-only, `js/browse.js:32`), so
a `clientHeight` of 0 gives an overscan of 0. `windowFor(model, top, 0, 0)` then has `from === to`,
and the first group fails `if (g.top >= to) break` immediately at `top = 0`
(`js/virtuallist.js:79-94`). The window is empty.

**F46 [LB]** The controller is left in the state that blocks every later refill: `activate()` sets
`state = 'active'` and `activeCtl = api` **before** realizing (`js/virtuallist.js:238-240`). So it
ends `active`, registered as the active controller, holding zero rows.

### 10.3 Why the re-entry 42 ms later does not refill it — answering the coordinator's Q2

**F47 [LB]** Yes, the 42 ms re-entry explains it, but **not** as a race against a rebuild: there is
no rebuild to race. The page node, its shells, its letterheads and its A–Z strip are all intact —
only the rows are gone, and the *only* things that re-create rows are `_realize()` and `update()`.
The re-entry path calls neither:

1. `showPage('books')` reaches `c.activate()` because `returningFromSwipe` requires state
   `'suspended'` and the state is `'active'` (`js/browse.js:355-356`).
2. `activate()` **returns without realizing**: `if (state === 'active' && activeCtl === api) return;`
   (`js/virtuallist.js:236`). Both conditions were set by F46.
3. `positionOnEnter` writes nothing: `anchorEntryY()` needs `savedAnchor`, and `captureAnchor()`
   returned `null` at the deactivate because `top > 0` was false in a zero-measuring box
   (`js/virtuallist.js:247-249`). With `anchorY` null and `entryScrollY('books', null)` also null
   (`js/browse.js:270-273`), the `y != null` guard fails and `applyScrollY` — the only other
   `_realize()` caller on this path (`js/browse.js:286`) — is never reached
   (`js/browse.js:310-313`).

**F48 [LB]** Reproduction check **F** executes exactly 1–3 and measures
`rows=0 imgs=0 withSrc=0` with the chrome intact. Check **E** executes F42–F46. The `end=input`
on #14's line is only the watch window closing early at the next touchstart
(`js/app.js:1018-1021`) — a diagnostic, with no behavioural coupling to the hold.

**F49 [LB]** There is exactly **one** remaining refill opportunity in the whole gesture, and it is
`endHold`'s *landed* branch, which calls `_realize()` **directly**, bypassing `activate()`'s early
return (`js/browse.js:189-190`). Reproduction check **G** shows it does refill when the box
measures. Whether it fired on #15 is §11 U6.

### 10.4 The fork is resolved: empty shells, not an emptied container

**F50 [LB]** E1 is out. Gesture #14 printed a **full** comparison string (`realized 15→0 …`), and
that string is only reachable when `revealBase` **and** `now` are non-null (`js/app.js:971`), i.e.
a `.browsepage` existed at 18:34:05.885. For E1 the node would have to be removed in the following
947 ms, and the only removers are `Browse.clearCache`/`reset`/`evictLRU` (`js/browse.js:68, 79,
374-383`) — reconnect is refuted, and `evictLRU` needs more than `MAX_PAGES = 12` pages
(`js/browse.js:20`). **E2 — the page survives with empty shells — is the end-state**, which is also
what the screenshot shows.

### 10.5 Discriminator 4 is already settled by the log; no device check needed

**F51 [LB]** The Books page **is** virtual, so `pb_forceVirtual` is on. `snapBrowse` reports
`realized: p._vctl && p._vctl.realizedCount ? p._vctl.realizedCount() : -1` and
`state: … : 'classic'` (`js/app.js:296-297`). A classic page therefore prints `realized -1` and
`state classic`. #14 printed `realized 15→0`, which only a live virtual controller can produce.
This also independently confirms F14 and makes the whole shells-without-rows shape reachable at 145
books. **Do not spend a device check on it.**

**F52 [C]** The corollary matters for scope: with "Windowed browse" **off**, `listView` builds rows
inline (`js/browse.js:724-732`), there is no controller, nothing dematerializes, and this defect is
structurally unreachable.

### 10.6 Intermittency, restated — answering the coordinator's Q1 and Q3

**F53 [LB]** The trigger is not a network event at all. It is the **descriptor the gesture lands
on**: `endHold`'s else branch runs whenever `keyFor(landed)` names no cached browse page
(`js/browse.js:171-172`), which for a commit means **any transition landing on Home or an
overlay** while a browse page is the current `activeEntry()`. That is a routine, high-frequency
navigation, which is why the arming half happens constantly.

**F54 [LB]** What makes the *visible* failure rare is the second half: the next entry into that
same browse page must take the cache-hit path with no anchor to restore (F47.3) and must not reach
`endHold`'s landed `_realize()` in a state where it can measure. Rapid back-and-forth swiping
maximises it because it pairs a →Home commit with a →Books commit inside a few tens of
milliseconds, with no intervening scroll — and a scroll is the one other thing that would call
`_realize()` (`js/virtuallist.js:144-149`).

**F55 [LB] Answer to Q1 — every source path that can emit `getBooks live:` with no `cache-first`
line of its own.** Enumerated from `js/plex.js:417-461` and `js/plex.js:670-689`:
1. **Forced** — `opts.force` skips the whole cache branch (`js/plex.js:433`). Reached only from
   `Plex.getBooks({force})` in `HomeScreen.load` (`js/home-screen.js:124`), whose forcing callers
   are `refreshHome` (`js/app.js:1384`), `doResetProgress` (`js/app.js:2523`) and `Net.onReconnect`
   (`js/app.js:3127`). `enterApp` calls `loadHomeData()` with **no** opts (`js/app.js:1317`), so it
   is not forced.
2. **Warm prefetch with no cache** — `opts.warm` returns the cache if present and otherwise runs
   live with `silent: true` (`js/plex.js:428-431`). Sole caller: `js/warmer.js:127`
   `Plex.getBooks({ warm: true })`. ⭐ `silent` suppresses `cacheHook.fresh` (`js/plex.js:381-385`),
   so this path **cannot** drive reachability and **cannot** fire a reconnect — which is precisely
   consistent with `lastReconnectAt: 0`.
3. **No cache at all** — an unforced read whose `fromCache()` is `undefined` falls through to
   `await trackFg(runLive(...))` with no cache-first line (`js/plex.js:452-454`). Reachable from
   any `getBooks` caller: `js/browse.js:397`, `js/home-screen.js:124`, `js/app.js:2561`,
   `js/logpipe.js:58`.
4. **A revalidate whose `cache-first` line is simply earlier in the log** — the F18 correction.
   Not a distinct path; the commonest explanation.
5. Not a producer: the session short-circuit `if (booksCache && !opts.force) return booksCache;`
   (`js/plex.js:671`) logs nothing at all, and `runLive`'s in-flight coalescing
   (`js/plex.js:375-390`) collapses concurrent callers to one live read, so the log line names the
   read, never the caller.

**F56 [LB]** None of paths 2–4 touches `Browse.clearCache` or the row hold. **On the corrected
account the cache write at 18:34:06.432/.444 is a bystander, not a participant** — it lands inside
the watch window and does nothing to the DOM. The coordinator's reading that it is "downstream" is
right that it is not upstream; the stronger statement is that it is **off the causal path
entirely**. Its correlation with the failing gesture is not yet explained (§11 U5) and should not
be leaned on.

### 10.7 What the log settled

| Original claim | Status |
|---|---|
| `Net.onReconnect` → `Browse.clearCache()` is the producer | **Refuted** (F23 note) |
| No `cache-first` line ⇒ forced read | **Withdrawn**, replaced by a window test (F18) |
| An SWR repaint emptied the page | **Refuted for this incident** (F41); still a reachable door (F11–F13) |
| E1 (emptied container) vs E2 (empty shells) | **Resolved: E2** (F50) |
| Discriminator 4 needs a device check | **Settled from the log** (F51) |
| De-clone is neutral on commits (§8) | **Unchanged** — byte-identical line, independent of all the above |

---

## 11. Underived facts

**U5 [U]** Why a `getBooks` live read landed in #15's window at all, and which of F55's paths it
was. Settleable from the full log: the `books cache-first` line preceding it, if any, and whether
a `WARM` line from `js/warmer.js:131` sits nearby.

**U6 [U]** Whether `endHold`'s landed `_realize()` (F49) ran on #15 and still realized nothing, or
ran and realized rows the user never saw. The field that answers it is the `realized X→Y` in the
comparison string — which #15 suppressed by printing `base n/a`. **The elided middle of #15's own
FLASH line is in the coordinator's log** and carries the `COVERED`/`EXPOSED`/`hidden +img` buckets
that bound it.

**U7 [U]** Why #15 printed `base n/a` at all. Under E2 a non-hidden `.browsepage` existed at both
sampling instants, so `snapBrowse` should have returned an object twice (F6). This is the one fact
the corrected account does **not** explain, and it is the highest-value remaining question. The
`state=` field on **#14's** line bounds it: it reads `active→…`, and whether the right-hand side is
`active` says directly whether F46 left the controller stuck. Both fields are already in hand.

**U8 [C→U]** Whether any transition **other** than →Home/→overlay reaches `endHold`'s else branch
in production. Derivable only by enumerating landed descriptors against `pageCache`; the source
comment at `js/browse.js:192-204` claims the set is exactly four, and that claim is worth
re-checking against §10 rather than inherited.

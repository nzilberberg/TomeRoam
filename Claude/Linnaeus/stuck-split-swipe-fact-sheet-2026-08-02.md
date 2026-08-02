# Fact sheet — the stuck split-screen swipe, and the repeated `home→books` aborts

Derived by Linnaeus, 2026-08-02, against HEAD `fa8782c` / build `2026-08-01.303`.
**Filed by Zelda from the handoff message.** The derivation survived three runs; two were killed by
API errors *between* finishing the analysis and writing it down, so the third was asked to report in
the reply and file nothing. **No reproduction was built.**

⛔ **Not the empty-Books defect.** That one is FIXED and device-confirmed on `.303`
(`FLASH #29 commit→books rows=30 … realized 0→15 state inactive→active`). See
`empty-books-page-fact-sheet-2026-08-01.md` (§10 supersedes). Do not re-open it.
⛔ **Not caused by that fix.** Three consecutive `abort fwd home→books` also occur at
`10:47:35/:36/:38` on an earlier build in the same log (`tgt=live:div.view.parked`); abort:commit is
13:98 before the fix and 17:111 after.

---

## The verdict: TWO defects, sharing only a design precondition

**Every abort finalizes and clears. No abort can leave the split.** `runFinalize` clears both movers
(`js/app.js:791`), `resetSwipeStyles` clears again (`js/nav.js:104-117`, called at `:129`), and
`setView` re-parks/hides (`js/nav.js:52,69`). `#33` logged from *inside* `runFinalize`
(`js/app.js:789`), so it reached all of that.

The split therefore requires that **`settle()` was never entered — `end()` never ran.** Finalize is
otherwise guaranteed by `setTimeout(finalize, 340)` (`js/app.js:1187`). That is an **event-delivery**
condition (`js/app.js:326-342`), outside source's reach.

The only shared precondition is post-de-clone geometry — both real views un-hidden and transformed
at once. **That is design, not fault.**

---

## ⭐ THE DISCRIMINATOR — cheap, device-answerable, run it first

`begin()` runs its hard reset whenever `d` is non-null (`js/app.js:435-488`) — **before** the target
filter (`:495`) and the edge test (`:496`). So **any tap anywhere should clear the split.**

- **Tap clears it** ⇒ frozen-live-gesture class (`d` non-null, `end()` never delivered).
- **Split survives taps** ⇒ `d` is null: an orphaned transform, a *different* mechanism.

---

## 1. The stuck visual — what is on screen

`home→books` resolves outgoing = real `#home`, incoming = real `#browse`, both **borrowed-real**
(`js/swipe.js:110-114, 181, 188-191, 251, 260`; `js/app.js:569-571, 580`), bases `0` and `+w`
(`js/app.js:602-604`). `move()` writes `#home → translateX(t)` and `#browse → translateX(w+t)`
(`js/app.js:651`). **That inline pair is the screenshot.**

- The navbar still reads **Home** because `setNavActive` runs only from `applyScreen`
  (`js/nav.js:143,152`) — and no `applyScreen` ran.
- Books fills the right pane because `showPage` **parks** other pages rather than hiding them while
  the hold is live (`js/browse.js:338-342`).

`resetSwipeStyles` covers both movers (`js/nav.js:107-115`) — **it is not the omission.** The gap is
that no `applyScreen` runs at all.

## 2. The three aborts — bounded, not settled

`settle(cur, !flickNo && (flickGo || prog > THRESH))`; `EDGE=44, FLICK_V=0.4, THRESH=0.42`
(`js/app.js:198, 665-668`). Two properties make back-and-forth swiping a direct abort producer:

- `t = Math.min(0, dx)` for a forward gesture (`js/app.js:648`) — rightward travel contributes
  nothing, and `d.dx` is the **latest** leftward offset, not the maximum.
- `d.vx` is resampled only past 8 ms (`js/app.js:652-653`), so a finger rolling back in the final
  sample sets `flickNo` and **vetoes even a fully-dragged gesture**.

**Excluded:** supersession (a superseded session returns at `js/app.js:1173` *before* logging, so it
emits no `#N` line — all three logged); a throwing `start()` (§3 proves the destination render
completed). sids 34→35→36→37 with no gaps prove exactly three arms — `++sessionSeq` is allocated
after every reject (`js/app.js:505` vs gates at `:420/435/495/496`).

## 3. `released=15` with `realized 0→0` — correct, not a contradiction

A complete realize-then-release cycle strictly *between* the two samples. `revealBase` is taken in
`start()` before the mid-drag render (`js/app.js:556`); `now` at window close (`js/app.js:974`);
`before = ArtLoader.stats()` inside `reportReveal` (`js/app.js:855`), called at `js/app.js:1123`.

Mid-drag `renderDestination` → `showAppView(dest,true)` → `Browse.render` cache hit → `showPage` →
state is `inactive` not `suspended`, so `c.activate()` runs (`js/browse.js:355-356`) and realizes ~15
rows. Abort: `applyScreen(home)` (`js/app.js:1140`) → `Nav.setView` → `browseWillHide`
(`js/nav.js:55-61`) → `Browse.deactivate` (`js/browse.js:371`) → `dematerialize`
(`js/virtuallist.js:251-254`) → `releaseRow` (`js/browse.js:44-47`) → `stats.released++`
(`js/artloader.js:57`). Those are the **destination's** covers. Confirmed by `#29`: same realize,
commit keeps the page, `released=0`.

## 4. `scrollWrites` — NOT implicated

The patch lives from `js/app.js:1084` to `:961`. Inside it, `runFinalize` contains exactly one
`window.scrollTo`, in the **abort** branch (`js/app.js:1141`); the commit branch (`:1134`) has none.
So the field is present on every abort and absent on every commit **by construction**. Value 0
because `cur.scroll0 = window.scrollY||0` (`js/app.js:506`) and both views are fixed own-scroll
boxes. The frame `finalize@app.js:1180:26` is the caller slice (`js/app.js:1088`) — the abort restore
itself.

---

## NOT SETTLED — recorded rather than reasoned past

- **Why each gesture aborted.** ⭐ `dx`, `vx`, `prog` and `w` appear on **neither** the `SWIPE #N`
  line (`js/app.js:789-790`) **nor** the `FLASH` line (`js/app.js:1016-1021`). Cannot be settled from
  source or from this log. **This is an instrumentation gap and the cheapest thing to close.**
- **Why `end()` was never delivered** on the stuck gesture. Outside source's reach.
- **Whether the two defects share a cause.** A dropped `touchmove` stream would give a stale small
  `d.dx` (abort) and a dropped `touchend` would freeze — one story for both, with **no** source
  evidence. Explicitly a hypothesis.
- **The quoted excerpt is elided.** Three `SWIPE start fwd home→books` lines must exist (`start()`
  logs unconditionally at `js/app.js:595`; `settle` needs `live` from `js/app.js:555`); only one was
  quoted. The missing lines carry `ghosts=`.
- **"166 ms" is likely 106 ms.** `FLASH #30` at `.788` was printed by `finish()`, which the
  capture-phase `touchstart` listener (`js/app.js:1030-1033`) fires ahead of the bubble-phase arming
  listener (`js/app.js:1194`) — so touchstart was `.788`, 106 ms after `SWIPE #30` at `.682`, and
  `start` at `.848` is the 8 px lock (`js/app.js:641-644`). **Depends on `#30` ending `end=input`,
  which the excerpt elides.** Either way the arm was clean: `finishing=false` (`js/app.js:1143`) and
  `session=null` (`:1153,:1181`) both ran synchronously inside the `.682` finalize — so this is
  **not** the same class as the 42 ms re-entry, which inherited a poisoned controller.

## Side findings, neither causal

- **`tgt`'s class list is sampled at FINALIZE, not touchstart** (`js/app.js:780-783`). `div.view` is
  a container-level grab — `#home` and `#browse` both carry `class="view"` (`index.html:48,62`). So
  `#30`'s `div.browsepage` is **not** anomalous. What parked `#home` on the earlier build's
  `div.view.parked` was not settled; HEAD's `showAppView` deliberately does not (`js/app.js:526-535`).
- **`scrollWrites` self-destructs when two reveal windows overlap**: the newer finalize patches
  `scrollTo` at `:1084`, then `reportReveal` (`:1123`) flushes the older window, whose
  `restoreScrollTo` (`:961`) overwrites the new patch. Its presence on these lines is itself evidence
  that `#30`'s window had already closed.
- **Unverified:** `finalize`'s `transitionend` anchor is `movers[0].el` = `#home`, with no
  `e.target`/`propertyName` filter (`js/app.js:1185-1186`), and `transitionend` bubbles. Whether any
  `#home` descendant runs a CSS *transition* was not checked. It could only truncate the settle
  animation — it still logs and still clears, so it explains neither symptom.

# PROBE — the .265 clamp-preempt: relocated or eliminated? (Linnaeus)

Type: fact sheet (deriver — facts derived from primary source at HEAD `017605d` = build `.265`, cited
`file:line`, read against the device oracle). READ-ONLY. No code/plan/test edits. Not a build plan.
2026-07-28.

Subject: build `.265` added a clamp PRE-EMPT — `window.scrollTo(0, 0)` in `js/nav.js setView` (nav.js:85),
guarded `v!=='browse' && !browseEl.classList.contains('hidden')`, after `browseWillHide`, before
`#browse` `display:none`. The `books→home` flash PERSISTS on device. Derive: does the preempt fire;
is `finalize=10211` a real miss or a sample-ordering artifact; is the scroll jump RELOCATED or
ELIMINATED; is a stable-document-height option viable to remove the jump entirely; and the underived
compositor residual.

Device oracle (`.265` confirmed; two `books→home` commits, same session):
```
#5 commit back books→home: scroll=[finalize=0/14676     final=0/895]  scrollWrites=[0@+7:applyScreen@nav.js:153:46 applyScreen@app.js:115:53]  released=22
#7 commit back books→home: scroll=[finalize=10211/14676 final=0/895]  scrollWrites=[0@+1:applyScreen@nav.js:153:46 applyScreen@app.js:115:53]  released=33
(.264 contrast: finalize=11247/14676 final=43/895 — clamped)
```

Companion to `PROBE-artrelease-reveal`, `PROBE-home-scroll-surface`, `PROBE-home-carousel-layers`
(2026-07-28). Marks: **[LB]** load-bearing, **[CX]** context, **[UD]** underived (runtime; what
settles it named).

---

## 0. HEADLINE (read first)

- **Q1 — the preempt FIRES on `books→home`, and `finalize=10211` is a SAMPLE-ORDERING ARTIFACT, not a
  miss. [LB]** `mark('finalize')` samples the window scroll at app.js:1187, which runs BEFORE the
  commit→home `applyScreen(dest,{render:false})` at app.js:1222 — and that `applyScreen` is what
  reaches the nav.js:85 preempt. So `finalize` reads the PRE-preempt scroll. Both logged
  `scrollWrites=[0@…:applyScreen@nav.js:153 …app.js:115]` ARE the nav.js:85 preempt (value `0`, the
  caller chain `applyScreen@nav.js:153`→`app.js:115`; the retired write was value `1`). Both commits
  reach `final=0`.
- **Q2 — #5 vs #7 differ only in the outgoing books scroll at the pre-preempt sample. [LB]** #5's
  finalize sampled a books-at-top state (`0`); #7's sampled books-scrolled-to-"P" (`10211`). Both then
  preempt to `0` and collapse to `final=0`. Not inconsistent preempt behavior.
- **Q3 — the jump is RELOCATED, not ELIMINATED. [LB]** Going books(10211)→home the window scroll still
  travels 10211→0; the preempt just moves that change to BEFORE the collapse (an explicit `scrollTo(0,0)`
  instead of a post-collapse clamp). `.265` still produces a large window-scroll delta on a scrolled
  commit; the device-clean TOP case has NO delta (0→0).
- **Q4 — a stable-document-height option WOULD remove the jump entirely. [LB]** The window-scroll change
  is forced ONLY by the `#browse` collapse (the document shrinking below the current scroll → clamp).
  Fixed `#home` (position:fixed, css:123) does not use or require `window.scrollY`, and the old
  `scrollTo(0,1)` is retired. If the document height stayed stable across the `#browse` hide, nothing
  would force `window.scrollY` to change → no jump, like the top case. Reachable — fixed-`#home`
  decoupled home from the document height (css:73 is now only the navbar runway).
- **Q5 — UNDERIVED (compositor):** whether an in-range window-scroll jump (or the `#browse`-collapse
  recomposite, or the incoming `#home` slide-transform demote) re-rasters the fixed-`#home` carousel
  sublayers regardless of occlusion. The rAF FLASH gate is compositor-blind. Device settles it.

---

## Q1 — does the preempt fire on `books→home`, and is `finalize=10211` a miss?

**[LB] The preempt guard evaluates TRUE on a `books→home` commit applyScreen.** `applyScreen({v:'home'},
{render:false})` (app.js:1222) → nav.js:153 (`desc.v==='home'` branch) → `setView('home')`. In setView:
nav.js:56 `!npOpen && !optOpen && !subOpen` is true for `home`; nav.js:60 `v !== 'browse' &&
!browseEl.classList.contains('hidden')` — `home !== browse` true, and `#browse` is still SHOWN at this
point (the no-swap home construction slides real `#home` over `#browse` but does not hide `#browse`
until this commit applyScreen), so the guard is true → nav.js:66 `browseWillHide()` → nav.js:85
`window.scrollTo(0, 0)` → nav.js:87 `#browse` `display:none`. **[LB]**

**[LB] The logged `scrollWrites` ARE the nav.js:85 preempt.** The finalize path installs a `window.scrollTo`
wrapper at app.js:1173-1185 that records `value@+ms:callerframes`. The recorded write is `0@…`
(value 0) — matching nav.js:85 `window.scrollTo(0, 0)`, and DISTINCT from the retired
`applyScreen` write which was `scrollTo(0, 1)` (value 1). The caller frames
`applyScreen@nav.js:153`/`applyScreen@app.js:115` are exactly the chain that reaches the preempt
(app.js:115 `applyScreen`→nav.js:153 home branch→`setView`→nav.js:85). The home branch's own scroll
reset is `$('home').scrollTop = 0` (nav.js:153) — an ELEMENT scroll, NOT `window.scrollTo`, so it is
not the wrapped write; the only `window.scrollTo` on this synchronous path is nav.js:85. **[LB]**

**[UD] The `setView@nav.js:85` frame itself is not printed** — the stack slice takes `split('\n').slice(2,4)`
(app.js:1178), so two adjacent frames survive, and the printed pair is `nav.js:153`/`app.js:115`. Whether
`setView@nav.js:85` was elided by the slice window or by JIT inlining of `setView` into `applyScreen` is a
V8-runtime detail; it does not change the identification (value `0` + the applyScreen→home chain are
conclusive). Settle if ever needed: an un-sliced stack dump. **[UD]**

**[LB] `finalize=10211` is a SAMPLE-ORDERING ARTIFACT, not a preempt miss.** `mark('finalize')` runs at
app.js:1187; the commit→home held branch is RETIRED in 6i (app.js:1188-1192), so the commit falls
through to the no-hold tail where `applyScreen(dest,{render:false})` (app.js:1222) fires the preempt —
AFTER the finalize sample. Therefore `finalize` reads `window.scrollY` BEFORE the preempt zeroes it.
`finalize=10211` means "sampled while books were still scrolled to ~10211", not "the preempt failed."
Both #5 and #7 log the `0@…` preempt write and both reach `final=0`. **[LB]**

**Answer: YES the preempt fires on `books→home`; `finalize=10211` is sampled-before-the-preempt, a
timing artifact, not a miss.**

---

## Q2 — ordering vs the two events; the #5 vs #7 difference

**[LB] The order on a `.265` `books→home` commit is:**
1. `mark('finalize')` — samples `window.scrollY` (app.js:1187) → the `finalize=X` value. **BEFORE** the
   preempt and **BEFORE** the collapse.
2. fall-through: `cover.dropAt`, `dropPanes()`, `reportReveal('commit→home', …)` (app.js:1212-1221).
3. `applyScreen(dest,{render:false})` (app.js:1222) → nav.js:153 → `setView('home')`:
   - nav.js:66 `browseWillHide()` (deactivate books controller),
   - nav.js:85 `window.scrollTo(0, 0)` — **the preempt** (`@+1`–`@+7`ms after finalize),
   - nav.js:87 `#browse` `display:none` — **the collapse** (14676→895).
So `scrollTo(0,0)` runs AFTER the finalize sample and BEFORE the `#browse` collapse. Because the scroll
is already `0` when the collapse lands, the browser has nothing to clamp → `final=0`. **[LB]**

**[LB] #5 vs #7 explained by the outgoing books scroll at the finalize sample instant.** The finalize
sample (app.js:1187) reads whatever the window scroll is when finalize runs — i.e. how far the outgoing
books list was scrolled. #5 sampled `0` (books at top), #7 sampled `10211` (books scrolled to "P").
Both then hit the same nav.js:85 preempt (both log `0@…`) and the same collapse → both `final=0`. The
difference is the SAMPLE, not the preempt. **[LB]** (`released=22` vs `33` scale with scroll depth —
the departing-books virtual-list teardown, benign/off-screen; see `PROBE-artrelease-reveal` §Q1.)

---

## Q3 — RELOCATED or ELIMINATED (the key question)

**[LB] The 10211→0 window-scroll change is RELOCATED, not eliminated.** Leaving books(scrolled 10211)
for home, the window scroll MUST reach 0 (`final=0`). In `.264` that happened as a post-collapse CLAMP
(document shrinks below 10211 → browser forces `scrollY` to the new max ~43). In `.265` the preempt
does the SAME 10211→0 change EXPLICITLY at nav.js:85, one step earlier — while `#browse` is still tall
(an in-range scroll, per the preempt's own rationale, nav.js:67-84). Either way the window scroll
travels the full ~10211→0 on the commit. **The delta is moved in time, not removed.** **[LB]**

**[LB] Contrast the TOP case: no delta at all.** From books-at-top→home the window is `0→0` — the
device-clean case (#5 is effectively this: `finalize=0`). So `.265` still produces a large window-scroll
delta on a SCROLLED commit (#7) that the top case does not. **[LB]**

**[LB] What changes the window scroll, and why a jump is unavoidable while `#browse` drives the document
scroll.** `#browse` is an in-flow `.view` (index.html:62) that holds the document tall (14676) when
scrolled. On `→home` the window scroll must end at (or below) the collapsed document's max. Two writers
produce that: (a) the browser's auto-clamp when `#browse` `display:none` shrinks the document
(nav.js:87), and (b) the explicit preempt `scrollTo(0,0)` (nav.js:85) that pre-empts (a). Both are the
same forced 10211→0 travel. So while the outgoing `#browse` both drives the document height AND is
removed on the commit, a scrolled commit cannot avoid a window-scroll delta — only choose clamp-after
vs scroll-before. **[LB]**

---

## Q4 — the stable-document-height option

**[LB] The window-scroll change is FORCED ONLY by the collapse; nothing else on `→home` requires it.**
Home is `position:fixed` (css:123-129), viewport-anchored, and uses its OWN `overflow-y:auto` scroll —
it renders correctly at any `window.scrollY` and does not require `0` (`PROBE-home-scroll-surface` Q4).
The old document `scrollTo(0,1)` seating write is RETIRED (nav.js:101-105, 145-153). So the only reason
`window.scrollY` changes on a `books→home` commit is the `#browse` collapse clamping it (Q3). **[LB]**

**[LB] Keeping the document height stable across the `#browse` hide would remove the forced change
entirely.** If the document did not shrink below the outgoing scroll when `#browse` is hidden, the
browser would not clamp, and no other code path writes the window scroll on `→home` (the preempt exists
only to pre-empt that clamp) → `window.scrollY` need never change → no jump, exactly the top case
(`0→0` / `X→X`). **[LB]**

**[LB] The stable-height option is REACHABLE given fixed-`#home`.** The document-height source when home
is active is `.app { min-height: calc(100% + 12vh) }` (css:73) plus in-flow content; with `#home`
now `position:fixed` (out of flow, css:123) and `#browse` the only tall in-flow contributor, hiding
`#browse` is what collapses `.app` to the ~895 runway. Fixed-`#home` decoupled home from the document
height (css:73 is now purely the navbar-seating runway, nav.js:101-105), so the document height is no
longer tied to which view is active — a height held stable across the `#browse` hide does not conflict
with home's own scroll. **[LB]** *(How to hold it stable — a spacer, a retained min-height, deferring
the collapse — is design; that is Vitruvius's. Derived here: the collapse is the sole forcing cause,
and removing it removes the forced window-scroll change.)*

**[UD] Whether removing the jump removes the FLASH depends on Q5.** If the flash is driven by the
window-scroll delta, stable-height (no delta) removes it; if it is the `#browse`-collapse recomposite
itself, stable-height (no collapse) also removes it; if it is the incoming `#home` slide-transform
demote, stable-height does not touch it. Which dominates is the underived compositor question. **[UD]**

---

## Q5 — the underived compositor residual

**[LB] Source elimination on `.265`.** The preempt fires (Q1), lands the window at 0 before the collapse
(Q2), and `final=0` (no clamp). Yet the flash persists. The DOM-visible signals (`released`, `src`) are
the departing BOOKS list (`PROBE-artrelease-reveal` §Q1), and the home carousels are insulated from the
window scroll (fixed `#home`, `PROBE-home-scroll-surface` Q4) and did not re-fetch/re-fade. So the
persisting flash is not a DOM write the instrumentation can see. **[LB]**

**[UD] The residual is a compositor re-raster, and which input forces it is not source-readable.**
Candidates, none settleable from source, all surviving `.265`:
1. the RELOCATED window-scroll jump itself (10211→0, Q3) re-rastering the fixed-`#home` carousel
   sublayers even though it is in-range and `#home` is occluding/viewport-anchored;
2. the `#browse`-collapse document recomposite (14676→895, still present, Q3);
3. the incoming real-`#home` slide-transform demote (`borrowed-real` mover; `will-change:transform`
   css:131) — from `PROBE-artrelease-reveal` §5.
The rAF FLASH gate is main-thread and compositor-blind (the saga's withdrawn-frame lesson). Settle:
on-device Safari compositing-layer borders and/or a high-frame-rate capture across a scrolled
`books→home` commit — observe whether the carousel layers re-raster on the preempt-scroll frame, the
`display:none`/collapse frame, or the slide-transform-clear frame. jsdom cannot composite. **[UD]**

---

## Handoff → Vitruvius (the planner)

Source artifact: this sheet (`Claude/Linnaeus/PROBE-clamp-preempt-2026-07-28.md`). Derived against `.265`
(HEAD `017605d`): (1) the nav.js:85 preempt FIRES on `books→home` (guard true at the commit
`applyScreen`→nav.js:153→setView, value-`0` write in `scrollWrites`); `finalize=10211` is a
sample-ordering artifact — `mark('finalize')` (app.js:1187) runs BEFORE the preempt (app.js:1222→nav.js:85)
— not a miss; #5(0)/#7(10211) differ only in the outgoing books scroll at the sample instant, both
`final=0`. (2) The 10211→0 window-scroll change is RELOCATED (explicit `scrollTo(0,0)` before the
collapse) not ELIMINATED — `.265` still has a large scroll delta on a scrolled commit; the top case has
none. (3) The delta is forced ONLY by the `#browse` collapse; home (fixed) does not require
`window.scrollY=0`; a document height held stable across the `#browse` hide would remove the forced
change entirely (no jump, like the top case) and is reachable because fixed-`#home` decoupled home from
the document height (css:73). (4) Whether removing the jump removes the FLASH, and whether an in-range
scroll jump / collapse recomposite / incoming slide-transform demote re-rasters the fixed-`#home`
carousel sublayers, is UNDERIVED (compositor) — device layer-border / frame capture settles it. Linnaeus
states the facts and hands over; the design is Vitruvius's.

VERDICT: DERIVED

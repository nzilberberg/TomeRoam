# Obsolescence candidates — fixes that may be load-bearing only against a cause we removed

Working note (Zelda). Opened 2026-07-31.

**The hypothesis, from the user:** *"MOST if not all the flash bugs were a result of all the
duplicate screens we were swapping out, and now that we aren't doing that, other flash fixes are
somewhat moot."*

It has **already played out twice** — both found by reading source, both still described as
outstanding in plan/board prose at the time. This file exists so the rest get checked deliberately
instead of accumulating as unexplained machinery.

**Why a list and not a sweep-and-delete.** A mechanism whose stated cause is gone may still be
load-bearing for a cause nobody wrote down. `.parked { overflow: hidden }` is the standing example:
it reads vestigial and is in fact the only thing keeping Blink's scroll anchoring engaged. So every
entry carries a **discriminator** — the specific observation that decides it. Removing one without
running its discriminator is how a cleanup becomes a regression.

⚠️ **Read the code, not the plan status.** Both resolved entries below were reported as outstanding
from plan prose while the code had already moved. A plan's status line records what was intended
when it was written; only source says what ships. Every entry names a **source anchor** so a stale
entry is detectable: when the named symbol no longer exists, the entry is out of date by
construction.

---

## RESOLVED — precedent, kept to show the shape

### 1. Stage 6h's scroll-settle gate — retired by 6i, on exactly the hypothesis above
- **Was:** `holdGhostUntilPaintable` gained a third async gate `settled`, armed on a large outgoing
  scroll clamp, released by `scrollend` or a bounded `SETTLE_MS` backstop.
- **Stated cause:** an iOS compositor scroll-collapse snap under the document reflow that a →home
  transition caused.
- **Why it went:** 6i made the active `#home` a `position: fixed` own-scroll view, so →home never
  reflows the document. `js/app.js` records it: "→home was its only consumer (a scroll-collapse snap
  under a document reflow that a fixed, never-reflowing `#home` no longer causes)". The gate reverted
  to its pre-6h form, `decoded && painted`.
- **Anchor:** `js/app.js`, `holdGhostUntilPaintable`. Sole remaining caller is the abort→browse held
  reveal.

### 2. Stage 6g's `translateZ(0)` — reverted; the spec argument was falsified on device
- **Was:** `#home { transform: translateZ(0) }`, chosen over `will-change: transform` on the argument
  that it is an equivalent-but-non-droppable layer promotion.
- **What happened:** it flashed on device (2026-07-27 log). HEAD carries `will-change: transform` —
  the `.256` form the device A/B actually validated.
- **Anchor:** `css/app.css`, `#home.parked { … will-change: transform }`.
- Cross-reference: `device-only-fix-ship-tested-form`. "Spec-identical" was falsified by real iOS.

---

## OPEN — cause plausibly removed, discriminator not yet run

### 3. `#home`'s permanent compositing layer (`will-change: transform`)
- **Stated cause:** removing `.parked` at a reveal demotes `#home` from its own layer, and the demote
  is the home→books abort flash.
- **Why it may be obsolete:** 6i made the active `#home` `position: fixed` own-scroll — it never
  leaves `position: fixed`. That removed flash hypothesis (i), the reflow-reposition. Hypothesis
  (ii) — clearing the parked `translateX(-101vw)` on its own layer forcing descendant carousel layers
  to re-raster — was never device-cleared, and this declaration is what guards it.
- **Assessment:** weakest candidate for removal. One hypothesis removed, one still live.
- **Discriminator:** delete the declaration; scroll Books down; swipe toward home and ABORT. Flash
  returns ⇒ keep, and record that it guards (ii). Clean over several repeats ⇒ it was guarding (i)
  only.
- **Anchor:** `css/app.css`, `#home.parked`.

### 4. `z-index: 25` / `z-index: 26` on `#options` and the settings subs
- **Stated causes, both recorded:** covering page content, and stacking a sub above the hub.
- **Why obsolete:** Stage A1 made them ordinary peers — swapped one at a time, never co-visible — and
  A1b made every screen park or hide what is beneath it. Both stated causes are gone. The plan states
  that no record says why a settings screen needs a `z-index` at all once nothing lives underneath it.
- **Assessment:** strongest candidate. Already planned as Stage A2.
- **Discriminator:** delete both; open Options and each sub; confirm no bleed-through and that the
  fixed topbar and navbar still stack correctly.
- **Anchors:** `css/app.css:220`, `css/app.css:783`.

### 5. `ghostApp`'s `paddingTop = '53px'`
- **Stated cause:** the clone strips ids, so id-keyed CSS stops applying and the copy lays out
  differently from the original. `(51 + 14) − 12 = 53` realigns the copy's content-top.
- **Why obsolete:** it exists only to reconcile a copy with its original. `browse→browse` is the last
  transition that clones; declone Stage 2 deletes `ghostApp` and this with it.
- **Assessment:** dies with declone Stage 2. No separate work.
- **Anchor:** `js/swipe.js`, inside `ghostApp()`.
- Canonical instance of `compensating-constant-is-a-cause-report`.

### 6. Browse's `sy` save/restore and `beginRestore`'s swap-clamp suppression
- **Stated causes:** per-page scroll is lost when a page leaves the shared `#browse` scroller; and
  swapping pages resizes the host, firing a clamp event that must be suppressed.
- **Why obsolete:** declone Stage 2 makes each `.browsepage` its own fixed inset own-scroll box. A
  page that never leaves the DOM never loses its `scrollTop`, and showing a different page no longer
  resizes any scroller, so no clamp fires.
- **Assessment:** planned deletions inside declone Stage 2; listed so they are not re-justified.
- **Anchors:** `js/browse.js` — the `cur.sy` write, `beginRestore()`, `entryScrollY(…, savedY, …)`.

---

## CHECKED — looks like a candidate, is not. Do not remove.

### 7. `showAppView`'s stale-settings sweep
Verified live across three review rounds. A1b made the scenario its comment named dead and rewrote
only the comment; the sweep itself is still reached on another path. Listed here because the next
reader will have the same thought.
**Anchor:** `js/app.js`, the stale-overlay hide inside `showAppView`.

### 8. `.parked { overflow: hidden }`
Load-bearing. Reads vestigial; is the only thing keeping Blink's scroll anchoring engaged — a
non-none `transform` on a scroll container suppresses anchoring, and `overflow: hidden` un-suppresses
it. Its sibling `top: 0` genuinely was vestigial and was deleted; this is not.
**Anchor:** `css/app.css`, `#home.parked`.

---

## NOT A FIX — remove on the user's word

### 9. The red `--page-bg` diagnostic gradient
`css/app.css:41`. A deliberate live diagnostic, not a defect. Stays until the user says otherwise.

---

## DEFERRED WORK — chosen postponements, not obsolescence

These are not mechanisms outliving their cause; they are work we decided not to do yet. Listed here
so the same file answers "what do we still owe" and nothing needs a second home.

### 10. Stage A2 — delete `z-index: 25` / `z-index: 26`
Same item as entry 4 above, stated as work rather than as a candidate. Two declarations, two comment
clauses, one build bump. Safe because DOM order reproduces both deleted relationships: the five subs
sit after `#options` in the markup, so at `auto` a sub still paints above the hub.
⚠️ **Tell the device gate the real reason.** An earlier draft justified this by saying `.alphaindex`
is "hidden with `#browse`" — true at rest, **false during a browse↔settings gesture**, when `#browse`
is an un-hidden mover. The conclusion holds by a different mechanism: as a mover `#browse` carries an
inline `transform`, and a non-none transform establishes a stacking context, so `.alphaindex` is
contained inside it and cannot outstack a sibling. **Containment, not hiding.**
(`PLAN-one-screen-type.md` §5.2 and the §5.5 correction.)

✅ **A2's premise was briefly COUPLED to declone Stage 2 — RESOLVED 2026-08-01.** The containment
argument requires `#browse` to carry an inline `transform`, which requires it to generate a principal
box. Declone Stage 2 as *originally written* made `#browse` `display: contents` — no box, no
transform, no stacking context, and A2's stated ground would have been gone. The review caught it
(`Claude/Charpy/PLAN-swipe-declone-stage2-charpy.md`) and the rework (`735601d`) **keeps `#browse`'s
`position: fixed` box**, so §5.5 stays true and A2 loses no premise. Kept here as the record of a
coupling that was invisible from either plan alone — A2's ground lives in `PLAN-one-screen-type.md`
and the mechanism that would have falsified it lived in `PLAN-swipe-declone.md`.
⚠️ Still true regardless: **re-check this dependency if Stage 2's mechanism changes again.**

### 11. Stage B — the transition taxonomy
`overlay` becomes Now Playing alone; the kind table grows from 8 to 14 rows. Pure records/naming
work: the thing `js/nav.js`'s name-check identifies stops being "an additive overlay", so the
taxonomy that still says so is wrong. No behaviour change.

### 12. The `340` magic number — three places, nothing binding them
`js/app.js:1305` (`cur.settleTimer = setTimeout(finalize, 340)`) and `js/nav.js:204`
(`setTimeout(finish, 340)`) are both bare literals timing a CSS transition, and the CSS duration is
not co-located with either. Three copies of one fact with no mechanical relationship: change the CSS
and both timers are silently wrong.
**Note the distinction:** the `transitionend` + idempotent `done` + timeout-fallback idiom is
defensible and is not the defect. The defect is the unbound constant.
**Fix:** single-source it (a CSS custom property read once, or one exported constant) and gate it
against the CSS value.

### 13. Master-plan stage 10 — remove old diagnostics and simplify
The swipe/reveal plan retains a structured trace through migration (session id, state transition,
selected plan, resources acquired/released, pane lifecycle, lease, commit/abort reason, final
descriptor, final scroll) behind the Diagnostics toggle. Stage 10 removes what is no longer earning
its keep — explicitly **after** device parity, not before.

### 14. Plan-step ownership — every step names its owner
Plan steps should carry an explicit `owner:` and a single enumeration, enforced by the Vitruvius
authoring gate. Earned by dispatching work to the wrong seat because the step's owner had to be
inferred from the work's flavour rather than read. Cross-reference `dispatch-the-named-owner`.

---

## How to work this list
1. Pick an entry and run its own discriminator on device — not a general "does the app look fine".
2. If it is removed: move the entry to RESOLVED with what the device showed, and delete the mechanism
   in a commit that changes nothing else, so any regression is attributable.
3. If it survives: record what it was actually guarding. That is worth more than the deletion.
4. Never batch two removals into one build. Attribution is the whole point.

# RED suite — Stage A1 of ONE SCREEN TYPE (Options and its subs become `.browsepage` peers)

Author: Curie (test design). Date: 2026-07-30. Plan of record:
`Claude/Plans/PLAN-one-screen-type.md` (PLAN_READY — reviewed TEMPER, both Structural findings
folded; `Claude/Charpy/PLAN-one-screen-type-charpy.md`). Authored at HEAD `714c94d`, build
`2026-07-30.278`; committed at build `2026-07-30.279`.

**VERDICT: RED_SUITE_READY.**

## 1. What this suite proves, and what it does not

It proves the CI-checkable behaviour of Stage A1 — that a settings screen becomes a **peer**:

1. **`ONEPAGE`** — applying any of the six settings screens leaves **exactly one** of the six
   without `.hidden`, and it is the applied one. The hub does not stay mounted under its own
   sub-screen.
2. **`PEERPARK`** — entering a settings screen parks `#home` and hides `#browse` exactly as
   entering Browse does, and `d.browseWillHide()` fires **once** on the shown→hidden edge,
   observed while `#browse` was still un-hidden.
3. **`PEERFINALIZE`** — the narrowed park guard is correct on the **gesture-finalize** path, over
   all three `browseWillHide` trigger edges the plan enumerates in §9, driven through the real
   shipped touch listeners.
4. **`NOSETTINGSBG`** — the legal painter set of `--page-bg` is exactly `body::before` and
   `.nowplaying`, and `#home`/`#browse`/`#options`/the five-sub group declare no background at all.
5. **`NPUNTOUCHED`** — applying Now Playing leaves whichever settings screen was showing exactly as
   it was, and `.nowplaying` keeps its inset, its `z-index: 60` and its background.

**It asserts no geometry, no stacking, no paint and no occlusion.** Every assertion is source text,
class state, call count, call ordering or a pure return. jsdom has no layout, paint, font boosting
or scroll anchoring, so a cell claiming that a settings screen occludes what is behind it, or that
removing a `z-index` does not flash, **could not fail** and would be a false witness. Those remain
the plan's §15 device rows: R-A's residual paint consequence, R-B (cover re-decode on
browse→settings), R-C (the 6f overlay-background residue), R-E (the home↔settings park/un-park
flash surface), R-F (the A2 stacking inversion) and R-G (the two-transparent-pane filmstrip).

## 2. Files

| File | State | Contents |
|---|---|---|
| `test/one-screen-type.test.js` | **NEW** | `ONEPAGE`, `PEERPARK`, `NPUNTOUCHED` (unit + source) |
| `test/one-screen-type-finalize.test.js` | **NEW** | `PEERFINALIZE` (integration, app harness) |
| `test/page-bg-single-painter.test.js` | **CHANGED** | `NOSETTINGSBG` added, extended in place per §16.1 |
| `tools/mutate.mjs` | **CHANGED** | three mutants registered (#102, #103, #104) |
| `build.json`, `sw.js`, `js/debug.js`, `index.html` | **CHANGED** | build bumped to `2026-07-30.279` |
| `js/**`, `css/**` | **UNTOUCHED** | production source is the builder's; nothing here edits it |

### Why `PEERFINALIZE` is in its own file

`test/app-harness.js`'s `boot()` replaces `global.window`/`global.document` with its own JSDOM and
closes it on `dispose()`. The unit cells drive the `js/nav.js` singleton against the module-level
fixture document (`js/nav.js` reads `document` as a bare global for `body.classList` and
`querySelectorAll`). Mixing them in one process leaves whichever runs second pointed at a torn-down
DOM — **measured**: `NPUNTOUCHED` failed with `Cannot read properties of null (reading 'classList')`
once a `boot()` cell had run first. That is a harness artefact, not the defect the cell is for, so
the two halves get one process each and every red stays honest.

### Why `NOSETTINGSBG` lands in `test/page-bg-single-painter.test.js`

§16.1 specifies that file "extended in place", and putting the cell anywhere else would produce a
**second copy of the page-background contract** — the staleness class the plan's §1 records three
times. Stage A1's job there (plan §12 items 17-18) therefore reduces to: delete the three
superseded tests, delete the stale "THE MODEL" header block, delete `TRANSPARENT_SELECTORS` /
`OPAQUE_SELECTORS`, remove the skip.

## 3. SKIP-PENDING-BUILD — how a red suite passes the pre-commit battery

`core.hooksPath = tools/hooks` with `tomeroam.hooks = true`, so `tools/hooks/run-checks.mjs` runs
the full suite on every commit and blocks on any plain failure; this project does not use
`--no-verify`. Every cell whose behaviour does not exist yet is committed `{ skip: SKIP }`, keeping
the committed battery green (`no-mutbak / stamp / lint / typecheck / tests / campaign-gates /
retired-name` all ✓). Each was **confirmed red with the skip removed** — the run is quoted in §4.

**`NPUNTOUCHED` is committed UNSKIPPED and green** (see §5).

**The builder removes `{ skip: SKIP }` on each cell to drive it red, then builds to green. No
assertion is weakened to green a cell.**

## 4. The RED run at HEAD `714c94d`, skips removed — CONFIRMED

`node --test test/one-screen-type.test.js test/one-screen-type-finalize.test.js
test/page-bg-single-painter.test.js` → `# pass 7  # fail 5`. Each failure quoted verbatim, with
the defect it is for:

| Cell | Failure at HEAD | The defect it is for |
|---|---|---|
| `ONEPAGE` | `applying 'general' left [options, general] un-hidden` — and the same for `playback`, `buffering`, `downloads`, `diagnostics` | `js/nav.js:83` keeps `#options` un-hidden whenever a sub is applied. This *is* the reported defect: the hub and the General sub rendered through each other, statically. |
| `PEERPARK` (park/hide) | `entering a settings screen must HIDE #browse — the settings screen is a peer, not an overlay painted over a live, un-parked page` (expected `true`, actual `false`) | the park guard at `js/nav.js:56` exempts `options` and every sub. |
| `PEERPARK` (hook) | `Browse.deactivate must fire exactly once on the browse→settings edge — this edge does not exist at HEAD` (expected `1`, actual `0`) | §9 edge 1 does not exist at HEAD. |
| `PEERFINALIZE` (home park) | `a committed home→settings gesture must park the real #home at finalize` (expected `true`, actual `false`) | the narrowed guard runs at finalize too; nothing drove it there. |
| `PEERFINALIZE` (edge 1) | `a committed browse→settings gesture must hide #browse at finalize` (expected `true`, actual `false`) | §9 edge 1 through the gesture path. |
| `PEERFINALIZE` (edge 2) | `fixture sanity: after A1, entering Options from Books hides #browse (PEERPARK)` (expected `true`, actual `false`) | the cell's precondition is itself A1 behaviour — see the note below. |
| `PEERFINALIZE` (edge 3) | `closing Now Playing back to a settings screen must hide the #browse the NP→files abort left un-hidden` (expected `true`, actual `false`) | §9 edge 3; the pre-existing residue A1 removes. |
| `NOSETTINGSBG` (painter set) | `Expected: ["body::before",".nowplaying"], found: ["#downloads, #general, #playback, #buffering, #diagnostics","#options",".nowplaying","body::before"]` | four painters at HEAD; two after A1. |
| `NOSETTINGSBG` (transparency) | ``#options` is a peer screen … must declare no background property at all` — with the rule body showing `background: var(--page-bg);` | the declaration A1 deletes. |

**Note on `PEERFINALIZE` edge 2.** At HEAD it stops on its own fixture-sanity precondition
(`entering Options from Books hides #browse`) rather than on its final assertion, because that
precondition is itself Stage-A1 behaviour. That is the correct red for the cell's reason, not an
incidental error: the edge it drives — an abort re-hiding the `#browse` the mid-drag render
un-hid — cannot exist until A1 lands. The **rest** of the cell was verified reachable and correct
by driving the identical gesture at HEAD with the precondition relaxed: the mid-drag render does
un-hide `#browse` (`js/app.js:496-497`), the swipe log reads `#1 abort back options→books`, and the
post-abort state at HEAD is `#browse` un-hidden with **0** deactivations. Once A1 lands the cell
proceeds past the precondition to the assertions it is named for.

## 5. `NPUNTOUCHED` is a PRESERVATION cell — green at HEAD, deliberately, and unskipped

⚠️ **This is a Coverage-Model observation the campaign framing should carry, not a gap I filled.**
Step 2 was briefed as "all five cells RED at HEAD". `NPUNTOUCHED` **cannot** be red at HEAD and
must not be made so. Its subject is the settled scope boundary — `.nowplaying` is out of scope, and
the cell exists to prove it **stays untouched** (invariant S4). Every property it asserts is
already true at HEAD and must remain true; an assertion contrived to fail today would be asserting
something the plan forbids changing, and would have to be un-asserted by the build.

The red-first discipline's actual requirement — *the measurement can detect the error it exists to
detect* — is therefore met by its **mutant**, which is registered and confirmed:

```
#104  caught (4 failing) — one-screen-type NPUNTOUCHED: the npOpen exemption is removed …
       killed by: NPUNTOUCHED — applying Now Playing leaves the settings screen that was showing exactly as it was, for the NP-back reveal
       killed by: NPUNTOUCHED — applying Now Playing over a settings SUB-screen leaves that sub showing
       killed by: Now Playing leaves the settings overlays as they were (for the back-reveal)   [pre-existing nav.test.js guard]
       killed by: eslint: no errors in shipped app code   [incidental — `if (true)` trips no-constant-condition]
```

It is committed **unskipped** precisely so that mutant has a live killer. This is the same
treatment the repo already gives guards whose red state cannot be staged (`M1WRITERSET`'s
`benignAlone` note, `BROWSEFIXED`'s source-text carve-out).

## 6. The three `browseWillHide` edges `PEERFINALIZE` actually drives

All three of plan §9, through the real shipped touch listeners in `test/app-harness.js`, plus a
fourth gesture for the park half of the guard. Each recipe was probe-verified at HEAD before the
assertions were written, so no cell rests on a gesture that silently never armed.

| # | Edge | Gesture driven | Verified at HEAD |
|---|---|---|---|
| — | park half at finalize | tap Options → commit a left-edge back-swipe `options→home` (pops `options` onto the forward stack) → commit a right-edge forward-swipe `home→options` | swipe log `#2 commit fwd home→options`; `#home.parked` = **false** |
| 1 | button-nav browse→settings, reached through finalize | tap Books → tap Options → commit back-swipe `options→books` → commit forward-swipe `books→options` | swipe log `#2 commit fwd books→options`; `#browse.hidden` = **false**, deactivations = **0** |
| 2 | **abort of a `settings→browse` gesture** | tap Books → tap Options → left-edge back-swipe `options→books`, retreated to the edge → **abort** | swipe log `#1 abort back options→books`; the mid-drag render un-hides `#browse` (confirmed in-test); post-abort `#browse.hidden` = **false**, deactivations = **0** |
| 3 | **NP closed back to a settings screen after an `NP→files` abort left `#browse` un-hidden** | tap a real book tile → reach playing → tap Options → tap `#player` (NP over Options) → right-edge forward-swipe `nowplaying→files`, retreated → **abort** → commit a left-edge back-swipe `nowplaying→options` | swipe log `#1 abort fwd nowplaying→files` then `#2 commit back nowplaying→options`; after the abort `#browse.hidden` = **false**; after the NP close `#browse.hidden` = **false**, deactivations = **0** |

Each asserts, and only asserts: the `parked` / `hidden` class state after finalize, the deactivation
**call count** (exactly 1), and the `#browse` hidden state **observed at the instant the hook ran**
(must be `false`). `app.js` wires `browseWillHide: () => Browse.deactivate()` and resolves the
global `Browse` at call time, so the recording dep is installed by patching the harness's fake after
boot — the production path is unmodified and no test-only export is added to `app.js`.

## 7. Registered mutations, and the six specified for the build commit

### Registered now (anchors exist at HEAD and are stable across A1) — swept, 0 uncaught

```
#102  caught (1 failing) — PEERPARK/PEERFINALIZE-b
       killed by: leaving Browse for Home deactivates the Browse controller BEFORE hiding it
#103  caught (3 failing) — NOSETTINGSBG-b
       killed by: NPUNTOUCHED — the .nowplaying rule still declares its own inset, z-index and background (source)
       killed by: PAGE-BG-SINGLE-PAINTER -- exactly body::before + the additive overlays paint --page-bg
       killed by: PAGE-BG-SINGLE-PAINTER -- each additive overlay declares its own --page-bg background
#104  caught (4 failing) — NPUNTOUCHED   (see §5)
swept 3: 0 uncaught, 0 unapplied, 0 stale flags
```

| # | Mutant | Expected killing cell | Killer at HEAD (the cell is skipped until A1) |
|---|---|---|---|
| 102 | `#browse` is hidden BEFORE the `browseWillHide` anchor capture | `PEERPARK` + `PEERFINALIZE` observed-un-hidden assertions | `nav.test.js` deactivate-before-hide (same invariant, home edge) |
| 103 | `.nowplaying` loses its own `--page-bg` background | `NOSETTINGSBG` painter-set equality | `PAGE-BG-SINGLE-PAINTER` (the predecessor in the same file, deleted in the same commit that unskips `NOSETTINGSBG` — the guard is never undefended for an instant) |
| 104 | the `npOpen` exemption is removed | `NPUNTOUCHED` | `NPUNTOUCHED` itself (unskipped) |

### ⛔ #104 MUST be re-anchored in the A1 commit — mechanized, not a note

Stage A1 narrows the park guard at `js/nav.js:56` to `if (!npOpen) {` — **byte-identical** to the
settings guard at `:82` that #104 anchors on. After the build that `from` occurs **twice** in
`js/nav.js` and `test/mutation-anchors.test.js` refuses it with `NON-UNIQUE ANCHOR`, which blocks
the commit until the builder disambiguates. Extend the `from` with the six-way loop that follows it:

```js
from: "    if (!npOpen) {\n      for (const s of ['options', ...SETTINGS_SUBS])"
to:   "    if (true) {\n      for (const s of ['options', ...SETTINGS_SUBS])"
```

(matching whatever exact loop text ships). This collision is real whether or not #104 exists; the
registration is what makes the builder *see* it, at the one moment it matters.

### Specified for registration in the A1 build commit (six)

These anchor on text **A1 creates**, or would be **no-ops** at HEAD. Registering either kind now
reddens `test/mutation-anchors.test.js` (`ANCHOR NOT FOUND`, or the no-op gate), so they are
registered at build time — the same treatment `Claude/Curie/RED-browse-decouple.md` used, for the
same mechanical reason. Each carries disambiguating context from the start (in this repo an anchor
is assumed non-unique until the tool proves otherwise).

| Mutant | Defect to inject, post-A1 | Expected killing cell |
|---|---|---|
| `ONEPAGE` | Restore the hub-stays-mounted rule: after the six-way loop, re-add `$('options').classList.toggle('hidden', !(v === 'options' \|\| isSub(v)));` so the hub is un-hidden whenever a sub is applied. **This is commit `6c9e7e3`'s exact shape** with the backgrounds already gone. | `ONEPAGE` |
| `PEERPARK-a` | Restore the settings exemption in the park guard: `if (!npOpen)` → `if (!npOpen && v !== 'options' && !isSub(v))`. | `PEERPARK` (both class assertions) |
| `PEERFINALIZE-a` | The same defect, proven on the gesture path. Registering it separately from `PEERPARK-a` is optional — one entry suffices if the sweep reports both cells as killers; register two only if the two reds are textually distinct. | `PEERFINALIZE` (all four gestures) |
| `NOSETTINGSBG-a` | Re-add `background: var(--page-bg);` to the `#options` rule, so the painter set gains a seventh member. | `NOSETTINGSBG` (both assertions) |
| *(optional)* `NOSETTINGSBG-a'` | The same, on the five-sub group. | `NOSETTINGSBG` |
| *(optional)* `PEERPARK-c` | Delete the `d.browseWillHide()` call entirely, so the hook never fires on the settings edges (distinct from #102, which fires it at the wrong time). | `PEERPARK` + `PEERFINALIZE` call-count assertions |

## 8. The §8-ordering-5 dependency is carried by the cell set, and I confirm it

**No cell here can pass with the backgrounds gone and the visibility block intact.** `ONEPAGE`
reads nothing whatever about backgrounds — it asserts only the `hidden` class across the six
elements — so on a build in commit `6c9e7e3`'s shape (both backgrounds deleted, `js/nav.js:83`
still keeping the hub mounted under its sub) it stays **RED** with the same message it produces
today. The converse is inert and correctly so: deleting the co-visibility without deleting the
backgrounds greens `ONEPAGE`/`PEERPARK`/`PEERFINALIZE` and leaves `NOSETTINGSBG` red, which is a
build that fixes the defect and leaves dead declarations — the plan's own reading. The cell set
therefore cannot bless the reverted commit in either direction.

## 9. What remains device-owed (NOT CI, and no cell here implies it)

- **R-A residual** — the *paint* consequence of iOS-26 fixed-bar seating. The mechanism is closed
  by construction (every screen under `#library` is `position: fixed`, so hiding one cannot shrink
  the document), but a source fact is not a paint observation.
- **R-B** — cover re-decode returning Books→Options→Books, now that `#browse` is `display: none`
  on that path.
- **R-C** — whether anything peeks during an in-flow→settings drag now that the settings
  destination is transparent. A zero-gap measurement in Blink is not a claim about WebKit.
- **R-E** — the home↔settings park/un-park now takes the known flash surface; the `will-change`
  mitigation is present, and only a device settles whether it is clean.
- **R-F** — the Stage-A2 stacking inversion, which exists only while `#home` is un-parked.
- **R-G** — the hub↔sub filmstrip between two now-transparent panes.
- **Everything Stage A2 and Stage B touch.** An A1 device pass is not evidence about either. And
  per the standing scar: *the form that is device-tested is the form that ships.*

## 10. Lockstep — what the builder must also do (NOT done here)

1. **Remove `{ skip: SKIP }`** on all four skipped cells across the three files; drive them red;
   build to green.
2. **`test/page-bg-single-painter.test.js`** — delete the three superseded tests, the stale "THE
   MODEL" header block, and `TRANSPARENT_SELECTORS`/`OPAQUE_SELECTORS` (plan §12 items 17-18 /
   §16.1). `NOSETTINGSBG` is the replacement and is already in the file.
3. **`test/nav.test.js:36-44`** — invert `'a sub-screen keeps the Options hub MOUNTED underneath
   it (build .106)'` (plan §12 item 19). It will redden the moment `js/nav.js:83` goes. Its
   sibling at `:112` (deactivate-before-hide) and at `:69` (NP leaves the overlays alone) both
   stay true and must be kept — `:112` is #102's HEAD killer.
4. **`test/page-bg-js-painter.test.js:4`** — scrub "the three additive overlays" (plan §12 item 22).
5. **Register the six mutants of §7**, and **re-anchor #104** (§7's boxed note) — the anchors gate
   blocks the commit otherwise.
6. **Bump the build number** (any commit ⇒ a new build number).

## 11. Handoff

- **To the builder (step 3):** everything in §10, plus the Stage-A1 production edits the plan
  specifies in §13 step 3 and §12. ⛔ Read plan §8 ordering 5 before splitting step 3 — the
  background deletion is safe only in a commit that also collapses the visibility block, and that
  has already been violated once in this repository with a revert to show for it.
- **To the coverage auditor (step 12):** audit these cells against plan §14. Note (a) the
  `NPUNTOUCHED` preservation-cell treatment in §5 and whether the mutant-only failure evidence is
  accepted; (b) the six mutants deferred to build-time registration in §7 and whether they landed;
  (c) that R-A's residual, R-B, R-C, R-E, R-F and R-G are device-owed, not CI, and no cell here
  claims them.
- **Routed to the planner (Coverage-Model observation, no action required to proceed):** §14 lists
  `NPUNTOUCHED` among the "Stage-A1 red cells", but it is a preservation cell and cannot be red at
  HEAD. §5 records how its failure capability is established instead. The plan's §13 step 2 wording
  ("Red at HEAD") is accurate for the other four.

VERDICT: RED_SUITE_READY

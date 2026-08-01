# RED suite — PLAN-one-screen-type.md Stage A1b (Now Playing parks the page beneath it)

**VERDICT: RED_SUITE_READY** — 2026-07-31

Authored at plan step 7, against the Coverage Model in `PLAN-one-screen-type.md` §14 and the design
in §5.3, before the Stage-A1b build (step 8). Plan review of record:
`Claude/Charpy/PLAN-one-screen-type-A1b-charpy-r3.md`, **FORGE**, `20c1663`.

The product change A1b makes is two deletions and nothing else: both `if (!npOpen)` guards in
`js/nav.js` `setView()`, at `:51` and `:78`.

---

## 1. The cells

| Cell | File | Layer | Subject |
|---|---|---|---|
| `NPPARKS` (3 tests) | `test/one-screen-type-npparks.test.js` | unit, `Nav` against the real index fixture | entering Now Playing parks `#home`, hides `#browse` and hides all six settings screens, and fires `browseWillHide` once on the shown→hidden edge while `#browse` is still un-hidden |
| `NPRECONCILE` (1 test) | `test/one-screen-type-npreconcile.test.js` | integration, `test/app-harness.js` over the real shipped gesture listeners | repeated aborted Now Playing gestures do not grow the set of screens mounted beneath Now Playing |
| `PEERFINALIZE` edge 3, **relocated** | `test/one-screen-type-finalize.test.js:194` | integration, same harness | after A1b the `browseWillHide` edge is crossed at the **NP→files abort**, not at the Now Playing close |

All three are committed `{ skip: … }`, the convention the `FILMSTRIPDRAG` and Stage-6i suites
established: the pre-commit battery runs the whole suite and the project does not use
`--no-verify`, so a plain-red cell would block the commit. The builder removes the skip to drive
them red, then builds to green. **No assertion may be weakened to green a cell.**

### `NPPARKS` — why three entry sources rather than one

Each source isolates a different half of the change, and none of them can see the others:

- **from Browse** — the only source that crosses `js/nav.js:55`'s shown→hidden edge, so it is the
  only one that can assert the `browseWillHide` call count and its ordering. This is plan §9 edge 4.
- **from a settings screen** — the half the ratified-mark supersession turns on (§5.3, probe §9.1):
  the six-way loop must now hide the screen Now Playing was opened over.
- **from Home** — the only source that isolates the **park** toggle. Entering from Browse or from a
  settings screen leaves `#home` already parked, so neither can distinguish "A1b parked it" from
  "it was already parked".

### `NPRECONCILE` — why the entry state is read, not asserted

What Now Playing's entry leaves mounted beneath it is `NPPARKS`'s subject. Pinned here as an
assertion (`deepEqual(…, [])`) the cell **halts on the entry invariant and never drives a
gesture** — measured, not predicted: that is exactly what the first draft did. It would then mark
the accumulation swept on every future skim while proving nothing about it. The entry set is
therefore captured as an instrument reading and both aborts are asserted equal to it, which makes
the cell fail for its own reason: the **growth** across gestures.

### `PEERFINALIZE` edge 3 — relocation, not a re-pointed assertion

Per §5.3.4 and §6a the cell's subject ceases to exist at A1b: the abort's own
`applyScreen('nowplaying')` hides `#browse`, so by the Now Playing close the edge test at
`js/nav.js:55` is false and the hook fires **zero** times there. The whole scenario moves to the
abort and the recorder is installed **before** it — installed after, as the previous version did,
the relocated call goes unrecorded. The replaced version's `isHidden('options') === false` and
"the NP→files abort must leave `#browse` un-hidden" were *fixture sanity* and would have reddened
wherever the hook assertion pointed, which is why this is a rewrite.

The relocated cell also asserts the second half of the relocation — that the Now Playing close does
**not** fire the hook again — so it proves the edge moved rather than being duplicated.

**Deliberately not re-asserted here:** what Now Playing's entry does to the settings screen it
opened over. `NPPARKS` owns it; a second copy of a live contract is the staleness class this plan's
§1 records three times, and asserting it here would make the cell halt on `NPPARKS`'s claim.

---

## 2. Red confirmed, and the reason each cell failed

Run against HEAD `56caa6c` with the skips removed, `node --test`:

| Cell | Failing assertion | Observed |
|---|---|---|
| `NPPARKS` from Browse | `#browse` must be hidden after entering Now Playing | `false` — the `:51` guard skips the hide block |
| `NPPARKS` from a settings screen | all six settings screens hidden | `['options']` still un-hidden — the `:78` guard skips the loop |
| `NPPARKS` from Home | `#home` must be parked | `false` — the `:51` guard skips the park toggle |
| `NPRECONCILE` | both aborts leave the set as entry left it | entry `[home]`, after abort 1 `[home]`, after abort 2 `[home, browse]` — **the accumulation, reproduced on shipped code through the real touch listeners** |
| `PEERFINALIZE` edge 3 relocated | the abort must re-hide the `#browse` its own mid-drag render un-hid | `false` — the abort's `applyScreen('nowplaying')` puts nothing back |

Each fails on its own subject, not on a fixture sanity or a compile error.

## 3. Green confirmed under the two-guard deletion

A disposable probe replaced both `if (!npOpen) {` with `if (true) {` in `js/nav.js` — behaviourally
identical to the deletion, brace-balanced, and reverted with `git checkout` before anything was
committed (`git diff js/ css/` empty at commit time). Under it **all eight tests in the three files
pass**, including the four pre-existing `PEERFINALIZE` cells. So the suite is red for the change
A1b makes and green for it, and it does not redden anything A1b leaves alone.

---

## 4. Mutants — for registration in the A1b build commit

None of the three can be registered now: each anchors on text A1b **creates** (the unguarded block
bodies), and a `from` that does not occur at HEAD reddens `test/mutation-anchors.test.js` with
ANCHOR NOT FOUND. This is the same build-time registration Stage A1 used, for the same reason.

Each was **executed** against the probe and its kill list recorded. Anchors are given as statement
text; **the leading whitespace must be taken from the built file** — A1b removes a brace level and
the natural build de-indents these bodies.

| Mutant | `from` | `to` | Kills |
|---|---|---|---|
| `NPPARKS-a` — the park exemption restored | `$('home').classList.toggle('parked', v !== 'home');` | `if (!npOpen) $('home').classList.toggle('parked', v !== 'home');` | `NPPARKS` from Home |
| `NPPARKS-a'` — the browse-hide exemption restored | `browseEl.classList.toggle('hidden', v !== 'browse');` | `if (!npOpen) browseEl.classList.toggle('hidden', v !== 'browse');` | `NPPARKS` from Browse, `NPRECONCILE`, `PEERFINALIZE` edge 3 relocated |
| `NPPARKS-b` — the settings-loop exemption restored | `for (const s of ['options', ...SETTINGS_SUBS]) $(s).classList.toggle('hidden', v !== s);` | `if (!npOpen) for (const s of ['options', ...SETTINGS_SUBS]) $(s).classList.toggle('hidden', v !== s);` | `NPPARKS` from a settings screen |

**Three mutants where §14 names two, and the reason is mechanical.** §14's `NATURAL-a` is "restore
the `npOpen` guard on the park and hide block". Post-A1b that block has no enclosing brace to
restore, so a single syntactically-valid site cannot re-guard both statements; `a` and `a'` are that
one mutant split across its two statements. No dimension is added and none is dropped.

**The `if (!npOpen)` prefix form matters and a toggle-argument form does not work.** The obvious
one-line mutant — `toggle('hidden', !npOpen && v !== 'browse')` — was executed and **survives
`NPRECONCILE`**: it does not *skip* the toggle under Now Playing, it actively *un-hides*, so the set
is constant and a growth assertion cannot see it. A faithful restoration must make the statement a
no-op under Now Playing, which the prefix form does.

### Anchors A1b ROTS — one of them is not in the plan's §6a casualty table

§6a lists mutants `#104` (`NPUNTOUCHED`, de-register) and `#106` (`PEERPARK`/`PEERFINALIZE-a`,
re-point). Two more anchors are affected and the first of them rots **unconditionally**:

- **`one-screen-type ONEPAGE`** — its `from` is
  `"      for (const s of ['options', ...SETTINGS_SUBS]) $(s).classList.toggle('hidden', v !== s);\n    }"`.
  The trailing `    }` **is the `:78` guard's closing brace**, which A1b deletes. This anchor rots
  whatever the builder does about indentation, and re-pointing it is part of the A1b commit.
- **`one-screen-type PEERPARK/PEERFINALIZE-b` and `one-screen-type PEERPARK-c`** — both anchor on
  `        if (d.browseWillHide) d.browseWillHide();` at **eight-space** indentation. Their braces
  belong to the inner edge test and survive; only the indentation moves. They rot **if and only if**
  the builder de-indents the block bodies, which is the natural form of the deletion.

`test/mutation-anchors.test.js` catches all of these as ANCHOR NOT FOUND, so the failure mode is a
loud stop rather than a silent hole — but it is a stop §6a does not currently predict, which is the
distinction §6a exists to draw.

---

## 5. What stays device-owed

Not one assertion in this suite touches geometry, stacking, paint order or occlusion, and that is
deliberate rather than a limitation accepted quietly: jsdom has no layout, no paint, no compositing
and no `transitionend`, so a cell asserting that fewer screens are *visible*, that Now Playing
*covers* anything, or that the stack no longer shows through **could not fail** and would be a false
witness (the vacuously-green-harness scar). What the suite proves is the **mechanism** — class state,
call counts, call ordering.

The outcome the user reported — no longer seeing three or more screens through each other mid-swipe
— is **device-owed and is plan step 9's**, together with §15's R-H questions: whether closing Now
Playing back to Books re-decodes the covers, whether the restore flashes, and whether the repeated
half-swipe back from Now Playing makes the list slower or emptier the more times it is repeated.

The step-6f residual is unchanged by this suite: the 125–340ms flick-release band is untested rather
than proven clean, and if the pop-in recurs that band is the first place to look.

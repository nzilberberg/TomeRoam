# LOKI STRIKE — Stage-5 four-key narrowing (commit 0049a13) — 2026-07-26

Commissioned adversary strike on the ratified consumer-parity promise of the
`Swipe.buildConstruction` return narrowing. Blind: no review/audit casebook and no
DecisionLog rationale was read before this record was filed.

## 1. The promise

Verbatim (commission packet; ratified in `Claude/Plans/PLAN-swipe-stage5.md` §3, which pins the
four-key return `{ decorations, movers, capture, sourceWasClobbered }`, the internal consumption of
`classification`, the dropped `plan` wrapper, and the `{kind, base}` projection):

> The four-key narrowing is BEHAVIOR-PRESERVING at the consumer — every runtime effect `start()`
> previously derived from the old return (`plan.decorations` and the dropped/`classification`
> fields) still fires identically from the new four-key shape.

As testable behavior: for every gesture the real `start()` (js/app.js) can run, every observable
effect it derives from the construction return — the outgoing-NP `np-locked` body unlock read off
the decorations, the pill mover, the `d.movers` geometry and parking transforms, the recorded
capture (`ghostY`/`animSync`/`animRes` and their reveal-diagnostic report), and the
`d.clobbered`-driven abort re-render — must be identical when driven against the parent commit
(f6d6985, five-key return, consumer reads `c.plan.decorations`) and against 0049a13 (four-key
return, consumer reads `c.decorations`). A KILL is any effect that fired under the old shape and
does not fire, or fires differently, under the new one.

## 2. The plane chosen and why

The shape contract test (`test/swipe-construction.test.js`) proves which keys exist; it cannot see
whether the consumer's effects still fire. The single weakest seam is the one value that was
TRANSFORMED rather than passed through: `decorations` was hoisted out of the `plan` wrapper AND
re-projected (`plan.decorations.map(({kind, base}) => ({kind, base}))`, js/swipe.js:326) — a fresh,
unfrozen array replacing the deep-frozen original — and its sole consumer is a conditional runtime
effect (`deco.kind === 'now-playing-pill' && deco.base === 'outgoing'` → remove body `np-locked`,
js/app.js:476-477). Every other returned key crossed unchanged. So the strike executes the real
consumer end-to-end on both sides of the commit and compares full effect traces, with the
NP-decoration scenarios as the aimed edge.

## 3. The instrument (reproducible)

Differential parity probe: `probe.js` boots the REAL `js/app.js` of a given tree through that
tree's own `test/app-harness.js` and drives five real touch-gesture scenarios, emitting a JSON
trace of body classes, `np-locked` state, `.np-pill-float` / `.nav-ghost` counts, host
park/hidden state, mover `translateX` transforms, the ordered
`browse.render`/`beginHold`/`endHold`/`scrollTo` effect log, and the SWIPE/FLASH debug lines
(wall-clock floats and durations normalized).

Scenarios: (A) NP-source back-swipe — the migrated decorations loop's unlock; (B) committed
back-out-of-NP then forward swipe to NP — incoming-slot decoration, loop must not fire; (C)
browse→browse abort — `sourceWasClobbered`/`d.clobbered` re-render; (D) back→home abort — capture
recording (`animSync` recorded, `d.ghostY` untouched, via the `@reveal` line); (E) browse→overlay
commit — overlay resolve/render/unhide and mover geometry.

Setup and run (probe and traces retained in the session scratch area, `loki/`):

```
git archive f6d6985 | tar -x -C <scratch>/old     # parent: five-key return, c.plan.decorations
git archive 0049a13 | tar -x -C <scratch>/new     # target: four-key return, c.decorations
mklink /J <scratch>/{old,new}/node_modules <repo>/node_modules
node probe.js <scratch>/new  > new1.json   (run twice; diff → identical: instrument stable)
node probe.js <scratch>/old  > old1.json   (run twice; diff → identical)
diff old1.json new1.json
```

Predictions registered before the run: the promise predicts identical traces; a fracture predicts a
divergence in the np-locked unlock, the pill mover, the clobber re-render, or the capture report.

## 4. The observed result

Non-vacuity: scenario A had `np-locked` present before the swipe, the gesture went live
(`start back nowplaying→home`), and mid-drag the body class was REMOVED with the pill mover built
(`floats=1`, `ghosts=1`) — the migrated loop demonstrably executed. Scenario B built the incoming
pill without a spurious unlock path difference. No scenario errored.

`diff old1.json new1.json`: the traces are identical in every behavioral field. The only
divergence is a stack-frame line number inside the reveal diagnostic's `scrollWrites` capture
(`<anonymous>:1115` old vs `:1117` new, in four `@reveal` lines): 0049a13 added two comment lines
to `js/app.js` above that code, shifting the evaluated source coordinates. The recorded effect
itself (a scroll write at `runFinalize`/`final`) fires identically; any comment-only edit produces
the same shift. Not a behavior fracture.

Sensitivity check (the probe can fail): mutating the new tree's consumer back to
`c.plan.decorations` (undefined under the four-key shape) reddened the probe exactly at the aimed
plane — TypeError at the loop (app.js:476), gesture aborted, `np-locked` NOT removed mid-drag
(`true` vs the real run's `false`), trace diverged. Restoring the line reproduced a byte-identical
trace to `new1.json`.

## 5. Verdict

**HELD STONE.** The four-key narrowing is behavior-preserving at the consumer for every effect the
probe could reach: the decorations-derived unlock, the pill mover, mover geometry and parking, the
capture recording and its diagnostic report, and the clobbered-abort re-render all fire identically
on both sides of 0049a13, under an instrument proven stable across runs and proven able to detect
a fracture at the aimed plane.

Planes struck and held:
- The projection seam (`{kind, role, base}` → `{kind, base}`): the consumer reads only
  `kind`/`base`; values cross intact; the unlock fired identically.
- The wrapper drop (`c.plan.decorations` → `c.decorations`): no other production reader of
  `c.plan`/`c.classification` exists (grep over `js/` — the only remaining match is a comment).
- The unchanged keys (`movers`/`capture`/`sourceWasClobbered`): geometry, capture recording, and
  the abort re-render traces identical.

Residual doubt / where a bigger budget strikes next: jsdom has no layout, so drag geometry
(thresholds, velocity, committed distance) is out of the probe's reach by the harness's own
standing scope note; a device-level pass is the only thing that could still hide a divergence, and
nothing in this change plausibly couples to layout.

Nonblocking residual (not a kill — effect-free today):
- **NB1 — the returned `decorations` lost its immutability.** The old shape handed the consumer
  the deep-frozen `plan.decorations` (frozen at the classification boundary, js/swipe.js:104,
  re-frozen by `constructionPlanFor`, js/swipe.js:143); the new top-level `decorations` is a
  fresh unfrozen array of unfrozen objects. No current consumer mutates it, but a future L3
  mutation that the old shape would have rejected now silently succeeds. If the §3 `Readonly`
  notation is meant to be load-bearing, freezing the projection is a one-line hardening.

## 6. Blast radius

None — the promise held. Nothing standing on the four-key contract (the retired dead-return
gate, the reconciled contract test, the Stage-6 plans that build on the narrowed seam) is
undermined by this strike.

```json
{"persona":"loki","stage":5,"input_artifact":"0049a13","promise_id":"narrowing-consumer-parity","verdict":"HELD_STONE","nonblocking_ids":["NB1-decorations-unfrozen"],"return_to":"none"}
```

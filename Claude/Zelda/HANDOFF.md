# Handoff — Zelda, living document

Written to be picked up **without the conversation that produced it.** Everything here was
reconciled against the repo at the moment of writing, not recalled.

⛔ **This file is UNDATED on purpose.** Its predecessor carried a date in its filename and rotted —
a living document whose name asserts a day is stale the moment the day ends. Same class as a board
line naming HEAD. **Never put a stage status or a commit id here**; derive both.

---

## 1. Derive the state, never read it from here

```
git -C <repo> rev-parse HEAD && git -C <repo> status --porcelain=v1 -b
node --test "test/*.test.js"                          # count, not just pass/fail
node tools/campaign/stage-gate-check.mjs Claude/Campaigns/swipe-navstack.json
```

The **live tactical state is the CURRENT STATE block at the top of `Claude/Zelda/Board.md`**, kept
current every turn. This file holds the traps and standing rulings that outlive any one state.

⚠️ **`node` is NOT on PATH:** `NODE="$(git config --get tomeroam.node)"`.

---

## 2. Two workstreams, and they are coupled

**A — the navstack settle-window slice.** A defect in shipped code: a nav tap during the ~340 ms
settle window empties the stack the committing gesture is about to mutate. Standalone, landing
**before** stage 7. Plan `Claude/Plans/PLAN-swipe-navstack-settle-window.md`, campaign manifest
`Claude/Campaigns/swipe-navstack.json`. Four of its five gates are cleared; the coverage audit is
the last.

**B — swipe/reveal stage 7**, the Browse lease boundary. Plan forged, adversary held stone, U1
closed by execution. **Not started, and it must not start until A lands** — because A shifts the
source ranges stage 7 measured itself against.

⭐⭐ **Stage 7 owes a PER-RANGE re-measure once A lands, never a constant offset.** Measured by the
plan reviewer: its five declared ranges shift by **0, 0, 0, +11, +16**.

⛔ **There is no "phase 1-10".** The spine is `Claude/Plans/PLAN-swipe-reveal.md` §7 at line 736 —
**PLAIN TEXT, not markdown**, which is why markdown-shaped greps never find it. ⚠️ **Two numbering
systems both say "stage"**: the reveal spine, and the de-clone workstream the manifests use. Say
which.

---

## 3. Traps this campaign paid for — do not re-learn these

- ⭐⭐ **Enumerations have been incomplete FIFTEEN times. Every single one was found by EXECUTING or
  MEASURING; not one by a further reading.** That count includes claims by the plan reviewer, the
  adversary, the planner, the builder, and the test author about its own record. **Treat every list,
  including a plan's own and a reviewer's own, as a hypothesis until run.**
- ⛔ **An oracle here proved nothing**: "no `@reveal` report ⇒ it threw" fails, because that line is
  emitted when the observation window CLOSES. **Prove every oracle can FAIL, in the same run.**
- ⛔ **A cleared gate does not stay cleared when the code moves under it.** The manifest cannot see
  this — its code-review gate reads ✅ from the first review no matter how much ships afterwards. A
  delta review inserted for exactly this reason found a Significant defect.
- ⛔ **`tools/source-gate-sweep.mjs` MUTATES `js/app.js`.** Subprocess only; never import.
- ⛔ **Never background `tools/mutation-sweep.mjs`** — interrupted it strands an applied mutant and
  greens the suite *because of* it. Foreground, explicit timeout, targeted indices, then confirm no
  `*.mutbak`.
- ⛔ **Cite mutants by NAME, never index.** The registry has grown past 160 and every insertion
  shifts every later index.
- ⭐ **Read the test COUNT.** A module whose CLI runs at import kills the runner and reports a green
  `# tests 1` for a file holding many.
- ⚠️ **A suite run in a copy OUTSIDE the repo reports 2 failures that are git-only gates**, not
  regressions. Control against an untransformed copy and say so.
- ⭐ **jsdom has no layout or paint.** Assert call order and state, never geometry.
- **A build can be committed and NOT pushed.** One was; an unpushed artifact is invisible to CI and
  to the next session. Check `ahead N` before trusting a seat's "done".

---

## 4. Dispatch discipline that was earned the hard way

- **Sequential only.** One live agent; the fan-out gate enforces it. All seats share ONE checkout —
  what is isolated is the context, not the disk.
- ⛔ **The dispatcher is a tree actor too. Do NOT commit while an agent is live.** The pre-commit
  battery runs the suite over the WORKING tree, not over what is staged, so it tests the agent's
  half-finished state. Hold records edits unstaged; they survive at no cost. Now gated.
- ⛔ **Do not put your own analysis in a brief.** Give the symptom stated observably, the
  specification, environment mechanics, and rules of engagement — and say plainly that you withheld
  your reasoning and why. Also say the plan's and casebooks' rationales are claims to verify, since
  stripping them from the brief while leaving them in files the agent must read achieves nothing.
  Gated by `agent-brief-contamination-gate.sh`.
- **Poirot before Mendeleev, always.** Poirot can send a build back; auditing coverage first throws
  the whole audit away.
- **Name the seats.** Once the user has used a name, keep using names — role words made a fully
  running scheme look absent. Gated.

---

## 5. Standing user rulings

- ⭐ **"You may adapt and learn by building gates. Beyond that use the scheme."** A gate closing a
  failure class just hit is Zelda's to build **directly**; every other craft routes to its seat.
- **Churn is the top concern** — edits have cost up to ten hours. The legitimate lever is *ceremony*
  (fewer gates for a small change; stop re-gating frozen work), **never gate order**.
- **Never announce a dispatch and end the turn.** Make it in the same turn, or say plainly the work
  is blocked and why.
- ⭐⭐ **Decide what is yours.** Routing the scheme's own table settles is not the user's call. If you
  are waiting on the user, the user IS the blocker — say so in the blocker column. Gated.

---

## 6. Open threads not on the critical path

Full rows on the board. In short: three plan-tooling mechanisms owed to the planner (`T-TOOL1/2/3` —
the third has now been struck **four** times and is the reason two review rounds were needed);
`T-S7N`, the wrong-oracle warning the test author must not inherit; `T-S7I`, a generator-versus-
generated blind spot for the coverage auditor once the campaign lands; `T-LP1`, letter pickers,
deferred by the user with symptoms not yet derived — **ask before routing**.

⛔ **Standing priority, unchanged: real-device verification is OUTSTANDING** for the whole `.164`+
arc. `test/DEVICE_VERIFICATION_CROSSDEVICE.md` has never been run. Do not mix new fixes into a
verification session.

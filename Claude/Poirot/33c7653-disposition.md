# Disposition — swipe stage 3 review (`33c7653-swipe-stage3-session-owner.md`)

- **Build:** fixes land in `2026-07-19.226`. Every finding reproduced against the code before acting.
- **Scope ruling:** the maintainer scoped the review — findings 2, 4, 1a, and 5 are fixed now; findings 1 (settle timer), 1b (transitionend listener), and 3 (global-session helpers) stay deferred to stage 6. The rationale is recorded in `../Decisions/DecisionLog.md`.

| # | Disposition |
|---|---|
| 1 (settle timer) | DEFERRED to stage 6 — the timer's cancellation-ownership rides with the finalization centralization stage. |
| 1a (settle rAF) | FIXED — the settle rAF is stored on the session and cancelled at the top of `finalize`. Pulled forward because it is a same-gesture stale write the stage-6 deferral rationale does not cover, with a real user-facing failure mode. Test: `1a — a cancelled settle rAF cannot re-shift the real #browse after finalize`; mutation `r223 1a`. |
| 1b (transitionend listener) | DEFERRED to stage 6, with a correction noted for the next round: this is a per-gesture LEAK, not a supersession issue, so `finishing` never gated it — the "latent until stage 6" framing does not hold for 1b. Flagged, not fixed, per the scope ruling. |
| 2 (finishing throw-wedge) | FIXED — `finishing` restored in the `finally`, THROW-PATH ONLY (an `ok` flag). The literal "add `finishing = false` to the finally" was too broad: it would clear on the normal held-path return and let a gesture arm while the ghost still covers. Test: `2 — a throw in finalize restores finishing…`; mutation `r223 2`. |
| 3 (global cleanup helpers) | DEFERRED to stage 6. |
| 4 (weak held-reveal test) | FIXED — the test now pins intermediate ownership: with `deferRaf`, the owner must be active after finalize while the pane is held, and null only after the paint frames fire `drop()`. Mutation `r223 4` (endOwnership ignoring `revealPending`) is caught. |
| 5 (decorative pill tag) | NOTED in-code — an explicit comment that `owned-decoration` is read by no consumer and the pill is removed via `resetSwipeStyles`; kept so every mover stays typed for stage-6 consolidation. |

Verification: 627 tests (625 pass, 2 known-red todos = the two supersession new-policy items), lint clean, source-gate sweep 5/5, the five endpoint/rAF/throw mutations each caught by the intended test.

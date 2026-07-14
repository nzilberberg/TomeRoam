# 0003 — Resume is most-recent-wins, not most-advanced

**Status:** Accepted

## Context

When several devices (and cold sources) have a position for the same book, the
app must choose which one to resume from. The intuitive choice — the *furthest
forward* position — is wrong for audiobooks: deliberately rewinding to re-hear a
passage would be silently undone the next time another source reported a later
spot.

## Decision

Resume arbitration is **most-recent-wins by timestamp**, never most-advanced. A
rewind is a legitimate, recent user action and must be honored. The pure kernel
`PBLogic.pickResume` picks the newest candidate by `ts` from an ordered list
(cold cache → durable record → this device's own record → live peer), where a
live peer's position is its *extrapolated* position at "now".

## Consequences

- Rewinds and re-listens survive across devices.
- Silent adoption is always on; the user keeps agency through explicit
  play-from-start and per-chapter entry points.
- Freshest-peer chasing happens on **cold open only**, never on the transport
  play button — "resume MY spot here" and "grab the freshest peer" are different
  intents and must not be conflated.
- The tie policy in `pickResume` is deliberately first-wins (least-authoritative
  first) and documented in-code as *not* a bug; the only tie that matters — the
  local playhead is already live — is resolved by an explicit override outside
  the pure function.

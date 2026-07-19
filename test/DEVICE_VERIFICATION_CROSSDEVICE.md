# Cross-device manual verification — the `.164`–`.172` arc

Everything in `.164`–`.172` changed cross-device arbitration, reset semantics, identity
handling, or durability, and **none of it has run on real devices**. 549 unit tests pass,
but every defect in that arc was found by an external reviewer reading code, not by the
suite — so a green suite is not evidence here.

**Run this session on its own. Do not mix fixes in** (external review disposition): you
need a stable baseline and interpretable results. If a test fails, record it and keep
going unless it blocks the rest; fix in a later session.

## Setup

- Two devices, A and B. Note which is which; the arc's bugs were **asymmetric** (they hit
  whichever device had the worse connection).
- Both on web build **`2026-07-18.172`** or later — check Options → the build string.
  A device on an older build invalidates any peer-arbitration result.
- Put **B on a deliberately poor connection** for tests 4–6 (cellular with weak signal, or
  force relay). The original ~10s stale-resume bug only appeared on the degraded side.
- Turn on **Options → Live debug** on both, so the log ring captures the run.

## How to capture evidence — read this before starting

Two instruments, and they answer different questions:

1. **Options → Diagnostics → Copy diagnostics** — the `.163` record-level snapshot. This is
   the one that matters here. Per book it shows: our authored record, the replica copy,
   each peer and shard copy, the reset floor, and **which record WON**, plus
   `DURABLE PROGRESS: SAFE / NOT verified`. Capture it **on both devices** at each
   checkpoint below. Two snapshots taken at the same moment are what prove or disprove
   convergence.
2. **Bug report** (Options) — carries the log ring plus a compact progress verdict. Post one
   whenever something looks wrong, from **both** devices.

Pull reports afterwards from `Desktop\TomeRoam`:

```
TOKEN=$(grep -m1 '^token:' /c/ProgramData/Lyrion/prefs/plugin/plexbooks.prefs | sed "s/^token:[[:space:]]*//" | tr -d " '\"\r")
"C:/Users/nzilb/tools/node-dist/node.exe" tools/tail-log.mjs --reports --token "$TOKEN"
```

**Record the actual observed value, not just pass/fail.** "Landed 3s behind" and "landed
0.2s behind" are different results and only one of them is the bug.

---

### Test 1 — Simultaneous progress on one book

1. Both devices open the same book. Play on A for ~1 min, pause.
2. Play on B for ~1 min, pause.
3. Capture diagnostics on both.

- ✅ Both snapshots name the **same winning record** (`WON: … by=<same id>`).
- ✅ The losing device still lists the other's record as a peer/shard copy — it should be
  visible, not absent.
- ❌ If A says A won and B says B won, that is the convergence failure `.172` was meant to
  fix. Capture both snapshots.

### Test 2 — Equal / regressing timestamps

Hard to force directly; the point is to look for the *symptom* while playing normally.

1. Hand the book back and forth ~6 times in quick succession, pausing each time.
2. After each handoff, check the tile resume time on both.

- ✅ Resume position never goes **backwards** on either device.
- ✅ Diagnostics `books` section: our authored `ts` values are **strictly increasing** down
  the run (this is the `.172` monotonic stamp; a repeat or a decrease means it is not
  working).

### Test 3 — Pause / resume ownership (handoff)

1. Play on A. On B, tap Resume for the same book.
2. Watch A.

- ✅ A pauses (superseded) within a few seconds.
- ✅ B starts within ~1s of where A actually was — not seconds behind.
- ⚠️ **Known, unfixed:** if B fails to take over, that is the `claim` weakness reported in
  the `.169` audit (a bare `now()`, so clock skew can defeat a deliberate grab). Note it and
  move on; it is a known open item, not a new regression.

### Test 4 — The stale-sync bug (THE headline test) — B on the poor connection

This is the original open bug: resume landing ~10s behind on the degraded device.

1. A plays continuously for ~2 min. Do **not** pause it.
2. On B (poor connection), tap Resume on that book.
3. Immediately note B's position and A's live position.

- ✅ B lands within ~1s of A's actual live position.
- ❌ ~10s behind = the bug is still present. Post a bug report from **B** immediately, and
  capture diagnostics from both.
- Also check B's diagnostics `peerBoards` count: if it is 0 while A is plainly playing, B is
  not seeing the peer at all, which is the mechanism `.164`/`.170` addressed.

### Test 5 — Reset, then a stale replica arrives

1. Both devices have progress on the book (play a little on each).
2. Take B **offline**.
3. On A: Reset Progress on that book.
4. Bring B back online; let it poll (~20–30s).

- ✅ The book reads **unplayed on both** devices.
- ✅ B's diagnostics show a `RESET floor` for that book and **no winner**.
- ❌ If the book comes back on either device, capture both snapshots — that is resurrection,
  and the `rst` value versus the surviving record's `ts` tells us which axis failed.

### Test 6 — Reset, then keep playing

1. Immediately after test 5, play the book on A for ~30s.

- ✅ Progress reappears and is normal.
- ✅ Diagnostics: the new record's `ts` is **above** the reset floor. (`.172` makes this
  hold even if the clock regressed; if it fails, the stamp is not persisting.)

### Test 7 — Board recreation

1. On B, delete B's own presence board from Plex (Plex web → Playlists → the hidden
   `pb_dev_*` playlist for B), or force a 404 some other way.
2. Play on B so it republishes and recreates the board.
3. On A, watch B's peer state.

- ✅ A follows B onto the **new** board — B's position keeps updating on A.
- ❌ If A stays on B's old state until it ages out (~90s), the `.170` `rev` is not doing its
  job. Capture A's diagnostics.

### Test 8 — Duplicate historical boards

1. In Plex, duplicate one of A's `pb_prog2_*` shard playlists (same title, copy the summary).
2. Let both devices poll.

- ✅ No resume position flips back and forth between polls on either device.
- ✅ A's log (Live debug) contains a **`DUPLICATE board …`** line — `.171` added it precisely
  so this is visible rather than silent.
- Then delete the duplicate and confirm things settle.

### Test 9 — One device offline and returning

1. Take B offline for ~10 min while playing on A.
2. Bring B back.

- ✅ B converges on A's position; no backwards jump on A.
- ✅ B's diagnostics: `archive: state=verified` once it settles, and `DURABLE PROGRESS: SAFE`.

### Test 10 — Delete a device

1. On A: Options → Devices → Delete B.
2. Confirm on both.

- ✅ B's boards disappear; B's records stop resurfacing on A.
- ✅ A's diagnostics: `pendingDeletes` returns to 0 (it may be non-zero briefly).
- ⚠️ If B is still live it will recreate itself — that is by design (self-healing), not a
  failure.

### Test 11 — Reinstall / new identity

1. On B, remove and reinstall the app (**iOS: this deletes the container — downloads and
   settings go with it**, per the storage notes).
2. Sign in again and play the book.

- ✅ B appears as a **new** device; the old identity shows as a quiet ghost in Options →
  Devices.
- ✅ Adopting the ghost moves its records to the new identity and the ghost disappears.

### Test 12 — Shard split / read-back (optional, only if convenient)

Needs enough books to overflow a shard (~8KB of records). Skip unless the library is
already large enough.

- ✅ Diagnostics `shards:` shows more than one shard and `redirects` ≥ 1.
- ✅ `archive: state=verified`, no `degraded subtree` lines.

---

## Reporting back

For each test: **pass / fail / not run**, the observed numbers, and a bug report from both
devices for anything that failed. What matters most:

- any case where **two devices disagree** on the winning record (test 1);
- test 4's actual gap in seconds — that is the open bug's status;
- any **resurrection** after reset (test 5);
- any `DUPLICATE board` line (test 8) — that means it is happening in the wild.

## After this session

Per the external review disposition, in order:

1. `pb_prog2Keys` identity envelope (full client id, discard legacy bare map).
2. `dev8` collision containment — full payload id everywhere destructive or self-referential;
   do **not** widen the namespace or migrate titles.
3. Downloaded-track mismatch detection, stale state, and a re-download affordance;
   decouple `Banking.isDownloaded()` from "has a download record".
4. Document the residual 32-bit title-namespace collision and why widening was rejected.

# TomeRoam — Durable Progress Storage — Plan (v5)

**This document is self-contained.** It assumes no prior knowledge of the codebase and references no other document. §1 is context; if you know the system, skip to §3.

**Status: APPROVED FOR IMPLEMENTATION.** Three external review rounds; architecture review closed with no remaining blocker. The split protocol (§6, SHARD) carries the highest implementation risk and is the part to read hardest.

**Build order [v5]:** 1. stop the deleting (alone) → 2. compact versioned gzip format + legacy recent head → 3. serialized, read-back-verified writes → 4. crash-safe hash-prefix sharding (heavily tested) → SURFACE alongside → CROSSAPP remains an unbuilt stub.

**v5 changes (2026-07-17, a scope decision by the maintainer — not a review round):** all progress currently in the library is **test data from building the app, not real listening; a fresh start is acceptable.** Therefore:
- **RECOVER's one-time harvest is DROPPED** — no reading of legacy boards or Plex's native copy to rebuild destroyed history. The 14 books' positions stay gone, by choice.
- **The spine now never reads Plex's own copy at all.** §3.5 stays as measured fact; §5's arbitration/detection rules are **CROSSAPP-only material** — inert unless that optional feature is ever built.
- **Kept from RECOVER (moved into SHARD's scope):** the replication invariants — records are immutable, carry `originDeviceId` + original `timestamp`, and any device may republish them **without re-stamping**. This protects *future* real data against dead devices and board pruning, and it is why a reinstall costs identity, not data.
- **The §11 warning about stale-board cleanup no longer applies:** legacy `pb_prog_` boards hold only test data and may be deleted at any time.

**v4 changes** (closing round): the measured ~60s persistence floor is removed from the algorithm entirely — arbitration inspects the state Plex returns, never a threshold (§5); capability detection becomes **positive-only**, so absence never proves the feature is off (§5); library capability and per-track interpretability are separated (§5). Marked **[v4]**.

**v2 changes** (after the first external review): the urgent fix decoupled and moved first; Plex's own copy demoted to explicitly optional; shard key resolved; mixed-version migration, history recovery, serialized writes and tri-state detection added; `bk` publication made no-drop. Marked **[v2]**.

**v3 changes** (after the second review — both were *required* edits):
1. **`viewCount` narrowed to completion evidence** and removed from the position candidate pool; resume sources are now a ranked hierarchy, with a deterministic seconds-vs-milliseconds timestamp rule (§5).
2. **The shard split is specified as a crash-recoverable protocol** where every partial state has exactly one authoritative copy (§6, SHARD).

Also v3: authorship **resolved** via two local stores (§6, RECOVER) — this had been the only question blocking a workstream; the split budget made **injectable** so the rarest path becomes the most-tested one (§8); dual-write lifetime **settled** as indefinite; relay ceiling **downgraded** from blocker; shared-user isolation **scoped** to the cross-app feature only. Marked **[v3]**.

---

## 0. Summary

TomeRoam is a browser-based (PWA) audiobook player that plays from a Plex Media Server. **It has no backend of its own** — no database, no server, nothing but the user's own Plex box. It needs to sync one small fact per book across the user's devices: *where you got to*.

**The bug:** it stores that fact for only your **16 most recent books** and *deletes the rest from local storage, permanently*. Book 17 is forgotten everywhere. On a test account with 30 books played, 14 have already had their positions destroyed.

**The fix, in one line:** stop deleting. Everything else in this plan is either how to publish more of it, or optional gravy.

**[v2] The plan is now explicitly two-tier:**
- **The spine** (STOP-DELETING … SURFACE): keep every position locally, recover what's recoverable, publish it in a compact format across as many shards as needed, never dropping a record.
- **The gravy** (CROSSAPP): Plex turns out to hold its own copy of these positions, which would let TomeRoam resume where a *different* app (e.g. Prologue) left off. **Cross-app resume is the gravy** — optional, additive, last, and it **cannot affect the spine**.

  Note the spine *also* reads Plex's copy, once, inside RECOVER — to recover history the bug already destroyed. That use is not optional. It is the *ongoing dependence* on Plex's copy for resume that is gravy, not the copy itself (§4.4).

---

## 1. Context — the system as it exists

### 1.1 The constraint that shapes everything

TomeRoam has **no server**. It is a static web app plus the user's Plex Media Server. There is nowhere to put application state except Plex, and Plex's API is media-management-oriented — it exposes **no general-purpose per-user key/value store**. (Confirmed independently by the v1 reviewer.)

### 1.2 The workaround: "boards"

A **board** is a hidden Plex playlist whose `summary` text field holds a JSON blob. The app abuses this field as a database.

```
playlist title:   pb_prog_<8-hex-device-id>
playlist summary: {"v":1,"id":"pbpwa-…","name":"iPhone","books":{ … }}
```

- **One board per device. A device writes only its own board.** Plex has no compare-and-swap, so single-writer avoids lost updates entirely.
- **Every device reads every board** (discovered by scanning `/playlists` for a title prefix) and merges **last-write-wins** per book, by server-clock timestamp.
- Offline devices keep recording locally and publish on reconnect. Because the merge is LWW by timestamp, publish *order* is irrelevant.

Two independent board families exist:

| family | prefix | purpose | lifetime |
|---|---|---|---|
| **presence** | `pb_dev_` | *live* state: what is playing now, claim/handoff between devices, auto-pause | pruned ≤3 days |
| **progress** | `pb_prog_` | *durable* history: resume position per book | pruned ≤60 days |

**This plan concerns progress only.** Presence is sub-second live coordination and is out of scope (§11).

### 1.3 The data model

Each device holds `mine` — its own authored records, persisted to `localStorage`:

```js
mine.books[<bookId>] = {
  bk: { t, o, cum, tot, ts },   // BOOK-level: resume track, offset ms, cumulative ms, total ms, timestamp
  tr: { <trackId>: [o, d, ts] } // PER-CHAPTER: offset, duration, timestamp
}
```

`bk` **is the resume point** — track plus offset, with a millisecond timestamp. `tr` adds per-chapter marks in the chapter list; it is cosmetic, and it is expensive (§3.3).

### 1.4 The write transport — the origin of the size limit

Writing a board means writing a playlist's summary, and the only endpoint that persists it takes the payload **in a URL query parameter**:

```
PUT /library/metadata/<ratingKey>?summary.value=<the entire JSON>&summary.locked=1
```

So the store's capacity is bounded by **how long a URL the Plex server will accept** (§3.2). §3.4 shows a request body is not an alternative.

### 1.5 Glossary

| term | meaning |
|---|---|
| **board** | a hidden Plex playlist used as a key/value slot; its `summary` text field holds our JSON |
| **presence board** (`pb_dev_`) | live "what's playing now" state; ephemeral; out of scope |
| **progress board** (`pb_prog_`) | durable resume history; the subject of this plan |
| **`mine`** | a device's own authored progress records, in `localStorage` |
| **`bk`** | a book-level record — the resume point (track + offset + ms timestamp) |
| **`tr`** | a per-chapter map — cosmetic detail, ~18× the cost of a `bk` |
| **`viewOffset`** | Plex's own native playback position for an item, in ms |
| **`viewCount`** | Plex's own play count for an item; `>0` means finished at least once |
| **`lastViewedAt`** | Plex's own last-played time for an item; **unix seconds** |
| **`enableTrackOffsets`** | the Plex **library** setting ("Store track progress") gating whether Plex returns `viewOffset` for music. **Defaults off. Only the server owner can change it.** |
| **ratingKey** | Plex's id for any item (book, track, playlist) |
| **Prologue** | a popular third-party iOS audiobook player for Plex; relevant only because it writes positions to the same Plex server |
| **LWW** | last-write-wins |
| **relay** | Plex's fallback connection route through Plex-operated infrastructure |

---

## 2. The bug

```js
// progress.js:59-64
function trim() {
  const keys = Object.keys(mine.books);
  if (keys.length <= MAX_BOOKS) return;                    // MAX_BOOKS = 16
  keys.map((k) => [k, mine.books[k]._ts || 0]).sort((a, b) => a[1] - b[1])
    .slice(0, keys.length - MAX_BOOKS).forEach(([k]) => delete mine.books[k]);
}
```

`trim()` runs on **every record write** and deletes from **`mine`** — the device's own persisted store, not merely the published summary. Executed against the real module:

```
Device A plays 100 books, oldest first.
  books still in its LOCAL store : 16
  which ones                     : 85…100
  books 1–84 recoverable         : NO — forgotten locally
```

**What the user sees.** Books 1–84 still appear (the "continue listening" list derives from Plex's `lastViewedAt`, which is exposed) — but with **no progress bar, resuming from 0:00**.

**Cost of the 16 it keeps:** 2,134 JSON chars → 3,618 URL chars → **11% of the available transport budget** (§3.2). We destroy 84% of a user's history while using an eighth of the space.

**It is already biting.** A test account with 145 books has played 30; 14 have had their positions deleted.

---

## 3. Measured facts

Measured 2026-07-16 against a live Plex Media Server 1.43.2 (Windows). Methodology is included because the *reasoning* is what should be scrutinised — several plausible instruments in this investigation produced confidently wrong answers.

### 3.1 A warning about one instrument

`navigator.storage.estimate().usage` on iOS/WebKit is **blind to IndexedDB**: 9.6MB reported both before *and* after a 305MB download that demonstrably existed. Recorded so it is not re-trusted for any capacity decision.

### 3.2 The transport limit is on URL length, ~32.7KB

Two payload shapes, staircased and binary-searched:

| shape | largest that round-trips | URL length at failure |
|---|---|---|
| plain ASCII (percent-encodes ~1:1) | ~32,694 chars | ~32,770 |
| JSON (percent-encodes ~1.72×: `{ " : ,` → `%XX`) | ~19,109 chars | ~32,790 |

**The argument, not the number:** the two payloads differ by **13,585 source characters** yet fail **within ~20 characters of each other on the wire**. That convergence identifies a **request-target (URL) cap**, not a field-length cap. Failures are clean HTTP 400s; the prior summary survives.

**Route coverage, and an honest weakness.** local-http, local-https and direct-remote showed an identical cap — which is **nearly tautological**, since all three are the same server process and NAT does not inspect URLs. The one route that could genuinely differ, **relay** (Plex-operated infrastructure), **could not be measured**: its endpoint rotates per lookup and TCP will not connect from inside the server's own network (apparent hairpin). Relay is enabled and is a live fallback.

> **v1 reviewer's argument (unverified, best available):** Plex documents Relay as an end-to-end encrypted tunnel whose connection is *not terminated* on the relay server; if so it cannot parse the request URI and cannot cap it. Plausible. Still needs a device actually on relay.

**This is one data point.** PMS 1.43.2, one OS, one path. It must not become a constant (§4.5).

### 3.3 The format wastes most of the budget — 7.5× available

Measured with **real ratingKeys from a real library**. *(A first attempt using sequential synthetic ids reported 32.9× — wrong by 4×, because sequential data compresses absurdly. The trap of a fixture you invented.)*

| shape | URL chars | vs today |
|---|---|---|
| verbose JSON (today) | 22,033 | 1.0× |
| compact positional arrays `[bookId, trackId, offsetMs, ts]` | 6,681 | 3.3× |
| **compact + gzip + base64url** | **2,948** | **7.5×** |
| compact + deflate-raw + base64url | 2,924 | 7.5× |
| compact + brotli + base64url | 2,568 | 8.6× |

**Why base64url matters most:** its alphabet (`A-Za-z0-9-_`) is entirely URL-safe, so it pays **zero** percent-encoding penalty versus 1.72× for raw JSON. That, more than the compression, is the win.

**[v2] gzip, not deflate-raw.** v1 chose deflate-raw on size alone. The difference is **24 characters (0.8%)**, and gzip carries framing and a CRC32. For a durable blob crossing an undocumented metadata path, integrity detection is worth more than 24 characters. Brotli is rejected: absent from browsers' `CompressionStream`, and only 1.15× better.

**Chapter maps dominate cost.** A 40-chapter `tr` is ~1,600 JSON chars — **one book's chapter detail costs ~18 books' worth of resume points.** Budgets should spend almost everything on `bk` and keep `tr` for a very small recent window.

### 3.4 [v2] A request body is not an alternative — and the failure is silent

Since the query param is the *sole* origin of the size limit, the obvious escape is a request body. It does not exist. Tested with a 600-char payload (a pure mechanism test, far below any cap), each attempt preceded by a reset to a sentinel so a stale read cannot masquerade as success:

| variant | HTTP | read-back |
|---|---|---|
| `PUT …?summary.value=<s>` (today) | 200 | **matches** |
| `PUT` + `x-www-form-urlencoded` body | **400** | rejected |
| `POST` + form body | **404** | wrong method for the path |
| `PUT ?summary.locked=1` + value in body | **200** | **UNCHANGED — body silently ignored** |

⚠️ **The last row is the finding.** Plex returns **200 while doing nothing**. A body-based implementation would report success on every write and lose every one. Only content read-back exposes it. **This is why §6 SURFACE and §8 require verification by read-back, never by status code.**

⇒ The URL cap is unavoidable. Compression (FORMAT) and sharding (SHARD) are **necessary, not optional**.

### 3.5 [v2] Plex's own copy — what it holds, and its hard floor

*Nothing in the spine **depends** on any of this. Two workstreams **use** it: CROSSAPP (cross-app resume — the gravy) and RECOVER (one-time recovery of destroyed history — spine, §4.4). The ~60s floor below is what disqualifies Plex's copy from ever being more than that.*

A per-library setting, `enableTrackOffsets` ("Store track progress"), **defaults off**. With it on, Plex's own positions become readable:

```
virgin track:  before → {}
  /:/timeline?…&time=987654   → HTTP 200      (the app's own existing write path)
  read back +500ms            → {"off":987654}   EXACT round trip
  /:/unscrobble               → {}              (clears it cleanly — no ghost)
```

- **Retroactive.** A 58-track album read `0/58` with the setting off and `2/58` with it on, **nothing replayed**. The setting gates the *API read*, not the recording.
- **The app already writes them** (`/:/timeline` on pause) and **already parses `viewOffset` back** — but nothing consumes it. A code comment asserts the opposite as fact: *"Plex hides audiobook viewOffset over HTTP."* It was a checkbox.
- **Timeline writes require client-identity headers**; without `X-Plex-Client-Identifier` they 400.
- On the test account, **18 books had a native resume point already sitting there**, retroactively, with no code change.

**Freshness — v1's stated blocker, now measured.** The v1 reviewer's objection was that native offsets carry no modification time and so cannot join an LWW selection. **They do:**

| question | measured |
|---|---|
| does `lastViewedAt` appear on a timeline write? | **yes** |
| precision | **unix seconds** (10 digits) — coarser than the board's ms |
| does it advance on a later write? | **yes** — `1784266326 → 1784266330` |
| does it advance on a **backward** seek? | **yes** — rewinds order correctly |
| does `unscrobble` clear it? | **yes**, along with the offset — no ghost clock |

**⚠️ But there is an absolute ~60-second floor.** Plex will not persist *any* offset below ~60s into a track — while still advancing `lastViewedAt`. Measured by binary search on two tracks of very different length:

| track duration | smallest offset that persists | as % of track |
|---|---|---|
| 4,324s | **~61s** | 1.41% |
| 1,427s | **~61s** | 4.27% |

Same seconds, wildly different percentages ⇒ **absolute, not proportional**. *(One data point; §4.5 applies.)*

**What Plex therefore holds per book** — real data from the test account:

```
Carrie (9 tracks)
   1   viewCount 3   offset -        FINISHED (offset cleared)
   2   viewCount 5   offset -        FINISHED
   3   viewCount 0   offset 910191   position: 910s      ← where you are
   4   untouched
```

The **track structure carries the coarse position**; the offset only refines within a track. So "no offset" has four causes, and only one is a problem:

| no offset because… | detectable by | usable? |
|---|---|---|
| never played | nothing set | **yes** — you haven't got there |
| **finished** | `viewCount > 0` | **yes** — you're past it |
| reset | nothing set | yes |
| **played under a minute of it** | `viewCount 0` + `lastViewedAt` set | **NO — uninterpretable** |

**Why the last row is dangerous, not merely imprecise.** Plex cannot distinguish *"I tapped chapter 3 for 20 seconds to check something"* from *"I moved to chapter 3 and stopped 45 seconds in."* Both are exactly `viewCount 0, lastViewedAt set, no offset`. Any rule picking one will resume the other in **the wrong chapter**, not 60 seconds off. This is a state native **cannot represent**, and it is why CROSSAPP is gravy rather than a second primary.

---

## 4. Design principles

1. **This is a public product.** Arbitrary users, libraries, servers, Plex configurations. **No number in this plan may derive from the maintainer's own account.** *(Three v1 errors came from exactly that: "48 books fits", "one shard holds all 145", "un-sharded is unbounded enough" — each a statement about one account presented as a conclusion.)*
2. **[v2] A durable `bk` record is never dropped.** Not locally, and — once sharding exists — not from publication either. A full shard **splits**; it does not truncate. Only the cosmetic `tr` is subject to retention limits. v1's "truncation is acceptable if surfaced" is withdrawn: with shards, truncation is never necessary, so permitting it only invites it.
3. **Not every user can flip the checkbox.** `enableTrackOffsets` is a **library** setting: only the **server owner** can change it, and it defaults off. A shared-library user can *never* enable it. The board path is permanent and first-class.
4. **[v2] Nothing *depends* on Plex's own copy — but the spine may *use* it.** The distinction matters and an earlier draft blurred it:
   - **Ongoing reliance on it for resume is gravy** (CROSSAPP). Its unique value is cross-app: picking up where a *different* app such as Prologue left off. No workstream may be gated on a setting the user might not have, cannot change if they don't own the server, and can revoke at any time.
   - **Opportunistic use of it to recover data is spine** (RECOVER). Plex's copy may hold positions that `trim()` already destroyed. RECOVER works without it and recovers *less* — a real difference, not a rounding error.

   So: never load-bearing, never gating, never overriding a TomeRoam record (§3.5's floor is the proof, not a caution) — but reading it during recovery is squarely in scope.
5. **No number measured once is a constant.** §3.2's ~32.7KB and §3.5's ~60s are each one server, one version, one path. Budgets must be conservative **and adapt on rejection** — and **[v2]** an HTTP 400 must not be assumed to mean "too large": split only when the payload is near the current budget, or when a smaller control write succeeds.
6. **[v2] `localStorage` is not durable.** It survives normal use but not eviction, reinstall, cleared site data — or, on iOS, **removing the home-screen icon, which deletes the entire storage container**. Local retention fixes the deletion bug; it does not make local storage the system of record. The published board is the durable copy.
7. **[v2] Never mark a record synced on HTTP 200.** §3.4 is the proof: Plex returns 200 for a write it discards. Sync state follows a verified content read-back or nothing.

---

## 5. Two stores, one spine

| | TomeRoam board (**the spine**) | Plex's own copy (**cross-app use = gravy; recovery use = spine, §4.4**) |
|---|---|---|
| available to | **everyone** | server owners who enable a setting |
| holds a sub-60s position | **yes, exactly** | **no — structurally cannot** (§3.5) |
| capacity | budget-bound → shards | unbounded |
| clock | ms timestamp | unix **seconds** |
| cross-app resume (Prologue) | no | **yes — its entire value** |
| read for the visible set | one read per shard touched | a few small per-book fetches |

**[v3] Resume-source hierarchy.** v2 had a flat rule and it was too loose. Sources are **ranked**, not pooled:

1. **Live peer / session state** (presence — out of scope here, but it outranks everything below)
2. **Newest interpretable position** — a board record or a native offset, ordered by the timestamp rule below
3. **Board position**, when native for that track is missing or ambiguous
4. **Highest contiguous native completion prefix** — a *weak* fallback only (see below)
5. Start of book

**[v3] `viewCount` is completion evidence, not a position.** v2 said native `viewCount > 0` was "usable — tells you which chapter you're past". That was too broad: completion tells you a chapter *was finished at some point*. It does **not** tell you which chapter is active now, whether the reader later revisited an earlier chapter, whether the next chapter was entered for under a minute, or whether the book was deliberately restarted.

So `viewCount` **never enters the same candidate pool as real `{track, offset, timestamp}` records.** Its only use is establishing a *contiguous completed prefix* when nothing better exists:

```
chapters 1–8 viewed · chapter 9 not viewed · no offset · no board record
   → weak fallback: chapter 9 at 0:00
```

**[v3] A fully viewed book is "finished" — never an inferred position.** An earlier draft excused this edge by claiming "a genuine restart would have produced an offset or a board record." **That is false.** A restart in another app that stops under Plex's ~60s floor produces **neither**: no board record (we weren't playing) and no native offset (below the floor). Our own measurement confirms it — writing `time=50000` yields `lastViewedAt` set and no offset. The ambiguity is **irreducible**, so it must be handled by policy rather than reasoned away:

| situation | behaviour |
|---|---|
| passive resume / Continue Listening, every chapter viewed | **treat as finished — produce no resume candidate** |
| the user explicitly opens or replays it | **chapter 1, position 0** |
| a board record or interpretable native offset exists | use it — that is a higher rank, this fallback never applies |

**Never use "all chapters viewed" to manufacture an active position at the end of the book.** It is completion evidence and nothing else.

**[v3] Timestamp rule — deterministic, and it must be, because the clocks differ in precision.** Native carries **unix seconds**; the board carries **milliseconds**. Both are stamped from the **same clock** — the board uses the Plex server's time (`Plex.serverNow()`), and `lastViewedAt` is server time too — so they are directly comparable once truncated:

```
native.lastViewedAt >  floor(board.ts / 1000)   → native is newer
native.lastViewedAt <= floor(board.ts / 1000)   → board wins
```

**A same-second tie goes to the board**, which has both better time precision and usually better position precision (§3.5's floor).

**[v4] The rule inspects the state Plex returns — never a threshold.** This is the resolution of the last open unknown, and it matters more than it looks:

```
viewOffset present                                → interpretable native position
viewOffset absent + viewCount > 0                 → completion evidence ONLY (rank 4)
viewOffset absent + lastViewedAt + viewCount == 0  → ambiguous; contributes nothing, ever
```

⛔ **Never write `if (offset < 60000)`, or any variant of it.** The measured ~60s floor (§3.5) *explains why the ambiguous state exists*. It must never appear in the algorithm. The state-inspection rule above stays correct whether another Plex version uses 30s, 60s, 90s, a percentage, track-type-specific behaviour, or no floor at all — and **the app must never try to reconstruct an offset Plex did not return.**

That reduces the floor from a load-bearing constant to an empirical diagnostic fact, which is the only safe place for a number measured once on one server.

**And the absolute rule that outranks everything above:**

- the board has a record for the **same track** and native does not → **board wins** (strictly more precise)

**[v4] Detection is tri-state AND positive-only.** A missing offset means any of: setting disabled, request failure, stale cache, propagation delay, a completed track, a permission behaviour — **or a position below whatever persistence threshold this server happens to use.** Since that last cause is indistinguishable from the others, **absence never proves the feature is off:**

| state | reached only by |
|---|---|
| **confirmed-readable** | we observed **at least one returned non-zero `viewOffset`** after a known playback write |
| **confirmed-unreadable** | **only** a privileged library-settings response explicitly reporting `enableTrackOffsets = false` |
| **unknown** | **every** other absence or inconclusive result |

v3 said to infer from "a track comfortably above any plausible floor". That still smuggled a threshold in as a margin — a guess wearing a disguise. **Positive-only removes the guess entirely**, and with it the false "feature disabled" verdict on a server whose threshold differs from the one we measured.

- Network or permission errors → **`unknown`**.
- Keyed by **Plex server + library section**.
- For shared-library users who cannot read the setting, the state may remain **`unknown` indefinitely. That is fine** — the board path is authoritative regardless, and native contributes only when it supplies usable evidence.
- **A deliberate probe write is rejected** — it would scribble a play into the user's Plex history and risk clearing a real position if cleanup failed.

**[v4] Two different questions — do not let one answer the other.**

1. *Is native-offset reading supported for this library?* → the capability state above
2. *Does **this track** currently carry an interpretable native position?* → the state-inspection rule above

A library can be **confirmed-readable** while a specific track is still `lastViewedAt` present + `viewOffset` absent. **That track remains ambiguous and contributes nothing.** Library capability must never promote an individual ambiguous record into a usable one.

**[v2] Messaging need not know who you are.** *"Native track progress is unavailable for this library. The Plex server owner can enable 'Store track progress'."* — accurate for owners and shared users alike, which removes v1's requirement to establish ownership before prompting.

---

## 6. The plan

**[v2] STOP-DELETING ships alone, first, and depends on nothing.**

### STOP-DELETING — Stop the local deletion *(emergency; no dependencies)*

v1 claimed this could not ship without the publisher fix. **That was wrong, and it contradicted this plan's own §4.2.** The publication cap does not need to move at all:

```js
saveMine(mine);                                        // persist the COMPLETE local history
writeBoard(makeLegacyProjection(mine, MAX_BOOKS));     // publish a bounded CLONE, today's exact behaviour
```

`trim()` never runs against `mine` again; any temporary limit runs against a cloned publication snapshot. That yields: no further local destruction · unchanged board size · unchanged transport risk · **no dependency on compression, sharding, or Plex settings**. It is a clean emergency build.

Retain `tr` for a small recent window only (§3.3: one `tr` ≈ 18 `bk`s).

### RECOVER — Recover history already deleted **[v5: the one-time harvest below is DROPPED — all existing progress is test data, fresh start accepted. The two-store model and the replication invariants (immutable records, original timestamp + origin, republish without re-stamping) SURVIVE and move into SHARD's scope: they protect future real data against dead devices and board pruning.]**

Stopping future deletion does not restore what is gone. Because the 16-book cap is **per board**, a user's *old device boards may hold the only surviving copies* — one test account has **11 progress boards**. Plex's copy may hold others.

1. Read every legacy progress board. 2. Merge by the existing timestamp rules. 3. Read native offsets where available. 4. Build the recovered history. 5. Write the new shards. 6. **Read every shard back and verify contents.** 7. Only then consider legacy cleanup.

**[v3] Authorship — resolved: two local stores, and `mine` is not redefined.**

| store | contents |
|---|---|
| **`authored`** | records created by playback **on this device**. This is today's `mine`, meaning unchanged. |
| **`replica`** | the locally persisted **merged durable view** — including records recovered from old boards, from Plex's copy, and from dead devices. |

Recovered records keep their provenance and are **immutable**:

```js
{ bookId, trackId, offset, timestamp, originDeviceId }
```

Any device may **republish** them without becoming their author, because a republished record is immutable and retains its **original timestamp and origin**. If the user later plays that book here, playback produces a genuinely *new* authored record with a newer timestamp, which wins on merge exactly as it should.

This buys: honest provenance · recovery from dead devices · idempotent replication · **no need to elect one permanent recovery device** · duplicates that merge harmlessly under last-write-wins.

**Tombstones get identical treatment:** immutable, timestamped, replicable, and **retained indefinitely** unless a provably safe garbage-collection protocol is ever developed.

**[v3] Republishing must not touch the timestamp or the origin.** This is the invariant the whole scheme rests on: if replication re-stamped a record, an *old* record would look newly authored and would **incorrectly win** the merge — silently overwriting a genuinely newer position with a stale one. Recovered records are copied byte-for-byte, original `timestamp` and `originDeviceId` intact.

*Consequence worth naming:* if several devices each republish the same recovered records, those records exist on several boards — storage and read amplification, not a correctness problem. Acceptable here because device counts are ordinarily small, records are compact, copies are immutable and carry their origin, duplicates merge harmlessly, and no election or ownership-transfer protocol is needed. **Make it visible in diagnostics** (unique records vs stored replicas) so it stays a known cost rather than a mystery.

### FORMAT — New publication format

Compact positional arrays + **gzip** + base64url (§3.3). Version-prefix (`TR2.<base64url(gzip(payload))>`). Feature-detect **both** compression and decompression; fall back to compact uncompressed base64url rather than losing sync. Size checks measure the **full request-target byte length**, never source JSON length. An undecodable payload **must not be interpreted as empty and republished** — that would launder corruption into data loss.

### SHARD — Shard the board *(extendible hashing + a recent head)*

**[v2] Resolved — this was v1's biggest open question.** Not `hash(bookId) % N`: a changing global `N` reshuffles every book, and hashing scatters the recently-played set across every shard, which is precisely what the UI reads constantly.

**Authoritative archive — stable hash-prefix shards.** Start with one. When it exceeds budget, split by prefix (`* → 0, 1`); if `1` later overflows, `1 → 10, 11`. Only the overflowing shard splits; books elsewhere never move. Playlist titles encode the prefix, and **the discovered shard names are the routing table** — no count negotiation, and the existing prefix scan already finds them.

**Read cache — the recent head, SPECIFIED [v5]: exactly today's legacy board — 16 books (LRU by touch), size-bounded at 7,000 JSON chars, chapter maps shed first.** That is the only size compatible with "old clients see zero change" (OLD-APPS), which is the head's other job; it doubles as this read cache for free.

**[v5] Read protocol RESOLVED: eager merge at poll cadence, not per-book lazy fetch.** An earlier draft said "an older or arbitrary book fetches its computed shard on demand" while OLD-APPS said "merge both" — contradictory. The deciding fact: boards ride the `/playlists` listing the app already polls, and a device's full history is few shards (5,000 books ≈ ~13 shards of 8KB), so eager merge is approximately one request, not N. The head still provides first-paint locality via the cached-peer-boards mechanism. Per-book lazy fetching is a deferred optimization whose trigger is observed per-board fetch cost (e.g. if playlist summaries stop riding the listing inline), not an assumption.

**Measured 2026-07-17 (PMS 1.43.2, local):** the `/playlists` listing returns summaries inline for 368/369 boards, and a **12,012-char summary rode the listing byte-identical** to a direct per-playlist read (written to a stale test board, verified, restored). No truncation observed ⇒ eager merge ≈ one request. *(One server, one version — §4.5 applies; the reader additionally refetches a board individually before declaring it corrupt, so a truncating/stale listing degrades to N+1 fetches, never to data loss.)*

### [v3] Split authority protocol — required before implementing this workstream

v2 said "discovered titles are the routing table" and stopped there. **That does not resolve partial states**, and playlist creation, summary writes and deletion are not atomic. A reader mid-split may observe: only the parent · parent + one child · parent + both children · both children after the parent is gone · a stale parent that failed to delete · one valid child and one corrupt child.

*(Two of those — "parent gone" and "stale parent" — are eliminated **by construction** once redirects are permanent and never deleted. The harness still covers them defensively, since neither our own older builds nor a user meddling in Plex are bound by this protocol.)*

**Every partial state must have exactly one unambiguous authoritative copy.** The parent's own payload is the commit point — a single summary write either lands or does not, so replacing it is the atomic switch:

**[v3] A shared `splitId` binds the children to one transaction.** A prefix splits **at most once** (`1` → `10`, `11`; any later split happens to a *child*), so no ordering counter is needed. What *is* needed is proof that both children belong to the split the parent committed:

```js
// child 10                      // child 11                      // parent 1 — written LAST, the commit
{ v: 2,                          { v: 2,                          { v: 2,
  prefix:  "10",                   prefix:  "11",                   redirect: ["10", "11"],
  parent:  "1",                    parent:  "1",                    splitId:  "f43a…" }
  splitId: "f43a…",                splitId: "f43a…",
  records: [...] }                 records: [...] }
```

**Why this is not optional.** Without a transaction id:

1. attempt A writes child `10`, then crashes
2. more records accumulate on the still-authoritative parent `1`
3. attempt B computes fresh children
4. an implementation can pair **A's stale `10`** with **B's new `11`** — silently losing every record added at step 2

A shared `splitId` makes that pairing invalid by construction. **Random, not monotonic** — a random id needs no separately durable counter. If per-shard revision numbers are ever wanted for cache invalidation or diagnostics, that is a *separate* field (`rev`) and a separate concept.

**The protocol:**

1. **Parent stays authoritative.** Nothing below changes that until step 8.
2. Mint a fresh `splitId`; compute both child payloads.
3. Write child `0`.
4. **Read it back and verify exact decoded contents** — not the status code (§3.4: Plex returns 200 for writes it discards).
5. Write child `1`.
6. Read back and verify.
7. Replace the **parent's** payload with the redirect carrying the same `splitId`.
8. Read the redirect back and verify. **This is the commit.**
9. Children are now authoritative.
10. **Keep the redirect permanently** (see below).

**Reader rules become deterministic.** Follow a redirect **only** when *all four* hold: both children exist · both decode and validate · both name the expected `parent` · both carry the redirect's `splitId`.

| parent contains | authoritative |
|---|---|
| records | **the parent** — ignore any incomplete children |
| a redirect, all four checks pass | **the children** |
| a redirect, any check fails | **nobody** — report degraded sync, retain cached data, **never read it as an empty shard** |

**[v3] Redirects are permanent — do not delete them.** An earlier draft said deleting a committed redirect was safe because longest-prefix routing still finds the children. That is true and beside the point: the redirect is not a routing aid, it is **the durable commit record**. It is the proof that both children replaced the parent, the binding of those children to one transaction, and a fence against stale code resurrecting the parent as a data shard. Without it, seeing `10` and `11` does not prove they are a committed pair rather than the debris of an interrupted operation. The ~`2N−1` playlist count is negligible at any realistic scale; if it ever isn't, the answer is a designed manifest/compaction protocol — **not deleting commit records because routing happens to still work.**

**[v3] Interrupted splits restart from the parent.** Stated explicitly because every ambiguous state must have one interpretation:

- until the parent redirect is verified, **the parent's data is authoritative**
- partial children are **disposable preparation state**, never data
- after a crash, **recompute both children from the authoritative parent** and overwrite/verify both under a **new `splitId`**
- **never merge partial children back into the parent**
- after the redirect commits, later writes route to children
- a write queued during the split is applied **after commit**, to the correct child

**Crash safety then falls out of the ordering:** crash before step 7 and the parent still holds records, so half-written children are ignored and the split retries cleanly under a new id. Crash after step 8 and the children are live. There is no window in which a reader sees an authoritative empty shard.

**[v2] Serialized writes, per shard.** Single-writer prevents cross-*device* conflict but not a device overwriting *itself*: snapshot A begins compressing, B is created and writes first, A lands last and clobbers it. Compression and sharding add exactly the async steps that make this reachable, and it is this codebase's oldest recurring bug class. Therefore: at most one write in flight per shard · later state replaces queued earlier state · write the newest pending snapshot on completion · **verify by read-back** · never mark synced on 200 (§4.7).

### OLD-APPS — Mixed-version migration *(bidirectional)*

**[v2] New.** Compatibility is asymmetric: a new client reads old boards, but **an old client cannot read a compressed shard**. If an upgraded device stops writing its legacy board, an older installation stops seeing that device's progress.

So new clients **dual-write**: the legacy `pb_prog_<device>` board as a small recent head (verbose, book-level only), plus authoritative shards under a new prefix (`pb_prog2_`). New clients merge both. Old clients keep receiving recent progress. The legacy head doubles as SHARD's read cache.

There is no reliable point at which every old device has upgraded, so this likely persists indefinitely — acceptable because the head is small.

### SURFACE — Surface unsynced records *(never silently omit a `bk`)*

**[v2] Rewritten.** v1 said "surface truncation." With SHARD, records are never truncated — a full shard splits. If a split or write **fails**, records stay locally queued as unsynced, and the UI surfaces **degraded synchronisation**, not intentional omission. Stronger invariant, and far easier to test.

**Tombstones:** LWW storage needs timestamped deletion/reset records. Removing a key lets an older copy — from another device or a legacy shard — resurrect. Any reset must publish a tombstone, not a deletion.

### CROSSAPP — Cross-app resume via Plex's own copy *(gravy; optional, last)*

Add native as an additional *ongoing* resume candidate under §5's arbitration rule. **Never gates anything above.** Its unique value is **cross-app**: a position set in Prologue becomes visible in TomeRoam. That — and only that — is the gravy.

*(Native's other use, reading Plex's copy to recover history `trim()` destroyed, is **not** here: it is a one-time step inside RECOVER, and it is spine. See §4.4.)*

**[v2] Keep publishing full `bk` boards even when native is available.** v1 asked whether box-on devices should stop. They should not: the board code must exist for shared-library users regardless, so not writing it deletes no architecture — it only opens the dead-device hole (a device sold or wiped never republishes, and every book only it played is lost). §3.5's floor adds an independent reason: **native structurally cannot hold a sub-60s position**, so the board is the only home for those. The ongoing cost is small — `bk` only, compressed, coalesced, and not read during normal playback while native is healthy.

**User-facing blast radius of the 60s floor** — the whole of it:

| you | what happens |
|---|---|
| never use another Plex app | **nothing. ever.** |
| use Prologue, stop >1 min into a chapter, open TomeRoam | exact resume |
| use Prologue, stop <1 min into a chapter, open TomeRoam | that chapter restarts — lose ≤60s |
| use Prologue, jump to a chapter, listen <1 min, stop, open TomeRoam | may resume the **previous** chapter — wrong place; self-corrects after a minute of listening |

**Order:** STOP-DELETING → RECOVER **[v5: dropped]** → FORMAT/SHARD/OLD-APPS → SURFACE alongside → CROSSAPP last → legacy cleanup only after verified migration.

---

## 7. Open questions

### 7.1 [v3] RESOLVED — authorship
Two local stores (`authored` / `replica`), immutable recovered records carrying `originDeviceId`, republishable by anyone without transferring authorship. `mine` is not redefined. Specified in the RECOVER workstream above. **No longer blocks anything.**

### 7.2 [v3] DOWNGRADED — relay's real ceiling
Still unmeasured, and still unmeasurable from the server's own network (§3.2). **No longer a blocker:** conservative request sizing, adaptive reduction on rejection, and read-back verification together make the exact ceiling operationally unimportant. The tunnel argument (end-to-end encrypted, not terminated, therefore cannot parse the URI) remains plausible and unverified.

### 7.3 [v3] SCOPED — per-user isolation of native offsets
Tested only with an owner token; Plex user state *should* be per-account on a shared library, unproven. **Gates the cross-app feature only.** Until verified with two accounts against one library, **native offsets must not override board records for shared-library users.** Board sync is unaffected either way.

### 7.4 [v3] SETTLED — dual-write lifetime
**Indefinite is the correct default.** There is no safe automatic retirement trigger: a legacy client can be offline for years and return, and absence of recent activity does not prove absence. The legacy head is deliberately small and earns its keep as the read cache for new clients anyway. Any alternative must be an **explicit compromise**, not dressed as safe retirement:
- a manual "drop compatibility with old TomeRoam versions" option, or
- pausing legacy writes after long inactivity, resuming when an old client is detected.

---

## 8. Test strategy

**Both paths are trivially exercisable — the setting is a checkbox.** An earlier draft claimed the board path would "rot" once the maintainer enabled native. Wrong: unchecking restores it in one click, on the real device, against the real server.

**[v3] Scale WAS the axis with no natural exerciser — and the fix is not "more tests", it is making the rare path ordinary.**

The danger was never that splitting is hard; it is that a shard holds several hundred books (~20 compressed chars each), which is thousands of listening hours, so **the split fires perhaps once every few years per user.** Code that rare is broken by the time anyone reaches it, and no harness of hand-written mocks around a production-only branch will save it.

**So make the budget injectable rather than constant:**

```js
createShardStore({ maxRequestBytes: 350 });   // tests
createShardStore({ maxRequestBytes: 8_000 }); // production
```

At a 350-byte budget, **ordinary fixtures split repeatedly** — recursively, on every run. The *same production code* then runs at 8–12KB in the field. The rarest path in the system becomes the most exercised one in the suite, and no special mock exists to drift out of sync with reality.

This is the single most valuable idea from the v2 review and it retires the risk this plan previously called its worst.

This project has already paid twice for tests that could not fail: a hand-built DOM fixture encoded the author's *wrong* model, went green, and shipped the bug; and a fix was **inert in production** while its test passed, because it stubbed a failure the real dependency cannot produce. §3.4 is a live third instance waiting to happen — a write that returns 200 and discards the data.

**[v3] Every partial state of a split must be reachable in the harness**, since each one is a state a real reader can observe:

- repeated **recursive** splits
- failure writing **either** child
- **HTTP 200 with a wrong read-back** (§3.4 — the real failure mode, not a hypothetical)
- **crash before** the redirect commit → parent still authoritative, split retries
- **crash after** the redirect commit → children authoritative
- **stale parent** that could not be deleted
- **corrupt child** → degraded sync, never "empty shard"
- a **newer write arriving during** a split → queued, applied to the correct child after commit
- a **tombstone during** a split
- reopening and recovering from **every** intermediate state
- **no `bk` ever lost or resurrected**

**[v3] Property-based tests alongside the examples.** Generate hundreds of record updates, rewinds, deletions and simulated failures; assert the final merged state matches a simple in-memory reference model. Example-based tests only find the states we thought of, and this plan's history is a list of states we didn't.

Also:
- **Serialization test**: interleave two snapshots so the older completes last; assert it cannot clobber the newer.
- **Round-trip against the real transport**, asserting on **content read back, never status** (§3.4).
- Compression grounded in **real ratingKeys**, never sequential fixtures (§3.3 — a sequential fixture overstated compression 4× during this investigation).
- **Manual toggle of the Plex setting** covers path selection; no harness needed for it.
- Divergence guard if budget/shard constants live in more than one place.

---

## 9. Relationship to other work *(summarised — no external reading required)*

A separate, approved-but-unbuilt plan covers scaling the app's **Browse** screens for very large libraries: virtualising list rows so only a visible window is materialised, budgeting the background metadata warmer, bounding the cover-image cache, and detecting silent truncation of over-large library listings. It is a **sibling, not a parent** — that plan is rendering and metadata; this one is where positions live. Three couplings:

1. **The read shapes match.** It materialises a bounded window of visible rows; fetching per-book data *for that same window* is the identical shape and bound. They compose at no cost.
2. **Neither alone makes the app work at extreme size.** That plan bounds DOM rows but explicitly **not** the metadata arrays — the app still fetches and sorts the whole library, and the home screen derives from the full result. Fixing that needs ranged fetching plus a home redesign, deferred there. **Browse therefore falls over at extreme size before progress storage does.** This plan must be unbounded *by construction*, but building deep shard machinery ahead of that work is scaling the wrong layer first.
3. **A shared rule:** a >20k-item library currently drops items **with no signal**; killing silent truncation is one of its workstreams. SURFACE is the same rule here.

A third plan covers replacing the WebView audio element with native playback. Unrelated — playback, not storage.

---

## 10. v1 review disposition

The v1 reviewer was **not aware of `enableTrackOffsets`**. Their transport analysis was correct; their native conclusion was not, through no fault of theirs.

| Their position | Disposition |
|---|---|
| **STOP-DELETING is not coupled to RECOVER; ship it first** | **Accepted — the single best catch.** v1 welded them together while its own §4.2 drew exactly the distinction that decouples them. Now §6 STOP-DELETING. |
| **Native has no freshness model** | **Half-superseded (§3.5).** `lastViewedAt` *is* a working clock — seconds precision, advances on every write including rewinds. But the real defect is worse: an absolute ~60s floor makes sub-60s states **uninterpretable**, so native can strand you in the wrong chapter. Their conclusion (use native only when it adds information) stands, for a different reason. |
| Migration handles new readers, not old | **Accepted** — now OLD-APPS dual-write; the legacy head also solves read locality. |
| Never drop durable `bk`; rewrite SURFACE | **Accepted** — §4.2 and SURFACE rewritten. |
| Extendible hash-prefix shards + recent head | **Accepted** — resolves v1's §7.1. Better than either option v1 posed. |
| Keep publishing boards when native is enabled | **Accepted** — resolves v1's §7.2. Their counter to "native buys nothing structural" is correct: the board code exists regardless. §3.5's floor adds an independent reason. |
| Explicit recovery migration + `mine` authorship | **Accepted** — now RECOVER; the semantic question is §7.1. |
| gzip over deflate-raw for CRC | **Accepted** — 24 chars is not worth losing integrity detection. |
| Serialize same-device writes | **Accepted** — now in SHARD. Independently rediscovered this codebase's oldest bug class. |
| Tri-state detection; owner-agnostic messaging | **Accepted** — §5. The messaging point removes v1's ownership requirement. |
| Tombstones, atomic migration, corruption handling, request-target byte length, adaptive 400, `localStorage` durability | **All accepted** — §4.5, §4.6, §4.7, FORMAT, SURFACE. |
| No general-purpose key/value store on PMS | **Accepted.** Independently, §3.4 now proves a request body is not an escape either. |
| Don't abuse posters/labels/ratings as storage | **Accepted.** |
| Treat ~32KB as observed, not guaranteed | **Accepted** — §4.5. |
| Relay unlikely to cap URLs (E2E tunnel) | **Accepted as plausible, unverified** (§7.2). |

---

## 11. Non-goals

- **Presence is untouched.** Live position, claim, handoff and auto-pause are sub-second coordination on their own boards; `/:/timeline` is periodic and cannot replace them.
- **Stale board cleanup is blocked on STOP-DELETING and RECOVER.** **[v5: NO LONGER APPLIES — the legacy boards hold only test data and may be deleted at any time.]** ⚠️ ~~Because the 16-book cap is **per board**, old device boards are accidentally archiving history that `trim()` deleted locally. Deleting them before recovery would destroy the only surviving copies.~~ Any "forget this device" feature still benefits from waiting for replication (it makes Delete non-destructive by construction).
- **Raising `MAX_BOOKS` is not a fix.** A bigger cap is the same bug with a bigger number.

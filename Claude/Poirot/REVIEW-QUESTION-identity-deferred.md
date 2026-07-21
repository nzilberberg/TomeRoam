# Three identity findings from the `.171` audit — deferred, seeking advice

Context: `.171` audited every identifier used as a key, for equality, or for ordering,
asking what produces it, what recreates/reuses/re-derives it, and what breaks if two
things share one. Four defects were fixed and shipped. **These three were verified but
deliberately not fixed**, because in each case the cost or risk of the fix is not
obviously smaller than the exposure, and that trade is a judgement call rather than a
technical one.

Every claim below was traced in the current tree (`.172`) and cites real lines. None is
speculative. What I want is advice on **whether and in what order to fix them** — and,
for (1), whether my probability reasoning is the right basis for deferring a defect
whose blast radius is severe.

---

## 1. `dev8` — a 32-bit identity used both as a shard-set key and as proof-of-self

### What it is

`js/plex.js:26` mints the client id as `'pbpwa-' + crypto.randomUUID()`.
`js/progress.js:100-101` derives the shard-set id from it:

```js
const myDev8 = (Plex.getClientId() || 'dev').replace(/[^a-z0-9]/gi, '').slice(-8).toLowerCase();
```

That is the **last 8 hex characters of the UUID — 32 bits**. It becomes the board title
namespace (`pb_prog2_<dev8>_p<prefix>`) and the per-device key in the shard inventory.

A fresh client id is minted on every reinstall/wipe, so the population that could collide
grows over the library's lifetime, not the household's.

### The three consequences, in increasing severity

**(a) Title namespace collapse.** Two devices sharing a `dev8` write the *same* playlists.
`classify()` (`js/shardstore.js:120`) validates `p.dev` against the title's dev8 — both
pass. The full client id **is** in every payload (`js/shardstore.js:100`, `p.id = clientId`)
but is never compared on the write path, so `loadMine()` adopts the other device's board as
its own tree node and `ensureLeaf` overwrites it.

**(b) A misattributed error code.** If the other device writes between our `writeSummary`
and our read-back, our content comparison fails and we report `verify-mismatch` — "write
discarded by server". That is a false statement about Plex, and `verify-mismatch` is the
one code that triggers a size-related response. Support would chase a Plex bug that isn't
there.

**(c) The colliding device becomes invisible and undeletable, and Delete destroys both.**
`js/progress.js:728` treats dev8 equality as proof of self:

```js
if (dev8 === myDev8) continue;   // in devices()
```

so the other physical device's entire shard set is skipped as "ours" and can never be
listed, adopted, or deleted. Worse, on a *third* device the inventory merges both devices'
boards under one dev8 entry and takes the client id from whichever board the listing
returned first — so `deleteDevice` publishes a purge tombstone for **one** identity while
`removeDeviceBoards` destroys **both** devices' boards. The unpurged device's history is
destroyed with no tombstone to make the deletion stick, and will be re-published from
replicas.

### What is already safe

Records themselves survive a collision: they are attributed by `bk.origin` (the full client
id), not by dev8 — `groupByOrigin` (`js/progress.js:207`) and `adoptIdentity`'s
`src.id !== desc.id` filter are all origin-keyed. The damage is to **writes, device
identity, and deletion**, not to the merge.

There is exactly one collision check in the codebase, on a different axis: `devices()`
associates a pre-`.123` shard set to a client id only on an unambiguous match, leaving it
`unresolved` otherwise (`js/progress.js:~735`). The right instinct, applied in one place.

### Why I deferred it

Probability. 32 bits, with a realistic population of well under 100 identities ever for one
household (devices × reinstalls). Birthday collision probability is on the order of 1e-6.
The cheap fixes touch the shard **write** path — the one subsystem that took nine review
rounds to stabilise — and this session has repeatedly demonstrated that my fixes introduce
the next defect.

### Options, cheapest first

1. **Stop treating dev8 as proof of self.** In `devices()`, skip only when the full client
   id matches, or when dev8 matches *and* the payload's `p.id` matches. Read-path only,
   no write-path risk. Closes (c)'s invisibility half.
2. **Compare `p.id` in `loadMine()`** before adopting a board as ours. Closes (a) and (b).
   This *is* the write path.
3. **Widen dev8** (e.g. 12 chars). Changes every board title — a migration, and old sets
   would need to be adopted or abandoned. Almost certainly not worth it.
4. **Do nothing, document it.** Current state.

**My question:** is (1) worth doing on its own as pure insurance, or does a defect this
improbable not deserve any code change? And is my probability argument even the right frame
for a failure whose worst case is silent destruction of another device's history?

---

## 2. `pb_prog2Keys` — a ratingKey hint map with no device qualifier

`js/progress.js:117-120` round-trips a bare `{prefix: ratingKey}` object. Nothing records
which `dev8` those keys belong to. `loadMine()` injects any prefix the listing did not
produce (`js/shardstore.js:~205`):

```js
for (const prefix in hints) {
  if (!t.has(prefix)) t.set(prefix, { rk: hints[prefix], kind: 'data', meta: null, corrupt: true });
}
```

**Failure:** if the client id is lost while this map survives — a *partial* storage loss —
`myDev8` changes, `parseTitle` matches zero boards for the new dev, the tree is empty, and
every stale hint is loaded wholesale. We then write the **new** dev's payload into the
**old** dev8's playlist (title unchanged, because `rk` exists so no create happens). The
result is a board whose title says `dev=old` and whose payload says `dev=new`, which
`classify()` rejects as `payload/title mismatch` for **every reader including ourselves**.
On our side `loadMine`'s catch marks it corrupt and `ensureLeaf` rewrites the same
mismatched payload — **it does not self-heal**. On other devices it is a permanent
degraded root: that device's entire archive is unreadable, forever, while its own
`syncState()` reports `verified` because its writes pass read-back.

**Reachability is the caveat.** A full origin wipe takes the hint map with it (clean).
`signOut()` clears token/server/connKind/section but not the client id (clean). It needs a
partial loss with the client id on the losing side. I could not construct that from the
code; it is a real hazard with an unproven trigger.

**Contrast:** `LS.board` is the same pattern but *is* guarded — `makeBoard.publish` clears
the saved key on 404, and a legacy payload carries `id` with no title/payload cross-check,
so a stale rk self-heals. The shard hint has a 404 path too, but it never fires here,
because the board is not gone — it is someone else's.

**Fix:** store `{dev, keys}` and drop the hints when `dev !== myDev8`. Two lines plus a
migration that treats the old bare-map shape as "no hints". Low risk.

**My question:** does the unproven trigger justify deferring a two-line fix whose failure
mode is a permanently unreadable archive that reports itself healthy? My instinct is that
this one is cheap enough to just do.

---

## 3. A Plex `ratingKey` change orphans a download

The download index is keyed by **book**, its contents by **track ratingKey**
(`js/downloads.js:428`), and nothing revalidates those keys against the server.

- Startup reconciliation (`js/downloads.js:603`) checks **blob presence only**:
  `trackList.filter((tr) => !audioSet.has(tr))`. The blobs are keyed by the *old* rks and
  are all present, so the record survives and `dlTracks` is repopulated with stale keys.
- Playback resolves from the **fresh** list: `js/app.js:1080`
  `Downloads.trackLocal(t.ratingKey)` with the new rk → false → falls through to the stream.
- Banking is simultaneously disabled: `js/banking.js:183`
  `if (Downloads.isDownloaded(ctx.book)) return;` — `isDownloaded` is book-keyed and still
  true.

**User-visible:** after a Plex re-scan reassigns ratingKeys (path change, agent change,
delete-and-re-add), the tile and Downloads screen still read "Downloaded", the bytes still
count against the storage cap, and the orphan sweep will not reclaim them because the index
still references them. On a plane the user taps the book and gets nothing — with no prefetch
fallback, because banking early-returned. Remedy is Remove download + re-download.

**Note the asymmetry:** Plex does not reuse ratingKeys, so the realistic break is *one file,
two keys* — a silent miss — not *two files, one key* — wrong bytes served. That makes this
an availability and storage-accounting bug, not a correctness/wrong-audio bug.

**Why I deferred it:** the fix is a design decision, not a one-liner. Options:

1. **Opportunistic revalidation.** When a downloaded book's track list is fetched anyway,
   compare the fresh rks to the stored set; if they diverge, mark the download stale (badge
   + a "re-download" affordance). No extra network, but it only fires when the book is
   opened.
2. **Startup cross-check.** Costs network at launch and breaks the deliberately offline-safe
   reconciliation path.
3. **Key the blobs by something stable** (e.g. `partKey` or a content hash). Correct in
   principle, a migration for every existing download in practice.
4. **Detect and report only** — surface it in the diagnostics export so a confused user's
   report explains itself, and let them re-download.

**My question:** how likely is a ratingKey change in normal Plex operation? I have not been
able to establish that, and it decides between (4) and (1). If it is rare-but-real, (4) plus
a good error message may be the whole answer.

---

## What I am asking for

For each: **fix now, fix later, or document and move on** — and for (1) specifically,
whether deferring on probability grounds is defensible when the worst case is silent
destruction of another device's history.

Ranking these against the other open work also matters. Still outstanding and arguably more
valuable than all three: **none of the `.164`–`.172` cross-device work has been verified on
real devices.** That is a substantial stack of unexercised change, and if forced to choose,
I would spend the next session on device verification rather than on any of the above.

# Loki Strike — Stage 6d finalization decision (clobbered retirement) — r1

**Date:** 2026-07-27
**Verdict:** HELD_STONE
**Commission:** pre-build, blind (plan review not read). Struck against HEAD `d3571bf`.

## The promise (verbatim scope)

On EVERY reachable transition AND gesture phase, the new derivation reproduces the OLD
runtime byproduct byte-for-byte:

- at the two FINALIZE read sites (js/app.js:1159, :1185): the new value equals
  `abortRender === 'rerender'`, where `abortRender` is `'rerender'` iff
  (fromKind==='browse' && toKind==='browse'), else `'none'`;
- at the RECOVERY read site (js/app.js:415): the new value equals
  `cur.live && (abortRender === 'rerender')`;
- `finPlan` (carrying `abortRender`) is computed at ARM time (in the session literal,
  replacing the old `clobbered: false` initializer) and frozen;

such that the old byproduct — `d.clobbered`, set true only inside `start()` at the 8px
lock when the build ran, for a browse→browse transition — is reproduced with NO
divergence on any reachable path.

## The complete read/write map of the old byproduct (grounding)

Writers: js/app.js:439 (`clobbered: false` in the arm-time session literal) and
js/app.js:516 (`d.clobbered = c.sourceWasClobbered`, inside `start()`). No other writer
exists in `js/` (grep over `clobbered|sourceWasClobbered`). Readers: js/app.js:415,
:1159, :1185 — exactly the three sites the promise names. `sourceWasClobbered` has no
consumer other than :516 (swipe.js:300/:310/:327 produce and carry it).

## Planes struck

### Plane 1 — the identity check vs the kind formula (EXECUTED)

The old value is not a kind formula; it is a DOM-identity check at swipe.js:310:
`resolveSource() === hostEl`, computed only on the `renderDestination==='browse-host'`
branch (swipe.js:305). `hostEl` is `$('browse')` (app.js:485). `resolveSource()` is
`env.sourceEl(sourceHost, from.v)` (app.js:482) → nav.js:35-36:
`overlayEl = byId(v)`; `appViewEl = v==='home' ? byId('home') : byId('browse')`.

The attack: find a reachable (from, to) where the identity check and
`fromKind==='browse' && toKind==='browse'` disagree — the promised suspects being
home→browse (in-flow source that is NOT #browse) and overlay→browse (browse-host render
whose source is an overlay).

Instrument: `probe-stage6d-r1-equivalence.js` (filed beside this record) — drives the REAL
`Swipe.classifyTransition` + `Swipe.constructionPlanFor` (js/swipe.js required DOM-free,
which internally requires the real js/nav.js `isOverlay`), with the nav.js:35-36 /
app.js:482/:485 identity semantics mirrored line-faithfully onto sentinel nodes, over
all 132 ordered pairs of the reachable screen space {home; books, authors,
authorBooks(+author), files(+book); options, nowplaying, general, playback, buffering,
downloads, diagnostics}, comparing OLD vs NEW at the finalize sites and at the recovery
site under the armed / live-mid-drag / pane-less-settling phases.

Result: **132 pairs, 0 divergences.** The equivalence is exact because `appViewEl` maps
every non-home name to `#browse` and `sourceHost` is `'in-flow'` iff fromKind is not
overlay, so `resolveSource()===$('browse')` ⇔ (fromKind!=='overlay' && from.v!=='home')
⇔ fromKind==='browse' — and the branch itself requires toKind==='browse'. Home→browse
and overlay→browse both come out false/`'none'` under both derivations.

### Plane 2 — the gesture phases at each read site (traced against HEAD control flow)

- **Finalize sites (:1159, :1185).** Reached only through `settle()`; end() at
  app.js:563 returns before settle for a non-live session, so `cur.live` is always true
  there and `start()` completed synchronously — the :516 write always happened. OLD =
  identity check; NEW = `abortRender==='rerender'`. Equal by Plane 1.
- **Recovery site (:415), armed-not-live `d`.** OLD reads the :439 init (false); NEW =
  `cur.live(false) && … = false`. Equal.
- **Recovery site, live mid-drag `d`.** `start()` is synchronous (app.js:474→:530);
  begin() cannot interleave between :474 and :516 on any non-throwing path, so live ⇒
  the :516 write happened. OLD = identity check; NEW = `true && abortRender`. Equal.
- **Recovery site, pane-less settling `session` (`finishing && session`, :383).** The
  :368 gate admits only pane-less sessions. A browse→browse session always carries an
  `app-ghost` owned-pane (swipe.js:131-132) — the probe asserts 0 pane-less
  browse→browse sessions — so OLD is false and NEW is `true && 'none'` = false. Equal.
- **Orphan-ghost recovery (`cur` null).** Both worlds pass the literal `false`. Equal.
- **Vertical abandon (:542).** Session dies before any read site. No exposure.

### Plane 3 — arm-time classification vs lock-time classification (traced)

`d.from`/`d.dest` are captured at arm in BOTH worlds (app.js:431-438); `start()` reads
the same objects. `classifyTransition` is pure over `(v, payload-presence)` and nothing
mutates a stack descriptor between touchstart and the 8px lock. Reachable screen names
(all `navTo`/`openSub`/push sites: app.js:155-189, :1319, :2654; browse.js:474) are
exhaustively {home, books, authors, authorBooks, files, options, nowplaying,
SETTINGS_SUBS} — every one classified by `kindOf`, and both parameterized descriptors
are constructed with their payloads (app.js:181, :182, :187). `kindOf`/`requirePayload`
cannot throw at arm for any reachable descriptor, so moving classification to arm
changes no reachable throw/kind outcome.

## Residual doubt (suspicions, not findings — no body)

1. **The throw window :474→:516.** If `snapBrowse`/`takeRowHold`/`buildConstruction`
   (including the mid-drag `Browse.render`) THROWS on a browse→browse gesture, HEAD
   leaves `live=true, clobbered=false` (the :516 write skipped), and the leftover then
   reaches :415 — and, if touchend still fires, :1159 — reading false; the arm-frozen
   plan would read `'rerender'` (recovery re-render + held-reveal abort instead of the
   bare paths). Unreachable by a real gesture on a healthy build: every thrower requires
   an already-broken state (missing `.app`, a `Browse.render` fault), at which point
   HEAD is itself outside contract (uncaught exception mid-gesture, leaked row hold).
   Filed as a suspicion only.
2. **Throw-timing shift on a malformed descriptor.** A null-payload `files`/`authorBooks`
   descriptor would throw at arm (begin) under the new code vs at lock (start) under
   HEAD — different wreckage (no session vs a live leftover). No reachable constructor
   produces one (app.js:181/:182/:187 always build the payload object).

## The instrument

`Claude/Loki/probe-stage6d-r1-equivalence.js` (reproducible; run with
`node Claude/Loki/probe-stage6d-r1-equivalence.js` from the repo root — it requires the
repo's real js/swipe.js, which requires the real js/nav.js): sentinel-node identity env
mirroring nav.js:35-36 and app.js:482/:485, full ordered-pair enumeration, phase matrix
as above. Output: `pairs checked: 132`,
`browse->browse sessions that are pane-less (must be 0): 0`, `divergences: 0`.

## Blast radius

None — no fracture. The promise's formula, including the `cur.live` conjunct at the
recovery site and the arm-time freeze, reproduces the old byproduct on every reachable
(transition, phase) tuple.

#!/usr/bin/env node
// mutate.mjs — apply ONE deliberate defect by index, run the suite, then --restore.
//
// Why a script and not a shell one-liner: a one-liner silently failed to apply its
// replacement and printed no failure, which is indistinguishable from "the tests
// caught it". This EXITS NONZERO when an anchor is missing, always mutates from a
// pristine backup, and supports two-part mutations (some defects only bite in pairs).
//
//   node tools/mutate.mjs --list
//   node tools/mutate.mjs 3        # apply #3
//   node tools/mutate.mjs --restore
import fs from 'fs';

const DEFAULT_FILE = 'js/app.js';
const bakOf = (f) => f + '.mutbak';

// The blob-order mutation spans several lines; built here to keep the table readable.
const BLOB_FROM = [
  '          if (blob) {',
  '            const nextUrl = URL.createObjectURL(blob);',
  "            if (useSrc(nextUrl, 'download')) curObjUrl = nextUrl;",
  '            else { try { URL.revokeObjectURL(nextUrl); } catch {} }',
  '          }',
].join('\n');
const BLOB_TO = "          if (blob) { curObjUrl = URL.createObjectURL(blob); useSrc(curObjUrl, 'download'); }";

// Multi-line swipe anchors, built by join for the same reason as BLOB_FROM: writing
// them as escaped literals is how trap T6 (CRLF vs '\n') and a mangled heredoc both
// produced anchors that silently never matched.
const ABORT_STACK_FROM = [
  '        if (commit) {',
  "          if (cur.dir === 'back') fwdStack.push(navStack.pop());",
].join('\n');
const ABORT_STACK_TO = [
  '        if (true) {',
  "          if (cur.dir === 'back') fwdStack.push(navStack.pop());",
].join('\n');
const END_RELEASE_FROM = ['    function end() {', '      releaseGesture();'].join('\n');
const END_RELEASE_TO = ['    function end() {', '      /* mutated */'].join('\n');
// stage 3: the superseded-session id on the hard-reset log line spans two source lines.
const HARDRESET_SID_FROM = [
  "        if (window.PBDebug) PBDebug.log('SWIPE', 'leftover state on begin → hard reset'",
  "          + (session ? ' sid=' + session.id : ''));",
].join('\n');
const DROP_SESSIONDONE_FROM = "sessionDone(cur);   // the held pane is released → this session's owner ends (terminal for held paths)";
const DROP_SESSIONDONE_TO = '/* mutated: owner not ended on held reveal */';
const HARDRESET_SID_TO = "        if (window.PBDebug) PBDebug.log('SWIPE', 'leftover state on begin → hard reset');";
// stage 6a: re-anchored — the hard reset's pane-disposal pair (PLAN-swipe-stage6.md §6
// step 2) is now two adjacent statements, not one compound line (the recovery render
// that step 3 adds needs the abort-render decision, so `render: false` can no longer be
// literal). Removing BOTH is still required to strand the pane: applyScreen() also calls
// Nav.resetSwipeStyles() internally, so dropping only the explicit call leaves the
// ghost disposed anyway.
// Re-anchored stage 6c (PLAN-swipe-stage6c.md §3): the recovery now also admits a
// pane-less SETTLING session (`d` null, `session` live), so the render/scroll reads
// were widened from `d` to `cur = d || session`.
// Re-anchored stage 6d (PLAN-swipe-stage6d.md §2/§9): the recovery reads the declared
// `cur.finPlan.abortRender` (plus the `cur.live` build-ran conjunct) instead of the
// retired `cur.clobbered` runtime byproduct.
// Re-anchored stage 6e (PLAN-swipe-stage6e.md §2/§4/§6): the owned-pane removal is now
// the owner-driven disposeOwnedPanes(cur,'superseded') call ahead of resetSwipeStyles,
// and both `resetSwipeStyles` and the `applyScreen` opts thread `keepGhosts:true` on the
// owned branch. Gutting all three still strands the pane (neither remover runs), the
// same defect this mutation has always proven — cell DP/HR/BR(snapshot clause).
const HARDRESET_DISPOSE_FROM = [
  "        if (cur) disposeOwnedPanes(cur, 'superseded');",
  '        resetSwipeStyles(cur ? true : undefined);',
  "        applyScreen(currentDesc(), { render: false, resetScroll: cur ? false : undefined, keepGhosts: cur ? true : undefined });",
].join('\n');
const HARDRESET_DISPOSE_TO = '        /* mutated: no hard reset */';
// stage 6a §9 VR — the two ordering defects the Loki strike measured against the real
// js/browse.js + js/virtuallist.js (STRIKE-swipe-stage6-recover-before-arm-r2.md §3).
const VR_HOLD_ORDER_FROM = [
  "        if (cur) disposeOwnedPanes(cur, 'superseded');",
  '        resetSwipeStyles(cur ? true : undefined);',
  "        applyScreen(currentDesc(), { render: false, resetScroll: cur ? false : undefined, keepGhosts: cur ? true : undefined });",
  '        if (cur) window.scrollTo(0, cur.scroll0);',
  '        dropRowHold();',
].join('\n');
const VR_HOLD_ORDER_TO = [
  '        dropRowHold();',
  "        if (cur) disposeOwnedPanes(cur, 'superseded');",
  '        resetSwipeStyles(cur ? true : undefined);',
  "        applyScreen(currentDesc(), { render: false, resetScroll: cur ? false : undefined, keepGhosts: cur ? true : undefined });",
  '        if (cur) window.scrollTo(0, cur.scroll0);',
].join('\n');
// Re-anchored stage 6c: `finishing = false;` (F2) now sits between dropRowHold() and
// the identity-null pair — still required to run AFTER dropRowHold (which reads
// session.hold) and BEFORE session/d are nulled.
const VR_IDENTITY_ORDER_FROM = [
  '        dropRowHold();',
  '        finishing = false;',
  '        session = null;',
  '        d = null;',
].join('\n');
const VR_IDENTITY_ORDER_TO = [
  '        session = null;',
  '        d = null;',
  '        dropRowHold();',
  '        finishing = false;',
].join('\n');
// stage 6a §9 SR — force the recovery to skip the source re-render even when the drag
// DID clobber #browse. NB: the opposite direction (force-render TRUE when NOT clobbered,
// aimed at cell NC) was tried and DROPPED — verified against the full suite, it reddens
// nothing: NC's fixture supersedes from an OVERLAY source, and Nav.applyScreen dispatches
// on desc.v BEFORE it ever consults the `render` flag (the options/sub-screen branch
// calls renderScreen(), never Browse.render()), so the flag's value cannot leak into a
// #browse render for that fixture regardless. NC's genuine proof is the scroll mutation
// below, which reddens its scroll-restore clause directly.
const RECOVERY_RENDER_LINE = "        applyScreen(currentDesc(), { render: false, resetScroll: cur ? false : undefined, keepGhosts: cur ? true : undefined });";
const RECOVERY_RENDER_ALWAYS_FALSE = "        applyScreen(currentDesc(), { render: false, resetScroll: cur ? false : undefined, keepGhosts: cur ? true : undefined });";
// stage 6a Poirot F1 (Claude/Poirot/f09cf9d-swipe-stage6-supersession.md) — the orphan
// sub-case (d===null) must keep nav.js's default resetScroll so a home/options source
// still scrolls to top. Forcing resetScroll:false back onto the orphan (the f09cf9d bug)
// reds the OB-home cell in test/swipe-stage6.test.js.
const F1_ORPHAN_RESETSCROLL_TO = "        applyScreen(currentDesc(), { render: false, resetScroll: false, keepGhosts: cur ? true : undefined });";

// ── SWIPE stage 5 multi-line anchors (built by join, per the CRLF/'\n' rule) ──────────
// Stage 1 (PLAN-swipe-declone.md §5.1) retires the `fromKind` argument along with
// ghostApp's HOME-source branch (browse->browse is the only caller left), so this anchor
// re-points at the now-bare `ghostApp()` call — same F7a ordering intent, new text.
const FINALIZE_ORDER_FROM = [
  '        let ok = false;',
  '        try { runFinalize(); ok = true; } finally {',
  '          dropRowHold(); endOwnership();',
].join('\n');
const FINALIZE_ORDER_TO = [
  '        let ok = false;',
  '        dropRowHold();   /* mutated: the hold releases BEFORE the applyScreen it must follow */',
  '        try { runFinalize(); ok = true; } finally {',
  '          endOwnership();',
].join('\n');
const S5_ORDER_FROM = "    outgoing = mover(env.sourceEl(sourceHost, from.v), 'borrowed-real', 'outgoing');";
const S5_ORDER_TO = [
  '    env.renderDestination(dest, destinationHost);   /* mutated: render BEFORE the source is resolved */',
  "    outgoing = mover(env.sourceEl(sourceHost, from.v), 'borrowed-real', 'outgoing');",
].join('\n');
const S5_NPPILL_FROM = [
  "      doc.querySelectorAll('.np-pill-float').forEach((n) => n.remove());",
  '      const clone = env.navPill().cloneNode(true);',
].join('\n');
const S5_NPPILL_TO = '      const clone = env.navPill().cloneNode(true);';
// RE-ANCHORED (browse-decouple, PLAN-browse-decouple.md §9): the .alphaindex clone-exclude
// line now sits directly before freezeArt(clone) (the .hidden/.parked prune is no longer the
// immediate predecessor) — same mutation intent (freezeArt is skipped), new adjacent anchor.
const S5_FREEZEART_FROM = [
  "      clone.querySelectorAll('.alphaindex').forEach((n) => n.remove());",
  '      freezeArt(clone);',
].join('\n');
const S5_FREEZEART_TO = "      clone.querySelectorAll('.alphaindex').forEach((n) => n.remove());";
const S5_UNHIDE_FROM = [
  "          el.classList.remove('hidden');",
  '          return el;',
].join('\n');
const S5_UNHIDE_TO = '          return el;';

// ── PLAN-home-shift-fix.md §7.1 — the two MUTUNIQ anchors target THIS FILE, so they are
// assembled from pieces rather than written as literals. A verbatim literal would make the
// anchor occur TWICE in its own target (once as real code, once as this registration's own
// `from` string) and the uniqueness check would correctly refuse it — the self-poisoning shape
// §7.3 warns about, where a check that scans text collides with the text ABOUT that check.
// Assembling the string keeps the source containing exactly one contiguous copy: the code.
const MUTUNIQ_GUARD_FROM = '  if (occurrences > 1 && part.' + 'occurrence == null) {';
const MUTUNIQ_GUARD_TO = '  if (false && occurrences > 1 && part.occurrence == null) {';
const MUTUNIQ_APPLY_FROM = '  byFile.set(f, src.slice(0, resolved.index) + to + src.'
  + 'slice(resolved.index + from.length));';
const MUTUNIQ_APPLY_TO = '  byFile.set(f, src.replace(from, to));';

const MUTATIONS = [
  { name: 'MS pause -> audio.pause() direct (bypasses userPause)',
    from: "ms.setActionHandler('pause', () => userPause());",
    to: "ms.setActionHandler('pause', () => audio.pause());" },
  { name: 'MS seekbackward -> element direct (bypasses skipBy/onManualSeek)',
    from: "ms.setActionHandler('seekbackward', () => skipBy(-getSkipBack()));",
    to: "ms.setActionHandler('seekbackward', () => { audio.currentTime = Math.max(0, audio.currentTime - getSkipBack()); });" },
  { name: 'MS seekforward -> wrong direction',
    from: "ms.setActionHandler('seekforward', () => skipBy(getSkipFwd()));",
    to: "ms.setActionHandler('seekforward', () => skipBy(-getSkipFwd()));" },
  { name: 'MS previoustrack -> nextTrack (wrong handler)',
    from: "ms.setActionHandler('previoustrack', prevTrack);",
    to: "ms.setActionHandler('previoustrack', nextTrack);" },
  { name: 'foreground re-drives restoreLastPlayed (resume-kill shape)',
    // BENIGN ALONE BY DESIGN — established at .158: the resume-kill only bites when
    // foreground-restore re-fires AND PBLogic.shouldReloadOnRestore regresses. Either
    // edit on its own is survivable because the app genuinely defends, so no test
    // fails here and that is CORRECT. #6 is the two-part version and is caught.
    // Flagged so tools/mutation-sweep.mjs does not report it as an undefended guard —
    // a sweep that cries wolf gets ignored, which costs more than it saves.
    benignAlone: 'needs #6\'s second edit to bite (.158)',
    from: '        Playback.onVisible();   // recover a lock-screen wedge deferred while backgrounded (js/playback.js)',
    to: '        Playback.onVisible();\n        restoreLastPlayed();' },
  { name: 'playReqGen supersede guard removed',
    from: '    if (myReq !== playReqGen) return;   // a newer explicit play superseded this one mid-fetch',
    to: '    if (false) return;' },
  // Only bites as a PAIR: each half alone is benign because the app really does defend.
  { name: 'foreground restore + same-track guard regressed (the .95 resume-kill)',
    from: '      const reload = PBLogic.shouldReloadOnRestore(saved.book, saved.track, prev && prev.book, prevT && prevT.ratingKey, elementLive);',
    to: '      const reload = true;',
    also: {
      from: '        Playback.onVisible();   // recover a lock-screen wedge deferred while backgrounded (js/playback.js)',
      to: '        Playback.onVisible();\n        restoreLastPlayed();',
    } },
  // ---- external review of .161, fixed in .162 --------------------------------
  { name: 'object URL: assign curObjUrl BEFORE useSrc (revokes the url it installs)',
    from: BLOB_FROM, to: BLOB_TO },
  // RE-ANCHORED: .194 replaced the page-level `.hidden` test with offscreen(), which
  // also covers a PARKED page. The old anchor had silently stopped applying, so the
  // .161 scroll-yank guard has been undefended since then — found by
  // test/mutation-anchors.test.js, not by anyone running this file.
  { name: 'browse: drop browseVisible from the scroll-yank guard (.161)',
    file: 'js/browse.js',
    from: "    if (browseVisible() && !offscreen(page)) positionOnEnter(desc, page);",
    to: "    if (!offscreen(page)) positionOnEnter(desc, page);" },
  // The ordering assertion the shared recorder made possible: claim ownership only
  // AFTER the element is loading. `.162`'s report claimed this lived here and it
  // did not — the tool had the two production fixes but never this one, so the
  // "mutations 7–9" claim was not substantiated by the repo. Added so the claim is
  // true going forward. (Scope: this pins the SYNCHRONOUS stream path, which is
  // what the ordering test observes — see the note on that test about the async
  // downloaded-blob path, where the claim legitimately precedes the blob source.)
  { name: 'ordering: claim Presence BEFORE the element is loading',
    from: `      startTrack(idx, (posMs || 0) / 1000);`,
    to: `      Presence.claimPlaying(book, tracks[idx].ratingKey, posMs || 0, tracks[idx].ratingKey);\n      startTrack(idx, (posMs || 0) / 1000);` },
  // The sign-out load boundary (.166): a downloaded blob resolving after sign-out
  // could assign a source and autoplay, because notePlaybackIntent bumps the play
  // intent but never loadGen.
  { name: 'sign-out no longer invalidates an in-flight media load',
    from: `    userPause(); invalidateMediaLoad(); Plex.signOut();`,
    to: `    userPause(); Plex.signOut();` },
  // ── SWIPE / REVEAL, stages 1-2 of PLAN-swipe-reveal.md ─────────────────────────
  // These were verified by hand in a scratchpad when .217/.218 shipped, which meant
  // the evidence could not be re-run or audited later. An external review of .218
  // called that out: this repo's mutation infrastructure exists precisely so a guard
  // that was once verified cannot silently become undefended. Each entry names the
  // test expected to go red.
  { name: 'swipe: end() stops distinguishing ARMED from DRAGGING (-> I19 ARMED tests)',
    // Re-anchored for stage 3: the ARMED branch gained the ownership-endpoint clear, so
    // it is now a block, not a bare `return`. This mutation still sends ARMED down the
    // DRAGGING path (drops the whole guard); the endpoint clear is a SEPARATE mutation.
    from: 'if (!cur.live) { sessionDone(cur); return; }   // ARMED end: listeners released above, owner ends — no settle',
    to: 'if (false) { sessionDone(cur); return; }' },
  { name: 'swipe: touchcancel no longer shares onEnd (-> I19 DRAGGING commit test)',
    from: "target.addEventListener('touchcancel', onEnd, { passive: true });",
    to: "target.addEventListener('touchcancel', () => {}, { passive: true });" },
  { name: 'swipe: begin() stops hard-resetting a superseded session (-> I2/I20 pane test)',
    from: HARDRESET_DISPOSE_FROM, to: HARDRESET_DISPOSE_TO },
  // ── SWIPE stage 6a: supersession pre-stack recovery (PLAN-swipe-stage6.md §6/§9) ─
  { name: 'stage6a (a) re-anchored: the Browse hold releases BEFORE the applyScreen it must follow, so endHold is handed the PRE-commit descriptor (-> LANDEDPAGESHOWS commit half)',
    from: FINALIZE_ORDER_FROM, to: FINALIZE_ORDER_TO },
  { name: 'stage6a (b): session/d null BEFORE the hold release (-> VR: dropRowHold no-ops, hold leaks)',
    from: VR_IDENTITY_ORDER_FROM, to: VR_IDENTITY_ORDER_TO },
  // DE-REGISTERED (PLAN-swipe-declone.md Stage 2): the mutation IS the shipped behaviour now. No transition overwrites its source, so the
  // recovery never re-renders and `render: false` is literal — there is no decision left to defeat.
  { name: 'stage6a: recovery stops restoring the session-start scroll (-> SC known-red test, NC scroll clause)',
    from: '        if (cur) window.scrollTo(0, cur.scroll0);',
    to: '        /* mutated: no scroll restore */' },
  { name: 'stage6a F1: orphan sub-case forces resetScroll:false, dropping home scroll-to-top (-> OB-home test)',
    from: RECOVERY_RENDER_LINE, to: F1_ORPHAN_RESETSCROLL_TO },
  // ── SWIPE stage 6c: pane-less supersession ownership guard (PLAN-swipe-stage6c.md) ─
  { name: 'stage6c W: the supersession recovery omits the finishing=false clear (-> W/W(armed) wedge test)',
    from: [
      '        dropRowHold();',
      '        finishing = false;',
      '        session = null;',
    ].join('\n'),
    to: [
      '        dropRowHold();',
      '        session = null;',
    ].join('\n') },
  { name: 'stage6c G1: the settle-rAF cur===session guard is removed (-> G1/G-chain stale-transform test)',
    from: [
      "        if (cur !== session) return;",
      "        for (const m of cur.movers) m.el.style.transform = 'translateX(' + (m.base === 0 ? outTo : inTo) + 'px)';",
    ].join('\n'),
    to: "        for (const m of cur.movers) m.el.style.transform = 'translateX(' + (m.base === 0 ? outTo : inTo) + 'px)';" },
  { name: 'stage6c G2/G3: the finalize cur===session guard is removed (-> G2/G3/G-chain stale-finalize test)',
    from: [
      '        if (cur !== session) return;',
      '        // Order matters: dropRowHold reads session.hold, so it must run BEFORE',
    ].join('\n'),
    to: '        // Order matters: dropRowHold reads session.hold, so it must run BEFORE' },
  { name: 'swipe: supersession stops releasing the old target listeners (-> I20 stale-callback test)',
    from: "releaseGesture();   // never leave a dead gesture's listeners on a stale node",
    to: '/* mutated: listeners left bound */' },
  // RE-ANCHORED (PLAN-home-shift-fix.md §7.3, MUTUNIQ): `window.scrollTo(0,
  // cur.scroll0);` occurs THREE times in js/app.js (the supersession recovery at 445,
  // the held abort path at 1203, the no-hold abort path at 1228) and this single entry
  // anchored on the bare line, so first-occurrence-wins always mutated the RECOVERY —
  // the intended ABORT sites (either path) were never mutated and their restore had
  // never been proven able to fail. Split into three per-site entries, each anchored
  // with enough surrounding context to be unique on its own.
  { name: 'swipe: supersession recovery stops restoring the session-start scroll (-> I20 test)',
    // Unique via the `if (cur)` guard: only the recovery site inlines this scroll
    // restore behind an `if (cur)` check — both abort sites are bare (they run inside
    // an outer commit/abort branch that already established `cur`).
    from: '        if (cur) window.scrollTo(0, cur.scroll0);',
    to: '        /* mutated: no scroll restore */' },
  // DE-REGISTERED (PLAN-swipe-declone.md Stage 2): the HELD abort branch is deleted (§12 item 13) — an abort has nothing to hold a ghost over,
  // so there is no held scroll restore to suppress. The no-hold abort restore is still guarded below.
  { name: 'swipe: no-hold abort stops restoring the starting scroll (-> AB.noclobber-overlay / AB.noclobber-home tests)',
    // Unique via the preceding applyScreen statement — only the no-hold abort branch
    // pairs this scroll restore with that exact resetScroll:false applyScreen call.
    from: [
      "          applyScreen(dest, { render: false, resetScroll: false });",
      '          window.scrollTo(0, cur.scroll0);',
    ].join('\n'),
    to: [
      "          applyScreen(dest, { render: false, resetScroll: false });",
      '          /* mutated: no scroll restore */',
    ].join('\n') },
  { name: 'swipe: abort mutates the nav stack like a commit (-> I11 abort test)',
    from: ABORT_STACK_FROM, to: ABORT_STACK_TO },
  // DEFENCE IN DEPTH — each half alone was MEASURED insufficient, so both must go or
  // the sweep would wrongly report the guard as undefended.
  { name: 'swipe: duplicate-end defence removed, BOTH guards (-> I13 duplicate-end test)',
    from: END_RELEASE_FROM, to: END_RELEASE_TO,
    also: { from: 'const cur = d; d = null;', to: 'const cur = d;' } },
  { name: 'swipe: inline-style clearing removed, BOTH sites app.js+nav.js (-> I5)',
    from: "for (const m of cur.movers) { m.el.style.transition = ''; m.el.style.transform = ''; m.el.style.willChange = ''; }",
    to: '/* mutated: styles left inline */',
    also: { file: 'js/nav.js',
      from: "for (const el of els) if (el) { el.style.transform = ''; el.style.transition = ''; el.style.willChange = ''; el.style.zIndex = ''; }",
      to: '/* mutated: resetSwipeStyles no longer clears */' } },
  // ── SWIPE stage 3: session owner identity (PLAN-swipe-reveal.md) ────────────────
  { name: 'stage3: session id not stamped on the finalize line (-> distinct-sids test)',
    from: ' tgt=${tg && tg.isConnected ? \'live\' : \'detached\'}:${tgDesc} sid=${cur.id}`)',
    to:   ' tgt=${tg && tg.isConnected ? \'live\' : \'detached\'}:${tgDesc}`)' },
  { name: 'stage3: sessionSeq frozen so every gesture shares an id (-> distinct-sids test)',
    from: 'd = { id: ++sessionSeq,',
    to:   'd = { id: sessionSeq,' },
  { name: 'stage3: hard reset drops the superseded sid from its log (-> superseded-sid test)',
    from: HARDRESET_SID_FROM, to: HARDRESET_SID_TO },
  // ── SWIPE stage 3 (completed): resource ownership + endpoint (review of .222) ───
  { name: 'stage3: hard reset logs the SUCCESSOR id, not the superseded one (-> misattribution test)',
    from: "+ (session ? ' sid=' + session.id : '')",
    to:   "+ (session ? ' sid=' + (sessionSeq + 1) : '')" },
  { name: 'stage3: ARMED end does not relinquish ownership (-> endpoint armed-cancel test)',
    from: 'if (!cur.live) { sessionDone(cur); return; }   // ARMED end: listeners released above, owner ends — no settle',
    to:   'if (!cur.live) { return; }' },
  { name: 'stage3: vertical abandon does not relinquish ownership (-> endpoint abandon test)',
    from: 'releaseGesture(); sessionDone(d); d = null; return;',
    to:   'releaseGesture(); d = null; return;' },
  { name: 'stage3: finalize does not end ownership (-> endpoint completed-and-gone test)',
    // Re-anchored: finding 2's throw-restore turned the finally into a block; the
    // ownership end is now this line.
    from: 'dropRowHold(); endOwnership();',
    to:   'dropRowHold();' },
  // DE-REGISTERED (PLAN-swipe-declone.md Stage 2): holdGhostUntilPaintable is deleted with its only caller — no path ends ownership at a drop.
  // ── .223 review fixes (sanctioned: findings 1a, 2, and 4's stronger test) ──────
  { name: 'r223 1a: settle rAF not cancelled AND the ownership-identity guard removed → stale transform on a real view (-> 1a test)',
    // TWO PARTS, and the second is not padding. Since PLAN-swipe-declone.md Stage 2 removed the
    // held abort reveal, finalize ends its session in the finally-block on EVERY path, so the
    // stage-6c identity guard already makes an uncancelled frame a no-op. Removing only the
    // cancel is invisible; removing both reproduces the .223 defect. The identity guard's OWN
    // path (a superseded session, where finalize never ran) is mutant 'stage6c G1', unchanged.
    from: 'cancelAnimationFrame(cur.settleFrame);',
    to:   '/* mutated: settle rAF left uncancelled */',
    also: {
      from: '        if (cur !== session) return;\n        for (const m of cur.movers) m.el.style.transform',
      to:   '        for (const m of cur.movers) m.el.style.transform' } },
  { name: 'r223 2: finishing not restored on a throw → swipe wedge (-> throw-in-finalize test)',
    from: 'if (!ok) finishing = false;   // a throw in applyScreen must never wedge every future swipe',
    to:   'if (false) finishing = false;' },
  { name: 'r223 4: endOwnership clears at finalize, ignoring revealPending (-> held-reveal intermediate-ownership test)',
    from: 'const endOwnership = () => { if (!revealPending) sessionDone(cur); };   // held paths end in drop()',
    to:   'const endOwnership = () => { sessionDone(cur); };' },
  // ── SWIPE stage 4: the classification/construction boundary (js/swipe.js) ───────
  // Reviews of .227/.228 (Claude/Poirot/14257f2-*, f3ddd77-*), fixed across .228–.230.
  // These were verified BY HAND at the time — the evidence lived only in commit messages,
  // exactly the anti-pattern Engineering Contract item 11 forbids. Registered here so the
  // sweep re-runs them and a guard that goes undefended announces itself.
  { name: 'swipe4 F1: buildConstruction ignores plan.decorations, NP pill not built (-> WIRING pill test)',
    // Re-anchored for stage 5: the NP decoration loop moved from app.js start() into
    // js/swipe.js buildConstruction. The WIRING pill test still drives the real start() →
    // env → buildConstruction, so dropping the loop here still leaves NO pill and reddens it.
    file: 'js/swipe.js',
    from: '    for (const deco of plan.decorations) {',
    to:   '    for (const deco of []) {' },
  { name: 'swipe4 F3: classifyTransition output not deep-frozen (-> classification deep-frozen test)',
    file: 'js/swipe.js',
    from: '    decorations = Object.freeze(decorations.map((d) => Object.freeze(d)));',
    to:   '    void 0; // mutated: skip deep-freeze' },
  { name: 'swipe4 F5: malformed parameterized descriptor not rejected (-> descriptor-scenarios test)',
    file: 'js/swipe.js',
    from: "  const PARAM_REQUIRED = { authorBooks: 'author', files: 'book' };",
    to:   '  const PARAM_REQUIRED = {}; // mutated: no malformed rejection' },
  // RE-ANCHORED (PLAN-home-shift-fix.md §7.3, MUTUNIQ): the bare `if
  // (KINDS.indexOf(c.fromKind) === -1) {` line is SHARED with finalizationPlanFor's own
  // guard (js/swipe.js:180), so this entry's `caught` was legitimate by SOURCE ORDER
  // only (constructionPlanFor's copy comes first) — any new branch added above line 140
  // would migrate the mutant to the wrong function silently. Anchored on the following
  // throw line instead, which names the function and is unique to constructionPlanFor.
  { name: 'swipe4 F6: constructionPlanFor absorbs a bad fromKind instead of throwing (-> source-kind test)',
    file: 'js/swipe.js',
    from: [
      '    if (KINDS.indexOf(c.fromKind) === -1) {',
      `      throw new Error('Swipe.constructionPlanFor: unhandled source kind "' + c.fromKind + '"');`,
    ].join('\n'),
    to: [
      '    if (false && KINDS.indexOf(c.fromKind) === -1) {',
      `      throw new Error('Swipe.constructionPlanFor: unhandled source kind "' + c.fromKind + '"');`,
    ].join('\n') },
  { name: 'swipe4 F7: construction plan carries a stray field, exact-keys must catch it (-> 132-pair test)',
    file: 'js/swipe.js',
    from: '    return Object.freeze({ outgoing, incoming, renderDestination, decorations });',
    to:   '    return Object.freeze({ outgoing, incoming, renderDestination, decorations, stray: 1 });' },
  { name: 'swipe4 F4: classifier over-rejects same-v pairs that must yield a plan (-> descriptor-scenarios test)',
    file: 'js/swipe.js',
    from: "    requirePayload(to, 'destination');",
    to:   "    requirePayload(to, 'destination');\n    if (from.v === to.v) throw new Error('mutated F4 over-reject');" },
  { name: 'swipe4 no-dead-fields: classification emits an unconsumed field (-> exposes-only-consumed test)',
    // Stage 5 re-anchored: the classification now carries the two consumed host fields;
    // sameBrowseHost is STILL unconsumed until stage 6, so adding it must still redden the
    // exact-key ("exposes only consumed fields") assertions.
    file: 'js/swipe.js',
    from: '    return Object.freeze({ fromKind, toKind, sourceHost, destinationHost, decorations });',
    to:   '    return Object.freeze({ fromKind, toKind, sourceHost, destinationHost, decorations, sameBrowseHost: false });' },
  { name: 'swipe4 F-i: constructionPlanFor not independently deep-immutable (-> independent-immutability test)',
    file: 'js/swipe.js',
    from: '    const decorations = Object.freeze((c.decorations || []).map((d) => Object.freeze({ ...d })));',
    to:   '    const decorations = c.decorations; // mutated: no independent freeze' },
  { name: 'swipe4 F-ii: classifier rejects identical-object d->d that must yield a plan (-> descriptor-scenarios test)',
    file: 'js/swipe.js',
    from: "    requirePayload(from, 'source');",
    to:   "    requirePayload(from, 'source');\n    if (from === to) throw new Error('mutated F-ii same-ref');" },
  // §15 coverage gate — dropping a category's tag must be caught by descriptor-coverage-gate.
  { name: 'swipe4 §15: unknown-screen-type coverage dropped (-> §15 coverage gate)',
    file: 'test/fixtures/swipe-plan-spec.mjs',
    from: "sec15: 'unknown-screen-type',",
    to:   "sec15: 'same-type-different-identity'," },
  // §14 clone-before-freeze — freezing the caller's array in place (instead of cloning) is
  // still deep-frozen output, so ONLY the clone-before-freeze assertion catches it.
  { name: 'swipe4 §4.11: constructionPlanFor freezes the caller decorations in place (-> §14 clone-before-freeze)',
    file: 'js/swipe.js',
    from: '    const decorations = Object.freeze((c.decorations || []).map((d) => Object.freeze({ ...d })));',
    to:   '    const decorations = Object.freeze(c.decorations);' },
  // §4.19 policy-ledger dangling-reference mutation REMOVED (stage 6a §10 scrub): its `from`
  // anchored the literal `restores the starting scroll'],` on the KR-swipe-scroll-restore
  // PolicyLedger entry, which this commit removes. Re-pointing is not available — after the
  // scrub no `knownRed` entry remains for it to target. Deleting it here keeps
  // test/mutation-anchors.test.js green (its `from` would otherwise rot). This leaves the
  // policy-ledger gate (test/policy-ledger-gate.test.js) without a defending mutation; its
  // three assertions still pass on an empty ledger, but restoring structural mutation
  // coverage of that gate is a coverage-audit question (plan §10), not a 6a build obligation.
  // ── SWIPE stage 5: the buildConstruction seam (js/swipe.js) + the L3 adapter (js/app.js) ─
  // Every §8 cell of PLAN-swipe-stage5.md that this stage introduced. The recipe/contract
  // mutations bite js/swipe.js (recipe layer, test/swipe-construction.test.js; contract layer,
  // test/swipe-transition.test.js); the wiring mutations bite the L3 adapter in js/app.js
  // (test/swipe-stage5-wiring.test.js). Each names the test it must redden.
  // — RECIPE (js/swipe.js) —
  { name: 'swipe5 F1.1: buildConstruction emits production mover keys instead of the external shape (-> movers external-shape test)',
    file: 'js/swipe.js',
    from: '    const mover = (element, ownership, slot) => ({ element, ownership, slot });',
    to:   '    const mover = (element, ownership, slot) => ({ el: element, own: ownership, slot });' },
  // DE-REGISTERED (PLAN-swipe-declone.md Stage 2): the `capture` field is REMOVED from the Construction return (§6): no producer, no key, nothing to set.
  // swipe5 F2-r "the home snapshot capture carries a ghostY it must not" REMOVED (Stage 6i,
  // PLAN-swipe-noswap-home.md §5/§12 scrub): its target, snapshotHome()'s return statement,
  // is DELETED — a →home reveal no longer builds any owned pane, so there is no home-snapshot
  // capture left for a ghostY to leak into. The class of defect (a capture missing/gaining a
  // field it should not carry) stays covered elsewhere: swipe5 F1c above (capture set when it
  // must be null) and the exact-key assertions in test/swipe-construction.test.js.
  // RE-ANCHORED (PLAN-swipe-declone.md Stage 2): the app-ghost recipe is deleted, so the
  // ambient-read hazard moves to the ONE builder left — npPillClone. The intent is identical
  // (a builder reaching the world through a global instead of through env) and the cell that
  // kills it is the same one, now driven on an NP transition.
  { name: 'swipe5 F4a: the surviving pane builder reads an ambient document, not env.document (-> no-ambient recipe test)',
    file: 'js/swipe.js',
    from: "      doc.querySelectorAll('.np-pill-float').forEach((n) => n.remove());\n      const clone = env.navPill().cloneNode(true);",
    to:   "      document.querySelectorAll('.np-pill-float').forEach((n) => n.remove());\n      const clone = env.navPill().cloneNode(true);" },
  // DE-REGISTERED (PLAN-swipe-declone.md Stage 2): copyAnimPhase is deleted with the clone-fidelity cluster — the real nodes carry their own
  // running animations, so no phase is copied and no Element is read. The no-ambient-DOM
  // guarantee itself is still guarded by the re-anchored F4a mutant below.
  // DE-REGISTERED (PLAN-swipe-declone.md Stage 2): finalizationPlanFor is deleted with the abortRender decision (§12 item 8).
  { name: 'swipe5 F7a: the destination render runs BEFORE the outgoing mover is resolved (-> outgoing-before-render test)',
    file: 'js/swipe.js',
    from: S5_ORDER_FROM, to: S5_ORDER_TO },
  // DE-REGISTERED (PLAN-swipe-declone.md Stage 2): ghostWrap and the .nav-ghost wrapper are deleted (§12 item 2) — there is no wrapper to mis-stack.
  { name: 'swipe5 npPill: npPillClone stops removing the stale float (-> NP pill recipe test)',
    file: 'js/swipe.js',
    from: S5_NPPILL_FROM, to: S5_NPPILL_TO },
  // DE-REGISTERED (PLAN-swipe-declone.md Stage 2): freezeArt is deleted (§12 item 3) — no nodes are created, so nothing can re-trigger the art loader.
  // — CONTRACT (js/swipe.js) —
  { name: 'swipe5 F1-r: the sourceHost projection is mis-mapped (overlay source -> in-flow) (-> per-pair host projection test)',
    file: 'js/swipe.js',
    from: "    const sourceHost = fromKind === 'overlay' ? 'overlay' : browsePair ? 'browse-page' : 'in-flow';",
    to:   "    const sourceHost = 'in-flow';" },
  // — WIRING / L3 adapter (js/app.js) —
  { name: 'swipe5 F1b: L3 maps the incoming base with the WRONG sign (-> F1b base-sign wiring)',
    from: "      const baseOf = (slot) => (slot === 'outgoing' ? 0 : off);",
    to:   "      const baseOf = (slot) => (slot === 'outgoing' ? 0 : -off);" },
  { name: 'swipe5 F5b: the overlay render branch drops the UNHIDE (-> F5b overlay-unhide wiring)',
    from: S5_UNHIDE_FROM, to: S5_UNHIDE_TO },
  { name: 'swipe5 F5c: showAppView drops the stale-overlay cleanup (-> F5c stale-overlay wiring)',
    from: "      for (const s of ['options', ...SETTINGS_SUBS]) if (!d || d.from.v !== s) $(s).classList.add('hidden');",
    to:   '      /* mutated: stale-overlay cleanup dropped */' },
  // swipe5 F2-r-wiring "L3 SYNTHESIZES a ghostY on the home path" REMOVED (Stage 6i,
  // PLAN-swipe-noswap-home.md §5/§12 scrub): the defect it modeled — L3 assigning
  // d.ghostY=0 for a capture that legitimately LACKS a ghostY — is unreachable now. The
  // only ghostY-less capture was the home-snapshot, which is retired; a →home reveal
  // builds NO capture at all (the `if (c.capture)` block never runs), and every surviving
  // capture is an app-ghost that always carries ghostY, so both mutation forms set the
  // identical value and no test can distinguish them (it swept UNCAUGHT). The surviving
  // invariant (browse→home is pane-less, so L3 synthesizes neither animSync nor ghostY —
  // both reported "?") is asserted by the rewritten F2-r WIRING test in
  // test/swipe-stage5-wiring.test.js; a build that reintroduces a →home capture is caught
  // by SNAPSHOTGONE (mutation `stage6i SNAPSHOTGONE`).
  { name: 'swipe5 F7b: the row hold no longer precedes the clobbering render (-> F7b ordering wiring)',
    from: '      takeRowHold();   // from here the outgoing page keeps its rows until this gesture ends\n',
    to:   '',
    also: {
      from: '      const c = Swipe.buildConstruction(d.from, d.dest, env);',
      to:   '      const c = Swipe.buildConstruction(d.from, d.dest, env);\n      takeRowHold();',
    } },
  // ── SWIPE stage 6d BC-1 (Mendeleev AUDIT-swipe-stage6d): the finalizationPlanFor
  // unhandled-kind guards shipped without a mutant, so making them inert left the suite
  // green. Anchored on the UNIQUE throw line (the bare `if (KINDS.indexOf(c.fromKind) === -1)`
  // is shared with constructionPlanFor's own guard, so anchoring on the bare line alone
  // would mutate the wrong function). The sibling swipe4 F6 entry above anchored on
  // precisely that shared line for a long time, which the uniqueness check below now
  // catches mechanically — a non-unique `from` is refused at registration rather than
  // relying on a reader noticing the collision by inspection.
  // Each makes its guard body a no-op, so an unhandled kind falls through to the abortRender
  // ternary and silently answers 'none' instead of throwing → reddens the new throw test in
  // test/swipe-transition.test.js. Same `void 0` shape as swipe4 F3.
  // DE-REGISTERED (PLAN-swipe-declone.md Stage 2): finalizationPlanFor is deleted (§12 item 8), and with it both own-contract guards.
  // DE-REGISTERED (PLAN-swipe-declone.md Stage 2): finalizationPlanFor is deleted (§12 item 8), and with it both own-contract guards.
  // The RC.armed §4.10 tooling loop: the committed RC.armed test catches dropping the
  // `cur.live` build-ran conjunct from the recovery reader (js/app.js), but there was no
  // REGISTERED mutant for it. Dropping `cur.live &&` makes an ARMED (pre-lock, never-built)
  // browse→browse recovery read finPlan.abortRender directly ('rerender'), so it wrongly
  // re-renders #browse → reddens RC.armed (a DRAGGING/overlay supersession is unchanged:
  // cur.live is true / abortRender is 'none' there).
  // DE-REGISTERED (PLAN-swipe-declone.md Stage 2): the conjunct guarded a render decision that no longer exists — the recovery renders nothing.
  // ── SWIPE stage 6e: owner-driven disposeOwnedPanes(session, reason) (PLAN-swipe-stage6e.md) ─
  // Curie authored the DP/BR/HR/DEC/RGreveal cells before disposeOwnedPanes existed, so their
  // true built-code defenders (a broken filter INSIDE the new helper, and the nav.js decoration
  // guard) could not be registered until the helper landed. Registered here per plan §9.
  { name: 'swipe6e DP/attribution: disposeOwnedPanes\' own filter never matches, so it removes nothing (-> NOOP.attribution, DP.browse-browse, DP.browse-home)',
    from: "        if (m.own === 'owned-pane' && m.el.parentNode) { m.el.remove(); disposed = true; }",
    to:   '        if (false && m.el.parentNode) { m.el.remove(); disposed = true; }' },
  { name: 'swipe6e BR: disposeOwnedPanes broadens to remove every mover regardless of own (-> BR borrowed-survives test)',
    from: "        if (m.own === 'owned-pane' && m.el.parentNode) { m.el.remove(); disposed = true; }",
    to:   '        if (m.el.parentNode) { m.el.remove(); disposed = true; }' },
  { name: 'swipe6e DEC: the .np-pill-float decoration removal is mistakenly guarded behind keepGhosts too (-> DEC test)',
    file: 'js/nav.js',
    from: "    document.querySelectorAll('.np-pill-float').forEach((n) => n.remove());   // transient NP-swipe pill clone",
    to:   "    if (!keepGhosts) document.querySelectorAll('.np-pill-float').forEach((n) => n.remove());   // mutated: wrongly guarded" },
  // ── Stage 6e Mendeleev-remediation (AUDIT-swipe-stage6e BARE_CELLS): close the Mutation-cases
  // dimension (EC §4.10 — non-vacuity evidence must be RUNNABLE in tooling, not a one-time hand
  // check). The NOOP.mechanism anti-no-op guard, the RSN reason-correctness/emit guard, and an
  // HR orphan-specific mutant were unregistered. See Claude/Curie/RED-swipe-stage6e.md
  // §"Mendeleev-remediation".
  //
  // B1 — the anti-no-op crux (Loki STRIKE-swipe-stage6e-r1 residual 1). The owned branch must
  // suppress the DOM-global .nav-ghost sweep at BOTH sites (the explicit resetSwipeStyles AND
  // applyScreen's internal one). Dropping keepGhosts at EITHER site alone lets that one sweep run;
  // the owned pane is already gone via disposeOwnedPanes, so the DOM outcome is UNCHANGED and only
  // NOOP.mechanism's sweep-count reddens (count 1) — which is exactly why a DOM-outcome cell (DP)
  // cannot catch it and a mechanism cell must. Two one-site mutants, one per site.
  // DE-REGISTERED (PLAN-swipe-declone.md Stage 2): NOOP-a and NOOP-b both asserted which of two
  // mechanisms disposes an OWNED PANE on the recovery branch. No transition builds one, so both
  // sweeps remove nothing and each mutant applies cleanly while changing no behaviour — the sweep
  // reported both UNCAUGHT. Nothing is left undefended by their removal: keepGhosts suppresses
  // the `.nav-ghost` sweep (js/nav.js:105) — a node kind that is never created and is itself on
  // the subtraction list (§12 item 14) — while the ADJACENT `.np-pill-float` sweep (js/nav.js:106)
  // is UNGUARDED by keepGhosts and runs regardless; its removal is defended by the DEC cell in
  // test/swipe-stage6e.test.js.
  // B2 — RSN reason correctness (plan §9 promised a mistag mutant that never landed). (a) the
  // disposal reason TOKEN is wrong -> RSN's "superseded recorded" assertion reddens; (b) the trace
  // fires UNCONDITIONALLY, ignoring the `disposed` flag (Charpy F2) -> a pane-LESS supersession
  // then claims a disposal that never happened, reddening RSN's pane-less-no-trace clause.
  // DE-REGISTERED (PLAN-swipe-declone.md Stage 2, reconciled 2026-08-01 after CI's full-registry
  // sweep reported it UNCAUGHT). RSN-mistag perturbed the disposal REASON token, which has exactly
  // one consumer: the PBDebug SWIPE line inside disposeOwnedPanes. That line is gated on `disposed`
  // — deliberately, so a no-op call cannot claim a disposal that never happened — and no transition
  // builds an owned pane any more, so it never runs and the token is unobservable. The mutation
  // applies cleanly and changes nothing.
  // NOT a relocation, checked rather than assumed: the only ownership kind left is the NP pill
  // decoration ('owned-decoration'), removed by resetSwipeStyles, which takes no reason token.
  // STILL DEFENDED, and by what — disposeOwnedPanes' `own` FILTER (it never removes a
  // borrowed-real mover) by the BR cell; the pane-less reality by DP.browse-home; the NP
  // decoration's removal on the recovery by DEC — all in test/swipe-stage6e.test.js, all passing.
  // Only the disposal EVENT and its reason lose coverage, and they lose it by having no subject.
  // disposeOwnedPanes itself is a step-11 subtraction item (§12 item 15) and is left standing.
  { name: 'swipe6e RSN-emit: the disposal trace fires unconditionally, ignoring the disposed flag (-> RSN pane-less-no-trace clause / Charpy F2)',
    from: "      if (disposed && window.PBDebug) PBDebug.log('SWIPE', `pane disposed reason=${reason} sid=${owner.id}`);",
    to:   "      if (window.PBDebug) PBDebug.log('SWIPE', `pane disposed reason=${reason} sid=${owner.id}`);" },
  // N1 — HR orphan-specific. The orphan branch (cur null) is swept at BOTH sites; this two-part
  // mutant forces keepGhosts on BOTH so a stray orphan is never disposed (suppressing only one
  // leaves the other sweeping it). The owned branch is unchanged — keepGhosts is already true
  // there — so this reddens ONLY the orphan cell HR (the coarse whole-block hard-reset mutant #13
  // also reddens HR, but not orphan-specifically).
  { name: 'swipe6e HR: the recovery keeps ghosts on the ORPHAN branch too (both sweep sites forced keepGhosts), stranding a stray orphan (-> HR test)',
    from: '        resetSwipeStyles(cur ? true : undefined);',
    to:   '        resetSwipeStyles(true);',
    also: {
      from: "        applyScreen(currentDesc(), { render: false, resetScroll: cur ? false : undefined, keepGhosts: cur ? true : undefined });",
      to:   "        applyScreen(currentDesc(), { render: cur ? (cur.live && cur.finPlan.abortRender === 'rerender') : false, resetScroll: cur ? false : undefined, keepGhosts: true });",
    } },
  // ── SWIPE stage 6f: outgoing app-ghost for in-flow→overlay — SUPERSEDED by Stage 1 ──
  // (PLAN-swipe-declone.md §5.1, 2026-07-30). Stage 6f's own rule ("ghost every in-flow
  // source going to a non-home destination") is exactly what Stage 1 narrows away: only
  // browse->browse still ghosts, because every view is already its own position:fixed
  // inset own-scroll box and the ghost bought nothing for the others (the 7px gap, the
  // 53px patch, and the reported swipe-start reflow were the id-stripped clone's cost of
  // it). test/swipe-stage6f.test.js (SIbrowse/SIhome/GHOST/MODEL/REVEAL) is DELETED, not
  // migrated — its cells assert the opposite of Stage 1's rule. This entry is repurposed
  // as Stage 1's own NOGHOSTINFLOW mutant (plan §14): reverting the narrowed condition
  // back to the wider one re-opens exactly the hole Stage 1 closes.
  { name: 'stage1 NOGHOSTINFLOW: constructionPlanFor outgoing reverts to the wider pre-declone rule, ghosting every in-flow source to a non-home destination (-> NOGHOSTINFLOW test)',
    file: 'js/swipe.js',
    from: "    const outgoing = 'real-source';",
    to: [
      "    const outgoing = c.fromKind === 'overlay' ? 'real-source'",
      "      : (c.toKind === 'home' ? 'real-source' : 'app-ghost');",
    ].join('\n') },
  // Stage 1's other cell, HOMESTAYSLIVE (plan §14): mutant-a re-parks #home INSIDE the
  // mid-drag render (showAppView's browse branch) again — the exact premature park this
  // stage removes (plan §9 ordering requirement 2) — which reddens the mid-drag
  // "never parked while live" assertion. mutant-b (the finalize commit path no longer
  // parking #home) is the EXISTING "stage6i ABORT" mutation below (nav.js's
  // `setView`), which already forces #home to never park at all and so also reddens
  // HOMESTAYSLIVE's post-commit assertion — one mutation, two designated killers.
  { name: 'stage1 HOMESTAYSLIVE-a: showAppView re-parks #home inside the mid-drag render, before the gesture commits (-> HOMESTAYSLIVE mid-drag test)',
    file: 'js/app.js',
    from: "      else { $('browse').classList.remove('hidden'); if (render) Browse.render(desc); }",
    to:   "      else { $('browse').classList.remove('hidden'); $('home').classList.add('parked'); if (render) Browse.render(desc); }" },
  // REVEAL's dedicated mutant (stage 6f, plan §9) is DE-REGISTERED, not repurposed: it
  // widened the abort-hold condition to fire on every abort, not just a browse->browse
  // rerender, and its designated killer was test/swipe-stage6f.test.js's REVEAL test
  // (browse→overlay), deleted above. The anchor text (js/app.js's
  // `if (!commit && cur.finPlan.abortRender === 'rerender')`) is UNCHANGED by Stage 1 —
  // finalization is out of this stage's scope — so the underlying guard (a non-browse-
  // browse abort must never enter the paint-gated hold path) is UNDEFENDED by any
  // registered mutation until either a new designated test is authored or Stage 2 deletes
  // the branch outright (it collapses to a constant when abortRender itself retires,
  // plan §12 item 8). Flagged as a residual, not silently dropped.
  // ── SWIPE stage 6h: commit→home scroll-settle cover-drop gate — RETIRED (Stage 6i,
  // PLAN-swipe-noswap-home.md §5/§7/§12): →home was the gate's only consumer, and a
  // fixed, never-reflowing #home no longer causes the scroll-collapse snap the gate
  // existed to wait out. holdGhostUntilPaintable reverted to its pre-6h form
  // (decoded && painted, no opts/scrollSettle/SETTLE_MS/SETTLE_SCROLL_MIN); the seven
  // GATE/BACKSTOP/STRAND/ONCE/SCOPE/OWN/FASTPATH mutations that defended the deleted
  // machinery are removed with it (their designated tests, test/swipe-stage6h.test.js,
  // are deleted in the same build — no guard is left undefended, the mechanism itself
  // is gone).
  // ── SWIPE stage 6i: fixed own-scroll #home slide-and-leave (PLAN-swipe-noswap-home.md) ─
  // CONTRACT-VALUE mutant, caught by the INDEPENDENT ORACLE (test/swipe-transition.test.js), NOT
  // by the SNAPSHOTGONE integration cell. Reverting constructionPlanFor's →home VALUES to the
  // retired home-snapshot domain is a pure contract change: buildConstruction branches on
  // `plan.renderDestination` and never reads `plan.incoming`, and both 'none' and 'home-host'
  // hit the same borrowed-real else-branch (the un-park is driven by `destinationHost==='home'`,
  // not by plan.renderDestination), so this mutation is RUNTIME-INERT and leaves SNAPSHOTGONE
  // green — the behavioral SNAPSHOTGONE guard is the SEPARATE `stage6i home-host` mutant below.
  // What this mutant proves is that the three-layer oracle (EC §4.14) catches the frozen
  // →home contract value drifting out of its domain: swipe-transition reconciles production
  // constructionPlanFor against the hand-written spec rows, so the value revert reddens there.
  { name: 'stage6i CONTRACT: constructionPlanFor →home values revert to the retired home-snapshot domain (-> swipe-transition oracle, NOT SNAPSHOTGONE)',
    file: 'js/swipe.js',
    from: "    else if (c.toKind === 'home') { incoming = 'real-destination'; renderDestination = 'home-host'; }",
    to:   "    else if (c.toKind === 'home') { incoming = 'home-snapshot'; renderDestination = 'none'; }" },
  { name: 'stage6i home-host: the seam renderDestination branch never un-parks the real #home (-> SNAPSHOTGONE test)',
    from: "          if (host === 'home') { $('home').classList.remove('parked'); return $('home'); }",
    to:   "          if (host === 'home') { return $('home'); }" },
  { name: 'stage6i SCOPE: the commit→home held-reveal branch is reinstated (-> SCOPE no-hold-timer test)',
    from: [
      "        mark('finalize');",
      '        // Stage 6i (PLAN-swipe-noswap-home.md §5/§12): the commit→home held-reveal branch',
    ].join('\n'),
    to: [
      "        mark('finalize');",
      "        if (commit && dest.v === 'home') {",
      "          applyScreen(dest, { render: false, keepGhosts: true });",
      "          revealPending = true;",
      "          holdGhostUntilPaintable($('home'), cover);",
      '          return;',
      '        }',
      '        // Stage 6i (PLAN-swipe-noswap-home.md §5/§12): the commit→home held-reveal branch',
    ].join('\n') },
  { name: 'stage6i ABORT: setView stops re-parking #home when the target view is not home (-> ABORT parked-after test; also DP.browse-home; also stage1 HOMESTAYSLIVE post-commit test — Stage 1, PLAN-swipe-declone.md, relies on this SAME toggle to park #home at commit, since showAppView no longer parks it mid-drag)',
    file: 'js/nav.js',
    from: "    $('home').classList.toggle('parked', v !== 'home');   // parked = off-screen but PAINTED (covers stay decoded)",
    to:   "    $('home').classList.toggle('parked', false);   // mutated: #home never re-parks" },
  // Both the arm gate (touchstart) AND the disarm gate (touchmove) read #home.scrollTop
  // (Stage 6i, PLAN-swipe-noswap-home.md §9 L1) — defence in depth, same shape as the
  // "inline-style clearing removed, BOTH sites" mutation above. Reverting only the
  // touchstart gate is UNCAUGHT: the still-correct touchmove gate disarms the pull on the
  // very first move regardless, so #ptr never changes and the PTR assertion still passes.
  { name: 'stage6i PTR: pull-to-refresh reverts to reading window.scrollY instead of #home.scrollTop, BOTH the arm and disarm gates (-> PTR does-not-arm test)',
    from: "      if (refreshing || (hs && hs.v && hs.v !== 'home') || $('home').classList.contains('parked') || $('home').scrollTop > 0\n        || e.target.closest('#player, .navbar, .alphaindex, input')) { y0 = null; return; }",
    to:   "      if (refreshing || (hs && hs.v && hs.v !== 'home') || $('home').classList.contains('parked') || window.scrollY > 0\n        || e.target.closest('#player, .navbar, .alphaindex, input')) { y0 = null; return; }",
    also: {
      from: "      if ($('home').scrollTop > 0) { y0 = null; if (pulling) setPtr(0); pulling = false; return; }",
      to:   "      if (window.scrollY > 0) { y0 = null; if (pulling) setPtr(0); pulling = false; return; }",
    } },
  { name: 'stage6i SCROLLBAR: surfaceKind stops recognising the fixed own-scroll #home (-> SCROLLBAR supported-surface test)',
    file: 'js/scrollbar.js',
    from: "    if (t && t.id === 'home') return 'home';",
    to:   "    if (false && t && t.id === 'home') return 'home';" },
  // stage6i GHOSTSCROLL (HOME source) is DE-REGISTERED, not re-anchored: Stage 1
  // (PLAN-swipe-declone.md §5.1) narrows the ghost-building case to browse->browse alone,
  // so `ghostApp` can never be reached with a HOME source again — the branch this mutant
  // targeted is deleted from js/swipe.js along with the retired `fromKind` parameter, and
  // its designated test (test/swipe-stage6i.test.js's home-source GHOSTSCROLL) is deleted
  // with it (not migrated — there is no home-source ghost left to assert on). The
  // browse-source form survives as the entry below.
  { name: 'stage6i HOMEFIXED: the active #home rule drops position:fixed/overflow-y (-> HOMEFIXED source-text test)',
    file: 'css/app.css',
    from: '#home {\n  position: fixed; left: 0; right: 0;',
    to:   '#home {\n  left: 0; right: 0;' },
  // ── browse-decouple (PLAN-browse-decouple.md, §11 Coverage Model) ────────────────
  // Active #browse becomes a position:fixed+overflow-y:auto own-scroll view (NO
  // will-change), the six window-scroll consumers re-home to #browse.scrollTop, the
  // .266 stable-height probe (the three clamp-probe mutations above it) is retired, and
  // the abort ghost excludes .alphaindex. Each mutation names the browse-decouple.test.js
  // cell it reddens.
  { name: 'browse-decouple BROWSEFIXED: will-change is added to the #browse rule (would re-parent the fixed .alphaindex) (-> BROWSEFIXED source-text test)',
    file: 'css/app.css',
    from: '#browse {\n  position: fixed; left: 0; right: 0;',
    to:   '#browse {\n  position: fixed; left: 0; right: 0;\n  will-change: transform;' },
  { name: 'browse-decouple SCROLLBAR: surfaceKind stops recognising the fixed own-scroll #browse (-> SCROLLBAR supported-surface test)',
    file: 'js/scrollbar.js',
    from: "    if (t && t.id === 'browse') return 'browse';",
    to:   "    if (false && t && t.id === 'browse') return 'browse';" },
  // RE-ANCHORED (Stage 1, PLAN-swipe-declone.md §5.1): `ghostApp` is now reachable ONLY
  // with a browse source (the HOME branch and the `fromKind` parameter are retired — see
  // the de-registered stage6i GHOSTSCROLL note above), so the ternary collapses to one
  // line. Same mutation intent (a browse source reverts to reading window.scrollY),
  // simpler anchor.
  // DE-REGISTERED (PLAN-swipe-declone.md Stage 2): ghostApp is deleted (§12 item 1). The real outgoing element HAS its scrollTop, so no offset is
  // read, baked or capturable — the jump-to-top coordinate does not exist.
  // DE-REGISTERED (PLAN-swipe-declone.md Stage 2): the clone is deleted, so there is no copy to exclude the strip from. The REAL strip rides with
  // its own transformed page inside the rectangle browse->home already produces (plan §5.4, device row R3).
  { name: 'browse-decouple REALIZE: the virtual-list scroll listener reverts to window (bubble phase), never seeing a #browse own-scroll (-> REALIZE listener test)',
    file: 'js/virtuallist.js',
    from: "  if (typeof document !== 'undefined') document.addEventListener('scroll', onDocScroll, { capture: true, passive: true });",
    to:   "  if (typeof window !== 'undefined') window.addEventListener('scroll', onDocScroll, { passive: true });" },
  { name: 'browse-decouple METRICS: browse.js virtualView stops injecting #browse-relative metrics/scrollTo (-> METRICS injected-metrics test)',
    file: 'js/browse.js',
    from: "      metrics: {\n        scrollY: () => m.scrollTop,\n        viewportH: () => m.clientHeight,\n        listTop: () => m.scrollTop + list.getBoundingClientRect().top - m.getBoundingClientRect().top,\n      },\n      scrollTo: (y) => { m.scrollTop = y; },",
    to:   "      /* mutated: no page-relative metrics/scrollTo injected — falls to the window default */" },
  { name: 'browse-decouple RESTORE (re-anchored): applyScrollY reverts to window.scrollTo instead of writing the PAGE scrollTop (-> ENTRYNOZERO derived-write half + the virtual anchor cell)',
    file: 'js/browse.js',
    from: "    page.scrollTop = clampY(y, page.scrollHeight, page.clientHeight);",
    to:   "    window.scrollTo(0, clampY(y, page.scrollHeight, page.clientHeight));   // mutated: window, not the page's own scrollTop" },
  // RE-ANCHORED AT Stage A1b (PLAN-one-screen-type.md §5.3): the enclosing `if (!npOpen) {` block
  // this sits inside is deleted, so the inner block de-indents from eight spaces to six. Text and
  // intent unchanged.
  { name: 'browse-decouple PINGONE: the retired .266 stable-height pin is reintroduced on →home (-> PINGONE stays-empty test)',
    file: 'js/nav.js',
    from: "      if (d.browseWillHide) d.browseWillHide();\n    }",
    to:   "      if (d.browseWillHide) d.browseWillHide();\n      const appEl = document.querySelector('.app');\n      if (appEl) appEl.style.minHeight = appEl.scrollHeight + 'px';\n    }" },

  // ── PLAN-home-shift-fix.md §7.1 — the home→books SCROLL SHIFT campaign (M1/M2).
  // EVERY anchor below carries disambiguating context FROM THE START, because six of six
  // anchors inspected in this campaign were non-unique: in this repo an anchor is assumed
  // non-unique until the tool proves otherwise (§7.3), so surrounding context is the DEFAULT
  // form for a new entry rather than a fallback for the cases someone notices.
  //
  // M1PARKRANGE carries THREE mutants because the cell asserts an ABSENCE (`top`), a PRESENCE
  // (`overflow`) and an exact VALUE (`hidden`, not `clip`), and no single mutant exercises all
  // three. -b and -c differ ONLY in their `to` and are deliberately SEPARATE entries: the two
  // reds they must produce are textually different messages (absent vs wrong-value), and a
  // combined entry could be killed by the wrong one.
  { name: 'M1PARKRANGE-a: #home.parked re-adds the vestigial top: 0, making the parked box taller than the active box by safe+51px so the browser clamps scrollTop at every park (-> M1PARKRANGE park-recipe test)',
    file: 'css/app.css',
    from: '  max-width: 640px; margin: 0 auto; padding-left: 16px; padding-right: 16px;   /* MATCH .app content width */',
    to:   '  max-width: 640px; margin: 0 auto; padding-left: 16px; padding-right: 16px;   /* MATCH .app content width */\n  top: 0;' },
  // ⚠️ -b/-c's anchor WITHOUT the `will-change: transform;` tail occurs TWICE — the first
  // occurrence is `.browsepage.parked` (css:90), a DIFFERENT element this plan does not touch,
  // so a bare anchor would mutate a rule no cell watches and print `caught` over a mutant
  // M1PARKRANGE never saw. The tail is what makes it unique to `#home.parked` (css:102).
  { name: 'M1PARKRANGE-b: #home.parked DELETES the required overflow: hidden — cross-engine the parked box stops being a scroll container, and in Blink a transformed box without it stops participating in scroll anchoring (measured -80px reveal jump vs shipped 0px) (-> M1PARKRANGE Tier-0 ABSENT red)',
    file: 'css/app.css',
    from: '  overflow: hidden; pointer-events: none; z-index: 0; will-change: transform;',
    to:   '  pointer-events: none; z-index: 0; will-change: transform;' },
  { name: 'M1PARKRANGE-c: #home.parked REPLACES overflow: hidden with overflow: clip, executed to break the fix twice over (the in-park offset collapses to 0 AND the reveal jumps -80px again) (-> M1PARKRANGE Tier-0 WRONG-VALUE red, which must be textually distinct from -b)',
    file: 'css/app.css',
    from: '  overflow: hidden; pointer-events: none; z-index: 0; will-change: transform;',
    to:   '  overflow: clip; pointer-events: none; z-index: 0; will-change: transform;' },
  // ADDITIVE: a second textual writer of #home.scrollTop appears. Injected into the nav
  // NON-home branch, which the abort fixtures never reach (that branch runs only when
  // desc.v !== 'home'), so this reddens the inventory gate ALONE — no behaviour cell can
  // claim it and the attribution stays single-celled.
  { name: 'M1WRITERSET: a SECOND textual writer of #home.scrollTop is injected into the nav non-home branch (-> M1WRITERSET unregistered-derived-site red)',
    file: 'js/nav.js',
    from: '      if (resetScroll) $(desc.v).scrollTop = 0;',
    to:   "      if (resetScroll) $(desc.v).scrollTop = 0;\n      if (resetScroll) $('home').scrollTop = 0;   /* mutated: a second #home writer */",
    // NOT "benign" in the two-part sense — this flag is the registry's only way to declare
    // "expected to survive the sweep", and the reason here is structural rather than
    // behavioural: the ONLY cell that can catch a second textual writer is
    // test/scroll-writer-set.test.js, which is a SOURCE_TEXT_GATE excluded from the sweep
    // (it pins 14 source lines by text, so it fails by construction under any mutation that
    // edits one — MEASURED as a false `killed by` on #93). Its ability to fail is carried by
    // the SELFTEST inside that file plus the manual proof recorded in
    // Claude/Curie/RED-home-shift-fix.md. If a BEHAVIOUR test ever starts catching this, the
    // sweep reports STALE FLAG and this excuse must be re-derived, which is the property that
    // stops the flag outliving its reason.
    benignAlone: 'its only killing cell (scroll-writer-set.test.js) is a SOURCE_TEXT_GATE excluded from the sweep; proven able to fail by that file\'s SELFTEST and by the manual apply recorded in Claude/Curie/RED-home-shift-fix.md' },
  // ⚠️ The bare substring `resetScroll: false` occurs FIVE times in js/app.js, and the FIRST
  // (app.js:1201, the HELD abort path) is a path the M1NOWRITE fixture never enters —
  // abortRender is 'none' for home→browse, so control reaches the no-hold branch. The unique
  // `render: cur.finPlan.abortRender === 'rerender', ` prefix is what pins app.js:1227.
  { name: "M1NOWRITE: the abort finalize passes resetScroll: true, so nav.js's home branch writes 0 over the offset the park preserved (-> M1NOWRITE zero-writes-in-window-B red)",
    from: "          applyScreen(dest, { render: false, resetScroll: false });",
    to:   "          applyScreen(dest, { render: false, resetScroll: true });" },
  // ADDITIVE DESIGN-REVERT: the retired restore has no shipped text, so a fabricated `from`
  // would be refused by both the applier and the anchors gate. Both halves anchor on real text
  // and the edit genuinely changes it.
  // RE-DERIVED (Stage 1, PLAN-swipe-declone.md §5.1 — the gate the CI shard-2 regression from
  // build cf48e03 traced to): the original mutant restored `cur.ghostY`, which Loki's own
  // strike documented as meaning "an app-ghost was built for this gesture" (`cur.ghostY !=
  // null` <=> `toKind !== 'home'` pre-declone, STRIKE-home-shift-m1-restrike.md I-A). Stage 1
  // narrows app-ghost-building to browse->browse ONLY, so for any `cur.from.v === 'home'`
  // gesture `c.capture` is now ALWAYS null (js/swipe.js constructionPlanFor's
  // `fromKind==='browse' && toKind==='browse'` ternary makes the two conjuncts
  // `cur.from.v==='home'` and `cur.ghostY != null` mutually exclusive BY CONSTRUCTION) — so
  // `d.ghostY` is never set for a home-source gesture (app.js:556-563) and the retired
  // restore's guard is now an unsatisfiable conjunction: the mutant applies cleanly but its
  // injected write can never execute, so CI's mutation-sweep (shard 2, index 98) found it
  // UNCAUGHT — confirmed by control: CAUGHT at 1577a0e (pre-Stage-1), UNCAUGHT from cf48e03
  // onward. The safety property this cell defends (the abort finalize's no-hold branch must
  // write NOTHING to #home.scrollTop, so an external nav's reveal is never clobbered) is
  // unchanged and still real; only the FIELD a reintroduced restore would plausibly reach for
  // has changed. `cur.scroll0` is the one remaining captured-scroll field available on EVERY
  // gesture including home-source (app.js:468, `window.scrollY || 0` at arm time) — restoring
  // it here is the same class of mistake (confusing the window-scroll restore two lines above
  // for a signal that #home also needs restoring), and it is a genuine write the oracle
  // catches regardless of value (§7.2: "no NON-ZERO write" would be a weaker, wrong oracle;
  // this project's own doctrine already rejects it).
  { name: 'M1NAVWINS: a re-introduced restore writes the captured window scroll (cur.scroll0) onto #home.scrollTop after the abort finalize, clobbering an interleaved Home tap 340ms later (-> M1NAVWINS window-B red AND M1NOWRITE — BOTH must redden; if only one does, the other is MASKED and that is a finding, not a caught)',
    from: "          applyScreen(dest, { render: false, resetScroll: false });\n          window.scrollTo(0, cur.scroll0);",
    to:   "          applyScreen(dest, { render: false, resetScroll: false });\n          window.scrollTo(0, cur.scroll0);\n          if (cur.from.v === 'home') $('home').scrollTop = cur.scroll0;   /* mutated: the retired restore, re-derived */" },
  // MUTUNIQ carries TWO mutants for the same reason M1PARKRANGE carries three: one mutant
  // cannot exercise both a REFUSAL and a correct-site APPLICATION. -a is the plan's declared
  // mutant; -b is added by the test author because the cell's own specification includes "and
  // that it then applies to the intended occurrence only", which -a does not exercise at all.
  // NOTE -a's other killer (the resolveAnchor fixture test) lives in mutation-anchors.test.js,
  // which is a SOURCE_TEXT_GATE excluded from the sweep — so test/mutation-applier.test.js is
  // what makes -a sweepable at all.
  { name: 'MUTUNIQ-a: the anchor uniqueness check is disabled, so a non-unique `from` is silently applied to the FIRST occurrence and a cell is credited with a site it never reached (-> MUTUNIQ applier-refusal test)',
    file: 'tools/mutate.mjs', from: MUTUNIQ_GUARD_FROM, to: MUTUNIQ_GUARD_TO },
  { name: 'MUTUNIQ-b: the applier reverts to first-occurrence src.replace, so a DISAMBIGUATED entry mutates the wrong site while every registration-time check stays green (-> MUTUNIQ intended-occurrence test)',
    file: 'tools/mutate.mjs', from: MUTUNIQ_APPLY_FROM, to: MUTUNIQ_APPLY_TO },
  // M2ALIGN's `from` is the POST-FIX line, so it could not be registered until the M2 fix
  // itself landed (registering it against the pre-fix `46px` line would either rot the
  // anchors gate or be refused as a no-op). One occurrence in js/swipe.js.
  // PLAN-swipe-declone.md Stage 1 deleted this cell's original designated killer,
  // test/ghost-clone-geometry.test.js, along with the retired HOME-source path it drove
  // (plan §12 item 16) — but the `53px` constant this mutation targets stays load-bearing
  // for the still-live browse->browse ghost until Stage 2 (plan §12 item 5), so the
  // mutation was left with no killer. test/ghost-clone-alignment.test.js restores a
  // browse->browse-scoped guard for the interim; DELETE both it and this entry together
  // with the constant in Stage 2 (plan §12 items 5, 16, 17).
  // DE-REGISTERED (PLAN-swipe-declone.md Stage 2): the 53px clone-alignment constant is deleted with ghostApp (§12 item 5) — it existed ONLY to
  // undo the clone id-stripping, and the real view keeps its own fixed-inset content-top.

  // ── PLAN-one-screen-type.md §14 — ONE SCREEN TYPE (Options and its subs become peers).
  //
  // ⚠️ ONLY THREE OF THIS PLAN'S NINE MUTANTS ARE REGISTERED HERE, and the reason is mechanical,
  // not a deferral: six of them anchor on text STAGE A1 CREATES. Registering a `from` that does
  // not occur at HEAD reddens test/mutation-anchors.test.js with ANCHOR NOT FOUND, and the three
  // "restore the old rule" mutants (ONEPAGE, PEERPARK-a, PEERFINALIZE-a) plus NOSETTINGSBG-a
  // would be NO-OPS at HEAD, which the no-op gate in that same file refuses. The other six are
  // specified verbatim, with their expected killing cells, in Claude/Curie/RED-one-screen-type.md
  // for registration in the A1 build commit — the same build-time registration the browse-decouple
  // campaign used, for the same reason.
  //
  // Every anchor below carries disambiguating context FROM THE START: in this repo an anchor is
  // assumed non-unique until the tool proves otherwise (PLAN-home-shift-fix.md §7.3 — six of six
  // inspected were non-unique).

  // Shared by PEERPARK and PEERFINALIZE (the plan's §14 "-b" mutant for both cells): hide #browse
  // BEFORE the anchor capture instead of after it. The trailing `browseEl.classList.toggle` then
  // re-applies the same value, so the ONLY observable change is that d.browseWillHide() now runs
  // against a display:none box, which measures zero — exactly the defect the ordering exists to
  // prevent. Registered at HEAD because the two lines it sits between are UNCHANGED by A1 (only
  // the enclosing guard on js/nav.js:56 narrows), so this anchor does not rot at the build.
  // At HEAD its live killer is test/nav.test.js's 'leaving Browse for Home deactivates the Browse
  // controller BEFORE hiding it' (the same invariant on the home edge); once A1 unskips them,
  // PEERPARK and PEERFINALIZE kill it on the three settings edges too.
  // RE-ANCHORED AT A1b: the enclosing `if (!npOpen) {` block is deleted, so this inner block
  // de-indents from eight spaces to six (plan §12 items 25/26; Claude/Curie/RED-one-screen-type-
  // a1b.md §4 casualty note). Text and intent unchanged.
  { name: 'one-screen-type PEERPARK/PEERFINALIZE-b: #browse is hidden BEFORE the browseWillHide anchor capture, so Browse.deactivate measures a zero-height box (-> PEERPARK + PEERFINALIZE observed-un-hidden assertions; at HEAD, nav.test.js deactivate-before-hide)',
    file: 'js/nav.js',
    from: '      if (d.browseWillHide) d.browseWillHide();\n    }',
    to:   "      browseEl.classList.toggle('hidden', true);   /* mutated: hide BEFORE the capture */\n      if (d.browseWillHide) d.browseWillHide();\n    }" },

  // NOSETTINGSBG's second mutant — the OTHER direction. The cell's painter-set equality must fail
  // when .nowplaying LOSES its background just as surely as when a settings screen regains one;
  // a cell that only fails one way would bless deleting the one screen that must keep painting.
  // The anchor is the .nowplaying-specific comment tail, which distinguishes it from the #options
  // ("so (unlike #home/#browse) it needs its own background") and five-sub ("so they need their
  // own background") copies, and which no stage touches (invariant S4).
  // At HEAD its live killer is this file's own predecessor test, PAGE-BG-SINGLE-PAINTER; A1
  // deletes that test in the same commit that unskips NOSETTINGSBG, so the guard is never
  // undefended for an instant.
  // RE-ANCHORED IN THE A1b BUILD COMMIT: item 37 rewrites the two comment lines above
  // `background: var(--page-bg)` from the retired additive-overlay reason to the co-required-
  // properties reason (plan §12 item 37); the anchor moves with it.
  { name: 'one-screen-type NOSETTINGSBG-b: .nowplaying loses its own --page-bg background, so the one screen that must keep painting stops (-> NOSETTINGSBG painter-set equality; at HEAD, PAGE-BG-SINGLE-PAINTER)',
    file: 'css/app.css',
    from: '     co-required properties that cover the topbar and the transport (DecisionLog). */\n  background: var(--page-bg);',
    to:   '     co-required properties that cover the topbar and the transport (DecisionLog). */' },

  // Registered in the A1 build commit (six were deferred at authoring time — see the block above —
  // because their anchors did not exist, or would have been no-ops, at HEAD). Each carries
  // disambiguating context from the start per this file's own convention.

  // ONEPAGE — commit 6c9e7e3's exact shape: restore the hub-stays-mounted rule after the six-way
  // loop, so the hub is un-hidden whenever a sub is applied.
  // RE-ANCHORED AT A1b: the six-way loop's trailing `\n    }` was the js/nav.js:78 guard's own
  // closing brace, deleted by A1b — that guard has no enclosing brace left to anchor on, so the
  // anchor moves to the loop plus the line that now follows it (the NP hidden toggle).
  { name: 'one-screen-type ONEPAGE: the hub-stays-mounted rule is restored after the six-way loop, so the hub is un-hidden whenever a sub is applied (-> ONEPAGE exactly-one-unhidden assertion)',
    file: 'js/nav.js',
    from: "    for (const s of ['options', ...SETTINGS_SUBS]) $(s).classList.toggle('hidden', v !== s);\n    $('nowplaying').classList.toggle('hidden', !npOpen);",
    to:   "    for (const s of ['options', ...SETTINGS_SUBS]) $(s).classList.toggle('hidden', v !== s);\n    $('options').classList.toggle('hidden', !(v === 'options' || isSub(v)));\n    $('nowplaying').classList.toggle('hidden', !npOpen);" },

  // PEERPARK-a / PEERFINALIZE-a — restore the settings exemption in the park-and-hide block.
  // RE-ANCHORED AT A1b: the block's `if (!npOpen) {` wrapper is deleted, so a settings exemption
  // can no longer be restored by widening one shared guard condition — the park toggle and the
  // browse-hide toggle are now two separate unconditional statements. Guarding both (the `also`
  // half) is what reproduces "parks nothing and hides nothing" on a settings entry.
  { name: 'one-screen-type PEERPARK/PEERFINALIZE-a: the settings exemption is restored in the park guard, so entering a settings screen parks nothing and hides nothing (-> PEERPARK + PEERFINALIZE class assertions)',
    file: 'js/nav.js',
    from: "    $('home').classList.toggle('parked', v !== 'home');   // parked = off-screen but PAINTED (covers stay decoded)",
    to:   "    if (v !== 'options' && !isSub(v)) $('home').classList.toggle('parked', v !== 'home');   // parked = off-screen but PAINTED (covers stay decoded)",
    also: {
      from: "    browseEl.classList.toggle('hidden', v !== 'browse');",
      to:   "    if (v !== 'options' && !isSub(v)) browseEl.classList.toggle('hidden', v !== 'browse');",
    } },

  // ── Stage A1b — three mutants for the park/hide block's own coverage cells (plan §14;
  // Claude/Curie/RED-one-screen-type-a1b.md §4). §14's NATURAL-a ("restore the npOpen guard on
  // the park and hide block") is ONE mutant in the plan's coverage matrix; post-A1b that block has
  // no enclosing brace left to re-guard as a unit, so it splits into two statement-level mutants
  // (`a`, `a'`) — three total, not two, and no dimension is added or dropped.
  { name: "one-screen-type NPPARKS-a: the npOpen guard is restored on the park toggle alone, so entering Now Playing no longer parks #home (-> NPPARKS from Home)",
    file: 'js/nav.js',
    from: "    $('home').classList.toggle('parked', v !== 'home');   // parked = off-screen but PAINTED (covers stay decoded)",
    to:   "    if (!npOpen) $('home').classList.toggle('parked', v !== 'home');   // parked = off-screen but PAINTED (covers stay decoded)" },
  { name: "one-screen-type NPPARKS-a': the npOpen guard is restored on the browse-hide toggle alone, so entering Now Playing no longer hides #browse (-> NPPARKS from Browse, NPRECONCILE, PEERFINALIZE edge 3 relocated)",
    file: 'js/nav.js',
    from: "    browseEl.classList.toggle('hidden', v !== 'browse');",
    to:   "    if (!npOpen) browseEl.classList.toggle('hidden', v !== 'browse');" },
  { name: 'one-screen-type NPPARKS-b: the npOpen guard is restored on the six-way settings loop, so entering Now Playing no longer hides the settings screens (-> NPPARKS from a settings screen)',
    file: 'js/nav.js',
    from: "    for (const s of ['options', ...SETTINGS_SUBS]) $(s).classList.toggle('hidden', v !== s);",
    to:   "    if (!npOpen) for (const s of ['options', ...SETTINGS_SUBS]) $(s).classList.toggle('hidden', v !== s);" },

  // NOSETTINGSBG-a — re-add the deleted background to #options, so the painter set regains a
  // third member.
  { name: 'one-screen-type NOSETTINGSBG-a: #options regains a background: var(--page-bg) declaration, so the painter set gains a member (-> NOSETTINGSBG painter-set equality)',
    file: 'css/app.css',
    from: '  overflow-y: auto; -webkit-overflow-scrolling: touch; overscroll-behavior: contain;\n  padding: 14px max(16px, calc((100% - 608px) / 2)) 40px;\n}\n/* When the transport is showing',
    to:   '  overflow-y: auto; -webkit-overflow-scrolling: touch; overscroll-behavior: contain;\n  background: var(--page-bg);\n  padding: 14px max(16px, calc((100% - 608px) / 2)) 40px;\n}\n/* When the transport is showing' },

  // NOSETTINGSBG-a' — the same, on the five-sub group.
  { name: "one-screen-type NOSETTINGSBG-a': the five-sub group regains a background: var(--page-bg) declaration, so the painter set gains a member (-> NOSETTINGSBG painter-set equality)",
    file: 'css/app.css',
    from: '  overflow-y: auto; -webkit-overflow-scrolling: touch; overscroll-behavior: contain;\n  padding: 14px max(16px, calc((100% - 608px) / 2)) 40px;\n}\nbody.has-player #downloads',
    to:   '  overflow-y: auto; -webkit-overflow-scrolling: touch; overscroll-behavior: contain;\n  background: var(--page-bg);\n  padding: 14px max(16px, calc((100% - 608px) / 2)) 40px;\n}\nbody.has-player #downloads' },

  // PEERPARK-c — delete the browseWillHide() call entirely, so the hook never fires on the
  // settings edges (distinct from PEERPARK/PEERFINALIZE-b, which fires it at the wrong TIME).
  // RE-ANCHORED AT A1b: same de-indent as PEERPARK/PEERFINALIZE-b above (eight spaces to six).
  { name: 'one-screen-type PEERPARK-c: the browseWillHide() call is deleted, so the hook never fires on the settings shown->hidden edge (-> PEERPARK + PEERFINALIZE call-count assertions)',
    file: 'js/nav.js',
    from: "      if (d.browseWillHide) d.browseWillHide();\n    }\n    // The `.266` stable-height probe",
    to:   "    }\n    // The `.266` stable-height probe" },

  // NPNAVBAR — the coverage audit's gap G3 (Claude/Mendeleev/AUDIT-one-screen-type-a1b.md).
  // §14's NPUNTOUCHED row has always required "and that the body np-locked navbar rule still
  // raises the navbar above it", and the cell never carried it, so deleting the navbar's
  // `z-index: 70` reddened nothing. This is the ADDITIVE-in-reverse direction of the same
  // preservation guard NOSETTINGSBG-b defends: a deletion of one declaration from a rule that must
  // keep it. The anchor is the whole np-locked navbar declaration list, which is unique in
  // css/app.css (the two neighbouring `body.np-locked .navbar ...` rules are descendant selectors
  // with different bodies).
  { name: 'one-screen-type NPNAVBAR: the np-locked navbar loses its z-index: 70, so the navbar stops stacking above Now Playing (z-index 60) and Now Playing becomes an ordinary screen (-> NPUNTOUCHED navbar-outstacks assertion)',
    file: 'css/app.css',
    from: 'body.np-locked .navbar { background: transparent; border-top: 0; backdrop-filter: none; z-index: 70; padding-bottom: 0; }',
    to:   'body.np-locked .navbar { background: transparent; border-top: 0; backdrop-filter: none; padding-bottom: 0; }' },

  // ── NPUNTOUCHED's three remaining assertions — the coverage audit's note N1
  // (Claude/Mendeleev/AUDIT-one-screen-type-a1b.md). NOSETTINGSBG-b defends the `background`
  // assertion and NPNAVBAR the navbar-outstacks one; `position: fixed`, `inset: 0` and
  // `z-index: 60` had none. NPUNTOUCHED is a PRESERVATION cell — green at HEAD by construction,
  // because every property it asserts must REMAIN true — so a mutant is the only evidence its
  // assertions can fail at all. Each deletes ONE declaration from the shared `.nowplaying`
  // declaration line, which is unique in css/app.css; all three are invisible to every unit cell,
  // since jsdom has no layout and no compositing.
  { name: 'one-screen-type NPFIXED: .nowplaying loses `position: fixed`, so Now Playing stops being its own fixed box (-> NPUNTOUCHED position assertion)',
    file: 'css/app.css',
    from: '  position: fixed; inset: 0; height: 100%; min-height: 100dvh; z-index: 60; overflow-y: auto;',
    to:   '  inset: 0; height: 100%; min-height: 100dvh; z-index: 60; overflow-y: auto;' },
  { name: 'one-screen-type NPINSET: .nowplaying loses `inset: 0`, so it stops stretching to cover the topbar and the transport (-> NPUNTOUCHED inset assertion)',
    file: 'css/app.css',
    from: '  position: fixed; inset: 0; height: 100%; min-height: 100dvh; z-index: 60; overflow-y: auto;',
    to:   '  position: fixed; height: 100%; min-height: 100dvh; z-index: 60; overflow-y: auto;' },
  { name: 'one-screen-type NPZ60: .nowplaying loses `z-index: 60`, so it stops declaring its own stacking and one of the three co-required covering properties is gone (-> NPUNTOUCHED z-index assertion)',
    file: 'css/app.css',
    from: '  position: fixed; inset: 0; height: 100%; min-height: 100dvh; z-index: 60; overflow-y: auto;',
    to:   '  position: fixed; inset: 0; height: 100%; min-height: 100dvh; overflow-y: auto;' },

  // ── NPHIDDENWRITER — the coverage audit's gap G2 (Claude/Mendeleev/AUDIT-one-screen-type-a1b.md).
  // test/np-hidden-writer-set.test.js gates claim C6: `hidden` is added to #nowplaying in exactly
  // ONE place in js/, and the same synchronous setView body un-hides the destination first. C6 is
  // what licenses retiring ratified probe mark §4.2, so the gate is a LOCK (green at HEAD by
  // design) and its ability to fail has to be carried by mutants. All four below are chosen to be
  // BEHAVIOURALLY INERT, so each is attributable to that gate and to nothing else — a mutant that
  // also broke behaviour would be caught by twenty cells and prove nothing about this one.
  { name: "NPHIDDENWRITER-a: a SECOND, redundant `hidden` writer on #nowplaying is injected into setView — behaviourally identical, textually a second writer (-> NPHIDDENWRITER identity group-count direction)",
    file: 'js/nav.js',
    from: "    $('nowplaying').classList.toggle('hidden', !npOpen);\n    document.body.classList.toggle('np-locked', npOpen);",
    to:   "    $('nowplaying').classList.toggle('hidden', !npOpen);\n    $('nowplaying').classList.toggle('hidden', !npOpen);   /* mutated: a second writer */\n    document.body.classList.toggle('np-locked', npOpen);" },
  { name: "NPHIDDENWRITER-b: the #nowplaying ALIAS (js/app.js's npEl) is made to write the hidden class — the route that reaches the element without naming it (-> NPHIDDENWRITER alias closure)",
    file: 'js/app.js',
    from: "    const npEl = $('nowplaying');",
    to:   "    const npEl = $('nowplaying');\n    npEl.classList.add('hidden');   /* mutated: a write through the alias */" },
  { name: "NPHIDDENWRITER-c: showAppView's stale-overlay sweep is WIDENED BY ONE WORD to include nowplaying — the coverage audit's named highest-probability next defect on this surface (-> NPHIDDENWRITER loop-list direction)",
    from: "      for (const s of ['options', ...SETTINGS_SUBS]) if (!d || d.from.v !== s) $(s).classList.add('hidden');",
    to:   "      for (const s of ['options', 'nowplaying', ...SETTINGS_SUBS]) if (!d || d.from.v !== s) $(s).classList.add('hidden');" },
  { name: "NPHIDDENWRITER-d: setView is REORDERED so #nowplaying is hidden BEFORE the destination is un-hidden — the writer count is unchanged and the synchrony half of C6 is broken (-> NPHIDDENWRITER synchrony cell)",
    file: 'js/nav.js',
    from: "    browseEl.classList.toggle('hidden', v !== 'browse');\n    for (const s of ['options', ...SETTINGS_SUBS]) $(s).classList.toggle('hidden', v !== s);\n    $('nowplaying').classList.toggle('hidden', !npOpen);",
    to:   "    $('nowplaying').classList.toggle('hidden', !npOpen);\n    browseEl.classList.toggle('hidden', v !== 'browse');\n    for (const s of ['options', ...SETTINGS_SUBS]) $(s).classList.toggle('hidden', v !== s);" },
  // NPHIDDENWRITER-e — PLAN-one-screen-type.md §13 step 10a. §9 rules edge 5 of its browseWillHide
  // enumeration (a supersession while Now Playing is current) deliberately uncovered, on the
  // ground that edge 5's setView body is BYTE-IDENTICAL to edge 4's. Two source facts make that
  // true: setView takes exactly one parameter, and applyScreen's NP branch passes it the literal
  // 'nowplaying' and nothing else. This mutant breaks BOTH AT ONCE — which is why it is two-part:
  // a second parameter with no caller passing anything is not the defect §9 fears, and an argument
  // passed to a one-parameter function does not parse as a new channel into setView. Together they
  // are the channel. BEHAVIOURALLY INERT: setView never reads the new parameter, so no unit cell
  // can see it.
  //
  // ⚠️ BOTH -e AND -e' KILL TWO CELLS, NOT ONE, and that is disclosed rather than tuned away.
  // Plan §13 step 10a asks for a mutant that reddens the synchrony cell ALONE; MEASURED, each also
  // reddens NPHIDDENWRITER's identity cell, on Direction 1 — registered identity entry #11 is the
  // whole `applyScreen` NP-branch LINE, so a changed argument list makes the derived site match no
  // registered entry and read as a new, unregistered one. That firing is correct and is the
  // identity inventory doing its stated job. ⛔ The repair is NOT to shorten entry #11's registered
  // text so the mutant slips past it: every one of the 13 entries registers a whole line, and
  // re-cutting one to suit a mutant is tuning the baseline to the test. Attribution is established
  // instead by EXECUTION — each mutant's synchrony-cell failure was read and is the step-10a
  // assertion's own message (Claude/Curie/one-screen-type-a1b-tail-test-design-2026-08-04.md).
  { name: "NPHIDDENWRITER-e: setView gains a SECOND PARAMETER and applyScreen's Now Playing branch threads its own opts through it — behaviourally inert, and it destroys the byte-identity on which plan §9 rules edge 5 deliberately uncovered (-> NPHIDDENWRITER synchrony cell, step-10a predicates)",
    file: 'js/nav.js',
    from: "  function setView(v) {   // 'home' | 'browse' | 'options' | a settings sub | 'nowplaying'",
    to:   "  function setView(v, opts) {   // 'home' | 'browse' | 'options' | a settings sub | 'nowplaying'",
    also: {
      from: "    if (desc.v === 'nowplaying') { setView('nowplaying'); if (render) d.renderNowPlaying(); return; }",
      to:   "    if (desc.v === 'nowplaying') { setView('nowplaying', opts); if (render) d.renderNowPlaying(); return; }" } },
  // NPHIDDENWRITER-e' — the SECOND step-10a predicate, on its own. Necessary because `assert`
  // throws on the FIRST failure: under -e the parameter-list assertion fires and the NP-branch
  // argument assertion is never evaluated, so -e alone leaves the second predicate with no
  // evidence it can fail — which is exactly the complaint (note N1) that these mutants exist to
  // answer, one level up. Threading an option to a still-one-parameter function is legal JS and
  // silently ignored, so this half is behaviourally inert on its own.
  { name: "NPHIDDENWRITER-e': applyScreen's Now Playing branch threads its own opts into setView while setView still takes one parameter — the argument half of plan §9's edge-5 byte-identity, alone (-> NPHIDDENWRITER synchrony cell, step-10a NP-branch predicate)",
    file: 'js/nav.js',
    from: "    if (desc.v === 'nowplaying') { setView('nowplaying'); if (render) d.renderNowPlaying(); return; }",
    to:   "    if (desc.v === 'nowplaying') { setView('nowplaying', opts); if (render) d.renderNowPlaying(); return; }" },
  // NPHIDDENWRITER-f — the coverage audit's note N4
  // (Claude/Mendeleev/AUDIT-one-screen-type-a1b-r2.md). `npEl.style.cssText = 'display:none'`
  // ESCAPED the shipped ALIAS_WRITE_SUFFIX, measured by execution, and `style.cssText` is live
  // first-party code (js/debug.js:431, :570, :733). The suffix now carries the route; this mutant
  // is what proves the widened arm bites on real source rather than only in the selftest.
  // Distinct from NPHIDDENWRITER-b, which drives the same alias through `classList.add`.
  { name: "NPHIDDENWRITER-f: the #nowplaying ALIAS (js/app.js's npEl) hides the element through `style.cssText` — the inline-style route that escaped the shipped alias suffix (-> NPHIDDENWRITER alias closure)",
    file: 'js/app.js',
    from: "    const npEl = $('nowplaying');",
    to:   "    const npEl = $('nowplaying');\n    npEl.style.cssText = 'display:none';   /* mutated: an inline-style write through the alias */" },

  // ── PLAN-one-screen-type.md §14 — the FILMSTRIPDRAG cell (Stage A1-fix / A1-fix-r2, plan §5.4).
  //
  // FILMSTRIPDRAG-a and FILMSTRIPDRAG-b were registered at step 6b — the build that introduced the
  // live-gesture condition they anchor on. They could not be registered earlier (step 6a): a `from`
  // that does not occur reddens test/mutation-anchors.test.js with ANCHOR NOT FOUND, and at step 6a
  // neither js/nav.js's `d.gestureLive()` guard nor js/app.js's `gestureLive` predicate existed yet.
  // Both were specified verbatim, with their expected killing cells, in
  // Claude/Curie/RED-one-screen-type-filmstrip.md — the same build-time registration Stage A1 used
  // for six of its nine, for the same reason:
  //   NATURAL-a  remove the live-gesture condition from the reconcile, so the pending finish runs
  //              during the drag.  -> FILMSTRIPDRAG live-drag cell (the not-hidden assertion)
  //   NATURAL-b  make the condition test ARMED rather than LIVE, so a gesture that arms without
  //              locking suppresses the reconcile and strands the filmstrip mid-transform.
  //              -> FILMSTRIPDRAG arm-vs-live trap cell (the cleared-transform assertion)
  //
  // The design shipped at step 6b was the RECOMMENDED predicate form (plan §5.4 U11), not the
  // admissible cancel form: js/nav.js's overlayFilmstrip reconcile calls an injected predicate,
  // wired in js/app.js to a small function returned by bindSwipeBack() that read the same
  // module-scoped gesture-session variable `d` (app.js) that `start()` sets `.live = true` on. That
  // predicate keyed suppression to DRAG LIVENESS rather than to the lifetime of the resource it was
  // protecting — the gesture SESSION's ownership of the movers — and an adversarial strike KILLED it
  // (Claude/Loki/STRIKE-one-screen-type.md): `d` is nulled at end() while `session` still owns and
  // animates the movers through the whole settle/finalize phase, so a pending reconcile firing in
  // that gap ran unsuppressed. Step r2b (plan §13 step 6e) REPLACES the predicate with the
  // session-ownership form (`!!session && session.live`, plan §5.4) and RENAMES it — and its
  // injected dep — from `gestureLive` to `gestureOwnsMovers` (plan §5.4, "naming goes with it"),
  // per Claude/Curie/RED-one-screen-type-settle.md §7:
  //   NATURAL-c  restore the shipped .282 DRAG-LIVENESS form, so suppression again ends at
  //              finger-up instead of at finalize/reveal-drop.
  //              -> FILMSTRIPDRAG settle-window cell (the not-hidden/transform + no-flip assertions)
  // The rename rots both existing anchors — they anchor on `gestureLive` text the repair replaces —
  // so FILMSTRIPDRAG-a and FILMSTRIPDRAG-b are RE-TRANSCRIBED below, not merely left in place, and
  // NATURAL-c is a new entry. NATURAL-a still mutates js/nav.js's reconcile (removes the guard);
  // NATURAL-b and NATURAL-c both mutate js/app.js's `gestureOwnsMovers` predicate itself, to the two
  // wrong forms the plan's boundary table names (§5.4 boundary table: `!!session` alone traps the
  // armed phase; `!!d && d.live` reopens the settle-window gap) — one condition at one site, per the
  // plan's design.
  //
  // Also registered here (unrelated NATURAL) is the mutant below, which proves the trap cell can fail TODAY
  // rather than only after the build. The trap cell is a PRESERVATION cell — green at HEAD by
  // construction, because it asserts what must NOT change — so without a registered mutant its
  // ability to fail rests on nothing.
  //
  // The 340ms net is the ONLY scheduler that reaches `finish` in jsdom (no transitionend fires
  // there), so deleting it means the reconcile never runs at all: the outgoing pane keeps its
  // inline translateX and the sub-screen stays un-hidden beside the hub. That is exactly the
  // end-state the trap cell asserts against, reached by losing the net rather than by suppressing
  // it too early — the same defect from the other side, and a real hazard in its own right (the
  // net exists because a transitionend can be missed). The anchor is naturally unique in
  // js/nav.js and the A1-fix touches the reconcile, not the scheduling line, so it does not rot
  // at the build.
  { name: 'one-screen-type FILMSTRIPDRAG: overlayFilmstrip loses its 340ms reconcile safety net, so a missed transitionend leaves the filmstrip un-reconciled — the outgoing pane keeps its inline transform and the sub-screen stays un-hidden (-> FILMSTRIPDRAG arm-vs-live trap cell)',
    file: 'js/nav.js',
    from: '    setTimeout(finish, 340);                                      // safety net',
    to:   '    /* mutated: the 340ms reconcile safety net is deleted */' },

  // FILMSTRIPDRAG-a (plan §14 NATURAL-a) — restore the shipped-at-A1 reconcile: no live-gesture
  // guard, so the pending finish runs unconditionally and hides the INCOMING MOVER mid-drag. Anchor
  // is naturally unique: overlayFilmstrip is the only site that builds a `reconcile` closure.
  // Re-transcribed at step r2b: the injected dep is renamed from `gestureLive` to
  // `gestureOwnsMovers` along with the predicate it reads (plan §5.4, "naming goes with it").
  { name: 'one-screen-type FILMSTRIPDRAG-a: overlayFilmstrip\'s reconcile loses its live-gesture guard, so the pending finish runs unconditionally and hides the INCOMING MOVER in the middle of a live drag (-> FILMSTRIPDRAG live-drag cell, the not-hidden/transform assertions)',
    file: 'js/nav.js',
    from: '    const reconcile = () => {\n      if (d.gestureOwnsMovers && d.gestureOwnsMovers()) return;   // the gesture session still owns these movers; its own finalize will reconcile them\n      applyScreen(d.currentDesc(), { render: false });\n    };',
    to:   '    const reconcile = () => applyScreen(d.currentDesc(), { render: false });' },

  // FILMSTRIPDRAG-b (plan §14 NATURAL-b) — the trap. Widen the predicate to test ARMED (a session
  // exists) rather than LIVE (the session has gone live), so an armed-but-not-locked gesture also
  // suppresses the pending reconcile. Its own end() then releases through the `if (!cur.live)`
  // return WITHOUT ever calling applyScreen, so nothing is left to discharge the filmstrip's
  // reconciliation duty and it is stranded mid-transform. Anchor is naturally unique:
  // `gestureOwnsMovers` is defined at exactly one place in js/app.js. Re-transcribed at step r2b
  // against the repaired predicate (plan §5.4/§5.4a): the anchor is now the session-ownership form,
  // and the ARMED-vs-LIVE widening this mutant tests is expressed on `session` rather than on `d`.
  { name: 'one-screen-type FILMSTRIPDRAG-b: the gestureOwnsMovers predicate tests ARMED (a session exists) rather than LIVE (the session has gone live), so an armed-but-not-locked gesture also suppresses the pending reconcile, and that gesture releases without ever calling applyScreen — stranding the filmstrip mid-transform (-> FILMSTRIPDRAG arm-vs-live trap cell, the cleared-transform and re-hidden-sub assertions)',
    file: 'js/app.js',
    from: '    const gestureOwnsMovers = () => !!session && session.live;',
    to:   '    const gestureOwnsMovers = () => !!session;   /* mutated: armed counts as live */' },

  // FILMSTRIPDRAG-c (plan §14 NATURAL-c, registered at step r2b per
  // Claude/Curie/RED-one-screen-type-settle.md §7) — restore the shipped .282 DRAG-LIVENESS form of
  // the predicate, so the guard reads the nulled drag handle instead of the session. `d` is nulled
  // at end() while `session` still owns and animates the movers through the settle/finalize phase
  // (Claude/Loki/STRIKE-one-screen-type.md, KILL), so this mutant reopens exactly that gap: a
  // pending reconcile that fires after finger-up but before finalize is not suppressed, and runs
  // applyScreen against the pre-commit descriptor — hiding the committed incoming mover mid-snap and
  // wiping both settle transforms. Anchor is naturally unique: `gestureOwnsMovers` is defined at
  // exactly one place in js/app.js (the same anchor FILMSTRIPDRAG-b re-transcribes to, mutated here
  // to a different wrong form).
  { name: 'one-screen-type FILMSTRIPDRAG-c: the gestureOwnsMovers predicate is restored to the shipped .282 DRAG-LIVENESS form, so it guards the drag handle\'s lifetime instead of the session\'s, and a pending reconcile that fires after finger-up but before finalize is not suppressed — the committed incoming mover is hidden mid-snap and both settle transforms are wiped (-> FILMSTRIPDRAG settle-window cell)',
    file: 'js/app.js',
    from: '    const gestureOwnsMovers = () => !!session && session.live;',
    to:   '    const gestureOwnsMovers = () => !!d && d.live;   /* mutated: guards the DRAG HANDLE\'s lifetime, not the SESSION\'s */' },

  // ── PLAN-swipe-declone.md STAGE 2 (the browse->browse de-clone) ──────────────────────
  // The twenty-four mutants Claude/Curie/RED-swipe-declone-stage2.md §3 specifies. NONE of
  // them could be registered before the build: every anchor targets text this stage CREATES,
  // and test/mutation-anchors.test.js fails with ANCHOR NOT FOUND on an anchor whose `from`
  // does not occur. They land in the SAME commit as the build, which is why the anchors gate
  // is green on both sides of it.
  //
  // The killer named in each entry is the DESIGNATED cell — a sweep result of merely CAUGHT
  // is not closure, because an unrelated test catching a mutant leaves the designated
  // assertion unproven.

  // ── PAGEISVIEW — the page is the scroller, the host is not (css structural) ──
  { name: 'S2-1 PAGEISVIEW: the .browsepage base rule drops overflow-y, so a browse page is not a scroller at all (-> PAGEISVIEW)',
    file: 'css/app.css',
    from: "  overflow-y: auto; -webkit-overflow-scrolling: touch; overscroll-behavior: contain;\n}\nbody.has-player .browsepage { padding-bottom: 20px; }",
    to:   "  -webkit-overflow-scrolling: touch; overscroll-behavior: contain;\n}\nbody.has-player .browsepage { padding-bottom: 20px; }" },
  { name: 'S2-2 PAGEISVIEW: the .browsepage padding differs from the retired #browse scroller, so the content boxes disagree (-> PAGEISVIEW)',
    file: 'css/app.css',
    from: "  position: absolute; inset: 0;\n  padding: 14px 16px 40px;",
    to:   "  position: absolute; inset: 0;\n  padding: 14px 12px 40px;" },
  { name: 'S2-3 PAGEISVIEW: #browse keeps overflow-y, so there are TWO scroll authorities at once (-> PAGEISVIEW)',
    file: 'css/app.css',
    from: "  max-width: 640px; margin: 0 auto;\n}\nbody.has-player #browse { bottom: calc(var(--nav-h) + var(--nav-pad) + 106px); }",
    to:   "  max-width: 640px; margin: 0 auto;\n  overflow-y: auto;\n}\nbody.has-player #browse { bottom: calc(var(--nav-h) + var(--nav-pad) + 106px); }" },

  // ── MOVERHASBOX — Invariant D5, the structural form of round-1 F1 ──
  { name: 'S2-4 MOVERHASBOX: the #browse base rule becomes display:contents, so the drag transform is INERT on four shipped transitions (-> MOVERHASBOX)',
    file: 'css/app.css',
    from: "#browse {\n  position: fixed; left: 0; right: 0;",
    to:   "#browse {\n  display: contents; left: 0; right: 0;" },
  { name: 'S2-5 MOVERHASBOX: the #browse base rule drops position:fixed, falling to normal flow (-> MOVERHASBOX)',
    file: 'css/app.css',
    from: "#browse {\n  position: fixed; left: 0; right: 0;",
    to:   "#browse {\n  left: 0; right: 0;" },

  // ── PARKBOXEQUAL — Invariant P, extended to the page park rule ──
  { name: 'S2-6 PARKBOXEQUAL: .browsepage.parked re-declares top: 0, making the parked box taller than the active one (-> PARKBOXEQUAL)',
    file: 'css/app.css',
    from: ".browsepage.parked {\n  transform: translateX(-300vw);",
    to:   ".browsepage.parked {\n  top: 0;\n  transform: translateX(-300vw);" },
  { name: 'S2-7 PARKBOXEQUAL: .browsepage.parked drops overflow:hidden, losing the scroll-container status the anchoring guarantee rests on (-> PARKBOXEQUAL)',
    file: 'css/app.css',
    from: ".browsepage.parked {\n  transform: translateX(-300vw);\n  overflow: hidden; pointer-events: none; z-index: 0;\n}",
    to:   ".browsepage.parked {\n  transform: translateX(-300vw);\n  pointer-events: none; z-index: 0;\n}" },

  // ── PARKLOSESTRANSFORM — the cascade dependency the whole gesture rests on ──
  { name: 'S2-8 PARKLOSESTRANSFORM: the parked transform is marked !important, so the class beats the inline drag write and the outgoing mover sits off-viewport for the whole gesture (-> PARKLOSESTRANSFORM)',
    file: 'css/app.css',
    from: ".browsepage.parked {\n  transform: translateX(-300vw);",
    to:   ".browsepage.parked {\n  transform: translateX(-300vw) !important;" },

  // ── BROWSESURFACE — the indicator and the native-bar suppression ──
  { name: 'S2-9 BROWSESURFACE: .browsepage is dropped from the scrollbar-width suppression list, so a native bar returns and the geometry equality is off by its gutter (-> BROWSESURFACE)',
    file: 'css/app.css',
    from: "html, body, #home, #browse, .browsepage, #options, #general, #playback, #buffering, #downloads, #diagnostics { scrollbar-width: none; }",
    to:   "html, body, #home, #browse, #options, #general, #playback, #buffering, #downloads, #diagnostics { scrollbar-width: none; }" },
  { name: 'S2-10 BROWSESURFACE: surfaceKind loses its .browsepage case, so the indicator removes itself on browse (-> BROWSESURFACE)',
    file: 'js/scrollbar.js',
    from: "    if (t && typeof t.classList === 'object' && t.classList && t.classList.contains('browsepage')) return 'browse';\n",
    to:   "" },

  // ── PAGEOWNSSCROLL — the role SPLIT: container stays on the host, scroller is the page ──
  { name: 'S2-11 PAGEOWNSSCROLL: the container ops are re-pointed at the active page, so reset() wipes a PAGE instead of the host (-> PAGEOWNSSCROLL container half)',
    file: 'js/browse.js',
    from: "    if (o.mount) o.mount.innerHTML = '';",
    to:   "    { const a = activeEntry(); if (a) a.el.innerHTML = ''; }   /* mutated: the role re-pointed, not split */" },
  { name: 'S2-12 PAGEOWNSSCROLL: the virtualView metrics closure reads a SHARED reference, so the outgoing controller captures its anchor against the incoming page (-> PAGEOWNSSCROLL measured-element half)',
    file: 'js/browse.js',
    from: "        scrollY: () => m.scrollTop,\n        viewportH: () => m.clientHeight,\n        listTop: () => m.scrollTop + list.getBoundingClientRect().top - m.getBoundingClientRect().top,",
    to:   "        scrollY: () => o.mount.scrollTop,\n        viewportH: () => o.mount.clientHeight,\n        listTop: () => o.mount.scrollTop + list.getBoundingClientRect().top - o.mount.getBoundingClientRect().top," },

  // ── RESETCOVERSPAGES — the first borrowed mover with no id ──
  { name: 'S2-13 RESETCOVERSPAGES: resetSwipeStyles keeps its id-only element list, so an interrupted gesture strands a page at translateX(+/-w) (-> RESETCOVERSPAGES)',
    file: 'js/nav.js',
    from: "    els.push(...document.querySelectorAll('.browsepage'));\n",
    to:   "" },

  // ── ENTRYNOZERO — write ONLY a derived position (Invariant D4 at the call site) ──
  { name: 'S2-14 ENTRYNOZERO: entryScrollY returns 0 instead of null for a list page, writing the top over the offset the page already holds (-> ENTRYNOZERO)',
    file: 'js/browse.js',
    from: "    if (descV === 'files') return trackY == null ? 0 : trackY;\n    return null;",
    to:   "    if (descV === 'files') return trackY == null ? 0 : trackY;\n    return 0;" },
  { name: 'S2-15 ENTRYNOZERO: positionOnEnter writes even when nothing was derived (the null guard dropped) (-> ENTRYNOZERO)',
    file: 'js/browse.js',
    from: "    if (y != null) applyScrollY(page, y);",
    to:   "    applyScrollY(page, y);" },

  // ── MOVERSDISTINCT — Invariant D6, distinctness ──
  { name: 'S2-16 MOVERSDISTINCT: the sourceHost projection loses its browse-page case, so the outgoing slot falls back to the #browse host (-> MOVERSDISTINCT recipe half)',
    file: 'js/swipe.js',
    from: "    const sourceHost = fromKind === 'overlay' ? 'overlay' : browsePair ? 'browse-page' : 'in-flow';",
    to:   "    const sourceHost = fromKind === 'overlay' ? 'overlay' : 'in-flow';" },
  { name: 'S2-17 MOVERSDISTINCT: the destinationHost projection loses its browse-page case, so the incoming slot falls back to the #browse host (-> MOVERSDISTINCT recipe half)',
    file: 'js/swipe.js',
    from: "    const destinationHost = toKind === 'overlay' ? 'overlay'\n      : browsePair ? 'browse-page'\n        : toKind === 'browse' ? 'browse-host' : 'home';",
    to:   "    const destinationHost = toKind === 'overlay' ? 'overlay'\n      : toKind === 'browse' ? 'browse-host' : 'home';" },
  // ⭐ REGISTERED AGAINST THE APP-HARNESS CELL, NOT THE RECIPE ONE. Every construction-seam
  // fixture in this suite hand-writes its env, so this branch — the app-side env LITERAL — is
  // executed by nothing at the recipe layer, and a mutant registered there would SURVIVE the
  // sweep (Curie, RED-swipe-declone-stage2.md §3).
  { name: 'S2-18 MOVERSDISTINCT: the app-side env literal returns the #browse HOST from its browse-page destination branch (-> MOVERSDISTINCT app-harness half)',
    from: "          if (host === 'browse-page') { showAppView(dest, true); return Browse.pageElFor(dest); }",
    to:   "          if (host === 'browse-page') { showAppView(dest, true); return $('browse'); }" },

  // ── LANDEDPAGESHOWS — Invariant D6, the landing ──
  { name: 'S2-19 LANDEDPAGESHOWS: endHold INFERS the landed page from the first non-offscreen page instead of the landed descriptor, leaving the destination shown after an abort (-> LANDEDPAGESHOWS browse->browse abort)',
    file: 'js/browse.js',
    from: "    const landedKey = keyFor(landed);",
    to:   "    let landedKey = null; for (const [k, v] of pageCache) if (!offscreen(v.el)) { landedKey = k; break; }   /* mutated: inferred, not landed */" },
  // ⭐ ONLY THE COMMIT HALF KILLS THIS. An abort mutates neither navStack nor fwdStack, so
  // currentDesc() returns the identical descriptor before and after applyScreen and a too-early
  // read is INVISIBLE there. The commit's stack mutation sits AHEAD of applyScreen, so the
  // pre-applyScreen descriptor is the SOURCE screen and the mirror-image assertion reddens.
  { name: 'S2-20 LANDEDPAGESHOWS: the landed descriptor is read BEFORE the screen is applied, so a commit reconciles against the pre-commit screen (-> LANDEDPAGESHOWS browse->browse COMMIT half)',
    from: "      if (window.Browse && Browse.endHold) Browse.endHold(t, currentDesc());",
    to:   "      if (window.Browse && Browse.endHold) Browse.endHold(t, session && session.from);   /* mutated: the PRE-applyScreen descriptor */" },
  { name: 'S2-21 LANDEDPAGESHOWS: a landed descriptor naming no cached page is routed through the landed lookup anyway, so nothing is reconciled and the one activation the gesture gets is skipped (-> LANDEDPAGESHOWS browse->home)',
    file: 'js/browse.js',
    from: "    if (landedKey != null && pageCache.has(landedKey)) {",
    to:   "    if (landedKey != null) {   /* mutated: the cache hit test dropped from the miss branch */" },

  // ── NPPILLIDS — the double-occurrence trap in §12 item 4 ──
  // The id strip occurred TWICE at HEAD and only the ghost builder's copy was on the deletion
  // list. This mutant deletes the SURVIVING one — the pill decoration's — which is exactly what
  // a text-directed deletion would have done.
  { name: 'S2-22 NPPILLIDS: the pill decoration stops stripping ids from its clone (the RETAINED occurrence of the id-strip line) (-> NPPILLIDS)',
    file: 'js/swipe.js',
    from: "      clone.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id'));\n      clone.classList.add('np-pill-float');",
    to:   "      clone.classList.add('np-pill-float');" },

  // ── NOGHOSTATALL — no owned pane, no .nav-ghost node, no capture key ──
  // TWO PARTS, because re-adding the plan VALUE alone changes no mover: the seam no longer
  // branches on it. The pane has to be built and the capture returned for the cell's three
  // assertions to be the discriminator they are written as.
  { name: 'S2-23 NOGHOSTATALL: the app-ghost branch is re-added for browse->browse — a pane is built, a .nav-ghost is mounted and a capture is returned (-> NOGHOSTATALL)',
    file: 'js/swipe.js',
    from: "    let outgoing, incoming, decoration = null;\n    outgoing = mover(env.sourceEl(sourceHost, from.v), 'borrowed-real', 'outgoing');",
    to:   "    let capture = null, outgoing, incoming, decoration = null;\n    if (classification.fromKind === 'browse' && classification.toKind === 'browse') {\n      const w = env.document.createElement('div'); w.className = 'nav-ghost';\n      env.document.body.appendChild(w);\n      outgoing = mover(w, 'owned-pane', 'outgoing'); capture = { ghostY: 0 };\n    } else outgoing = mover(env.sourceEl(sourceHost, from.v), 'borrowed-real', 'outgoing');",
    also: {
      from: "    return { decorations, movers: { outgoing, incoming, decoration } };",
      to:   "    return { decorations, movers: { outgoing, incoming, decoration }, capture };" } },

  // ── ABORTNORENDER — an abort is a transform reset and nothing else ──
  { name: 'S2-24 ABORTNORENDER: the abort re-render is restored, so an aborted swipe rebuilds its source screen (-> ABORTNORENDER)',
    from: "          applyScreen(dest, { render: false, resetScroll: false });",
    to:   "          applyScreen(dest, { render: true, resetScroll: false });" },

  // ── EMPTYAFTERHOME — the hold release must not activate a controller inside a hidden #browse ──
  // ⭐ THE OVER-BROAD-FIX PROBE, registered by the test author at the RED-suite step because its
  // anchor is the SHIPPED landed branch and therefore already exists (the two mutants that anchor
  // on the fix itself cannot be registered until the fix ships — see
  // Claude/Curie/RED-browse-empty-after-home-commit.md §6). The defect lives in endHold's ELSE
  // branch; the cheapest wrong repair is to delete the activate+realize pair from BOTH branches,
  // which also strips the one realization a gesture LANDING on a browse page gets. The two-line
  // anchor is what disambiguates it: the `if` line alone occurs twice (the else branch's copy is
  // byte-identical), so the preceding `const shown = pageCache.get(landedKey);` carries it.
  { name: 'EMPTYAFTERHOME over-broad fix: the LANDED branch stops activating and realizing the page the gesture landed on (-> the landed-branch realization)',
    file: 'js/browse.js',
    from: "      const shown = pageCache.get(landedKey);\n      if (shown && shown.el._vctl) { shown.el._vctl.activate(); shown.el._vctl._realize(); }",
    to:   "      const shown = pageCache.get(landedKey);\n      if (shown && shown.el._vctl) { /* mutated: the landed page is neither activated nor realized */ }" },

  // ── EMPTYAFTERHOME-a — the shipped fix: full revert ──
  // The fix (js/app.js) reorders dropRowHold() to run inside runFinalize, BEFORE the
  // applyScreen(dest, …) call that can hide #browse — not from finalize's `finally`
  // after it. This mutant removes the early call, so the only remaining dropRowHold()
  // is the `finally` one, which runs after applyScreen — reproducing HEAD's shipped
  // ordering (and therefore the shipped defect) exactly.
  { name: 'EMPTYAFTERHOME-a: the early dropRowHold() is removed, so the hold release again '
    + 'runs only in finalize\'s `finally`, after applyScreen has already hidden #browse '
    + '(-> EMPTYAFTERHOME cell 1, then cell 2)',
    from: "        // this function, well before this line.\n        dropRowHold();",
    to:   "        // this function, well before this line.\n        /* mutated: EMPTYAFTERHOME-a — early release removed */" },

  // ── EMPTYAFTERHOME-b — the half fix: the reorder applied to only one branch ──
  // Curie's RED-suite note specifies -b as "activate() reached, _realize() suppressed" —
  // a shape that presumes a NEW conditional guard around endHold's fallback activation.
  // The shipped fix is a reorder instead (dropRowHold moved ahead of applyScreen in
  // runFinalize), and under it that literal mutation is UNREACHABLE for this defect:
  // activate() (js/virtuallist.js:234-241) early-returns without calling _realize() at all
  // whenever the controller is ALREADY active and IS activeCtl — which it is throughout a
  // browse->home gesture, because nothing suspends the Books controller for that
  // transition (js/browse.js:194-204) and the reorder means endHold's fallback now always
  // runs BEFORE the deactivate() that would otherwise flip it to inactive. Verified, not
  // assumed: registering that exact mutation and sweeping it left both EMPTYAFTERHOME
  // cells green — UNCAUGHT, because activate() never transitions state there either way.
  // The reorder's real fragility is a HALF-APPLIED reorder: the early release wired to
  // only one branch of the commit/abort split. This mutant reproduces exactly that on the
  // COMMIT branch these cells drive — the release stays late, applyScreen still hides
  // #browse first, and the fallback re-activates into the hidden box, same as -a.
  { name: 'EMPTYAFTERHOME-b: the early dropRowHold() is wired to the ABORT branch only, so a '
    + 'COMMIT still reaches applyScreen (and the #browse hide) before the hold releases '
    + '(-> EMPTYAFTERHOME cell 1, then cell 2)',
    from: "        dropRowHold();\n        // dest already rendered live",
    to:   "        if (!commit) dropRowHold();   /* mutated: EMPTYAFTERHOME-b — wired to abort only */\n        // dest already rendered live" },

  // ══════════════════════════════════════════════════════════════════════════════════════
  // PLAN-parked-page-rides-home.md §8 — the park-distance law. Registered BEFORE the cells
  // they defend, and executed, because every finding after that plan's round 1 was a claim
  // about REACHABILITY and reading was wrong about it four times (its F9/F10/F12/F13).
  //
  // m1 and m2 (below) were NOT registrable pre-build — both target the arithmetic cells,
  // which were RED at HEAD and landed behind SKIP-PENDING-BUILD, so neither could be caught
  // and a registered-but-uncatchable mutant would make the sweep exit nonzero forever. Now
  // that the build has landed (both arithmetic cells are green and unskipped) they are
  // registered here, per Claude/Curie/parked-page-rides-home-test-design-2026-08-02.md §6.
  // ══════════════════════════════════════════════════════════════════════════════════════

  // ── PARKOUTOFREACH m1 — restores the shipped defect ──
  // At pre-build HEAD this was a literal no-op (the source WAS m1) and the anchors gate
  // refuses a no-op outright. Post-build it is a real mutation: reddens BOTH arithmetic
  // assertions (the offset no longer clears the floor, and it is no longer the shipped form).
  { name: 'PARKM1 PARKOUTOFREACH: the park offset is restored to the shipped defect, -101vw '
      + '(-> PARKOUTOFREACH strict-inequality AND shipped-form cells)',
    file: 'css/app.css',
    from: ".browsepage.parked {\n  transform: translateX(-300vw);",
    to:   ".browsepage.parked {\n  transform: translateX(-101vw);" },

  // ── PARKOUTOFREACH m2 — clears the floor but is not the shipped form ──
  // Registered and executed once already, pre-build, with both arithmetic cells live: caught
  // (1 failing), killed by the shipped-form cell ALONE, and it flipped the strict-inequality
  // cell green (250 > 200) — proof the inequality can be green independently of the shipped
  // value. Withdrawn when the skips landed (a skipped test cannot be a killer) and reinstated
  // here now that both cells are unskipped.
  { name: 'PARKM2 PARKOUTOFREACH: the park offset becomes -250vw — clears the derived floor but is '
      + 'NOT the bench-measured shipped form (-> PARKOUTOFREACH shipped-form cell ALONE)',
    file: 'css/app.css',
    from: ".browsepage.parked {\n  transform: translateX(-300vw);",
    to:   ".browsepage.parked {\n  transform: translateX(-250vw);" },

  // ── PARKOUTOFREACH m3 — the structural max-width BAR, not a term of the arithmetic ──
  // Plan F10: `left:0; right:0` means max-width can only CAP the box, so edgeVw stays 100
  // for ANY max-width and the floor does not move. A >100vw max-width is therefore inert
  // arithmetically and is barred as a RED FLAG — someone has misread the box. This mutant
  // witnesses that bar and nothing else.
  { name: 'PARKM3 PARKOUTOFREACH: #browse gets a >100vw max-width — arithmetically inert, so it '
    + 'witnesses the structural max-width bar (-> PARKOUTOFREACH max-width-bar cell ALONE)',
    file: 'css/app.css',
    from: "  max-width: 640px; margin: 0 auto;\n}\nbody.has-player #browse { bottom: calc(var(--nav-h) + var(--nav-pad) + 106px); }",
    to:   "  max-width: 250vw; margin: 0 auto;\n}\nbody.has-player #browse { bottom: calc(var(--nav-h) + var(--nav-pad) + 106px); }" },

  // ── PARKOUTOFREACH m3' — the no-`width` precondition ──
  // ⛔ ADDITIVE, and that is load-bearing (plan F13). Specified as a REPLACEMENT it would
  // delete the `max-width` its own justification appeals to, trip the cell's anti-vacuity
  // check instead, and leave the no-`width` assertion with no discriminating mutant — the
  // sweep cannot see that, because both texts kill the cell either way.
  { name: 'PARKM3P PARKOUTOFREACH: #browse gains `width: 200vw` beside its max-width — used width is '
    + 'still 640px, so this is a PRECONDITION-only kill (-> PARKOUTOFREACH no-width cell ALONE)',
    file: 'css/app.css',
    from: "  max-width: 640px; margin: 0 auto;\n}\nbody.has-player #browse { bottom: calc(var(--nav-h) + var(--nav-pad) + 106px); }",
    to:   "  max-width: 640px; width: 200vw; margin: 0 auto;\n}\nbody.has-player #browse { bottom: calc(var(--nav-h) + var(--nav-pad) + 106px); }" },

  // ── PARKOUTOFREACH m4 — the no-`min-width` precondition, AND a real layout change ──
  // Also ADDITIVE (F13). The only mutant in this set non-equivalent in LAYOUT as well as in
  // the precondition set: CSS 2.1 §10.4 re-solves the used width with `min-width` when the
  // max-width result is smaller, so W = 200vw beats the max-width left in place; the box is
  // then over-constrained and §10.3.7 sets margin-left to 0 rather than a negative -50vw, so
  // L = 0 and L + W = 200vw exactly, FLOOR = 300 and even the shipped 300 fails the STRICT
  // inequality. Had the margins centred, the floor would be 250 and this mutant would be
  // equivalent — the §10.3.7 clause is load-bearing, not a detail.
  { name: 'PARKM4 PARKOUTOFREACH: #browse gains `min-width: 200vw` beside its max-width — min-width '
    + 'beats max-width, so the box really becomes 200vw in a real engine, but derivedFloorVw() never '
    + 'reads min-width, so the strict-inequality cell stays green '
    + '(-> PARKOUTOFREACH no-min-width cell ALONE — executed, tools/mutation-sweep.mjs 130)',
    file: 'css/app.css',
    from: "  max-width: 640px; margin: 0 auto;\n}\nbody.has-player #browse { bottom: calc(var(--nav-h) + var(--nav-pad) + 106px); }",
    to:   "  max-width: 640px; min-width: 200vw; margin: 0 auto;\n}\nbody.has-player #browse { bottom: calc(var(--nav-h) + var(--nav-pad) + 106px); }" },

  // ── DRAGREACHBOUNDED — the floor's FIRST term, pinned against the real entry point ──
  // Without the clamp an over-drag writes |translateX| > w on #browse, and the floor's
  // "max |displacement| = 100vw" stops being a fact about the code.
  { name: 'PARKDRAG DRAGREACHBOUNDED: the drag clamp is removed, so an over-drag writes a #browse '
    + 'transform beyond +/-w and the floor\'s first term is no longer bounded (-> DRAGREACHBOUNDED)',
    from: "      t = Math.max(-d.w, Math.min(d.w, t));\n",
    to:   "      /* mutated: the drag clamp is removed — t is no longer bounded by +/-d.w */\n" },

  // ── NOPARKONHOME — invariant I10, the outgoing-side exemption ──
  // Three earlier candidates for this cell were EQUIVALENT (plan F9, F12): `showAppView`
  // never runs on a browse->home gesture at all, so mutating anything inside it — or its
  // guard — is unobservable. This mutates the branch the invariant is actually about, the
  // DISPATCH that really runs. Deliberately a string change and NOT `if (false)`: `npm test`
  // runs test/lint.test.js and a constant condition would redden the LINT cell instead,
  // mis-attributing the kill.
  { name: 'PARKNOHOME NOPARKONHOME: renderDestination\'s home branch also renders browse content, so a '
    + 'browse->home gesture parks every other cached page mid-drag (-> NOPARKONHOME)',
    from: "          if (host === 'home') { $('home').classList.remove('parked'); return $('home'); }",
    to:   "          if (host === 'home') { $('home').classList.remove('parked'); Browse.render(dest); return $('home'); }" },

  // ══════════════════════════════════════════════════════════════════════════════════════
  // The two remaining PARKOUTOFREACH structural bars, from the coverage audit
  // (Claude/Mendeleev/parked-page-rides-home-coverage-audit-2026-08-02.md §4, findings M1/M2).
  //
  // ⭐ WHY THESE TWO MATTER MORE THAN THEIR "PRECONDITION" LABEL SUGGESTS. Under every
  // admissible box, `edgeVw = (100 + min(M,100))/2` is 100, so the derived floor is INVARIANT
  // at 200vw and `derivedFloorVw()` reads `max-width` and nothing else. The entire detection
  // capability for a WIDENED #browse therefore lives in the structural bars, not in the
  // arithmetic — and these were the last two bars with no mutant behind them.
  //
  // APPENDED rather than filed beside PARKM3/M3P/M4 on purpose: inserting there would shift
  // PARKDRAG and PARKNOHOME from 131/132, and the audit and the test design both cite those
  // indices. Records that point at an index are as breakable as records that point at a line.
  // ══════════════════════════════════════════════════════════════════════════════════════

  // ── PARKPAD — the no-`padding`/`border` bar (audit M1) ──
  // ADDITIVE, for the reason the plan's F13 records: a replacement deletes the `max-width` the
  // cell's own anti-vacuity check requires, so it would kill through THAT check instead of
  // through the assertion it is registered to witness.
  // A precondition-only kill BY DESIGN, exactly like PARKM3P: under `* { box-sizing: border-box }`
  // padding cannot widen the border box, so the bar's real job is to keep that assumption true —
  // it forbids the one shape where it fails (`box-sizing: content-box` plus a large padding,
  // where the border box exceeds the cap).
  { name: 'PARKPAD PARKOUTOFREACH: #browse gains `padding-left: 16px` beside its max-width — inert '
    + 'under border-box sizing, so it witnesses the structural padding/border bar that keeps that '
    + 'assumption true (-> PARKOUTOFREACH no-padding/border cell ALONE)',
    file: 'css/app.css',
    from: "  max-width: 640px; margin: 0 auto;\n}\nbody.has-player #browse { bottom: calc(var(--nav-h) + var(--nav-pad) + 106px); }",
    to:   "  max-width: 640px; padding-left: 16px; margin: 0 auto;\n}\nbody.has-player #browse { bottom: calc(var(--nav-h) + var(--nav-pad) + 106px); }" },

  // ── PARKINSET — the centring bar (audit M2) ──
  // ⭐ THE ONLY NON-CONSERVATIVE ONE IN THE SET, and the only guard against the single admissible
  // edit that genuinely breaks `L + W <= 100vw`. Derivation, stated exactly because an
  // approximation here is the difference between a killing mutant and an equivalent one: with
  // `right: -400px` the available width becomes `V + 400`, so at V = 375 the used
  // `W = min(640, 775) = 640`, `L = (775 - 640)/2 = 67.5`, and `L + W = 707.5px = 188vw` — far
  // past the 100vw the floor's second term assumes. The arithmetic cell CANNOT see it:
  // `derivedFloorVw()` never reads `left` or `right`, so the floor stays 200 while `L + W` really
  // grows. This bar is the whole detection.
  { name: 'PARKINSET PARKOUTOFREACH: #browse\'s `right: 0` becomes `right: -400px`, so the available '
    + 'width exceeds the viewport and L + W really breaks its 100vw bound while the derived floor '
    + 'stays 200 (-> PARKOUTOFREACH centring cell ALONE)',
    file: 'css/app.css',
    from: "#browse {\n  position: fixed; left: 0; right: 0;",
    to:   "#browse {\n  position: fixed; left: 0; right: -400px;" },
];

// Exported so a TEST can check every anchor still matches the source. A mutation
// whose anchor has rotted silently stops testing anything — mutate.mjs exits nonzero
// when you run it by hand, but nobody runs all eleven by hand, so the rot is
// invisible until someone needs the mutation and finds it dead.
export { MUTATIONS, DEFAULT_FILE };

// ── Anchor UNIQUENESS ────────────────────────────────────────────────────────────────
// The applier below is `src.replace(from, to)` — a literal-STRING pattern, so
// `String.prototype.replace` rewrites the FIRST occurrence only. Nothing previously
// checked that `from` occurred exactly once: a `from` that occurs twice mutates
// whichever site sits first in the file, dies to whatever cell reaches THAT site, and
// reports `caught` while the entry's actually-intended site is never touched and its
// cell is never proven able to fail. An audit of this table found SIX of six inspected
// anchors non-unique (PLAN-home-shift-fix.md §7.3) — assume an anchor here is
// non-unique until this check proves otherwise, not the other way around.
//
// `resolveAnchor` is the ONE place this is decided, exported so the CLI apply step
// below and test/mutation-anchors.test.js run the IDENTICAL check — two independent
// implementations of "is this anchor unique" are exactly how one could drift and
// start trusting an anchor the other has already refused.
//
// Disambiguation is something an ENTRY DECLARES, never something this function
// infers or guesses at:
//   - `count: N`      — an explicit assertion of the total number of times `from`
//                        occurs in its target file. Valid whether the true count is 1
//                        or more; if the actual count differs, the declaration has
//                        gone STALE (the surrounding source moved since it was
//                        written) and the entry is refused. The repair is to
//                        re-derive the count against the CURRENT text, never to bump
//                        the number to match without re-checking what changed.
//   - `occurrence: N` — selects the Nth (1-indexed) occurrence of `from` as the one
//                        this entry mutates, for an anchor that is shared by more
//                        than one site for a real, permanent reason (not fixable by
//                        lengthening `from`, e.g. two rules that legitimately
//                        share a declaration).
// Neither field is needed when `from` is naturally unique — the default, and by far
// the common case: a `from` carrying enough surrounding context to be unique is the
// default FORM of a new entry, not a fallback reached only when someone happens to
// notice a collision.
function countOccurrences(src, needle) {
  let count = 0, idx = 0;
  for (;;) {
    idx = src.indexOf(needle, idx);
    if (idx === -1) break;
    count++;
    idx += needle.length;
  }
  return count;
}

function findNthOccurrence(src, needle, n) {
  let idx = 0;
  for (let k = 1; k <= n; k++) {
    idx = src.indexOf(needle, idx);
    if (idx === -1) return -1;
    if (k === n) return idx;
    idx += needle.length;
  }
  return -1;
}

// Resolves WHERE a part's `from` applies in `src` (already CRLF-normalised to LF, same
// as `from`), or explains why it cannot. `label` identifies the part in error text
// (e.g. "#12 [js/app.js] some mutation name"). Returns:
//   { index, occurrences }                 — success; `index` is the offset to replace at.
//   { index: -1, occurrences, error }      — refused; `error` is the message to print.
// occurrences is always returned (including on failure) so a caller — the anchors gate
// in particular — can tell an ANCHOR NOT FOUND (occurrences === 0, a different, already
// -handled failure) apart from a non-uniqueness refusal.
function resolveAnchor(src, part, label) {
  const from = part.from.replace(/\r\n/g, '\n');
  const occurrences = countOccurrences(src, from);
  if (occurrences === 0) {
    return { index: -1, occurrences, error: `ANCHOR NOT FOUND for ${label}` };
  }
  if (part.count != null && part.count !== occurrences) {
    return { index: -1, occurrences,
      error: `STALE COUNT for ${label}: declared count:${part.count} but the anchor `
        + `occurs ${occurrences} time(s) in the current source — re-derive the count `
        + `against the current text, do not bump the number without re-checking what `
        + `changed around it` };
  }
  if (occurrences > 1 && part.occurrence == null) {
    return { index: -1, occurrences,
      error: `NON-UNIQUE ANCHOR for ${label}: \`from\` occurs ${occurrences} times in `
        + `its target file. This tool will never guess which one is intended — `
        + `disambiguate with a longer \`from\` (the default fix) or declare an `
        + `explicit \`occurrence: N\` selecting which occurrence this entry means` };
  }
  const wantOccurrence = part.occurrence != null ? part.occurrence : 1;
  if (!Number.isInteger(wantOccurrence) || wantOccurrence < 1 || wantOccurrence > occurrences) {
    return { index: -1, occurrences,
      error: `OUT OF RANGE for ${label}: declared occurrence:${wantOccurrence} but the `
        + `anchor occurs ${occurrences} time(s)` };
  }
  return { index: findNthOccurrence(src, from, wantOccurrence), occurrences };
}

export { countOccurrences, findNthOccurrence, resolveAnchor };

// Everything below is the CLI. Guarded so importing this file does not apply a
// mutation to the working tree as a side effect of a test run.
const isCli = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop());
if (!isCli) { /* imported as a module — no CLI side effects */ } else {

if (process.argv.includes('--restore')) {
  // Includes `also.file` — a two-part mutation can span two files, so restoring only
  // the primary would leave the second file mutated in the working tree.
  const touched = new Set();
  for (const m of MUTATIONS) {
    touched.add(m.file || DEFAULT_FILE);
    if (m.also) touched.add(m.also.file || m.file || DEFAULT_FILE);
  }
  for (const f of touched) {
    if (fs.existsSync(bakOf(f))) { fs.copyFileSync(bakOf(f), f); fs.unlinkSync(bakOf(f)); }
  }
  console.log('restored');
  process.exit(0);
}
if (process.argv.includes('--list')) {
  MUTATIONS.forEach((m, i) => console.log(`${i}: [${m.file || DEFAULT_FILE}] ${m.name}`));
  process.exit(0);
}

const i = Number(process.argv[2]);
const m = MUTATIONS[i];
if (!m) { console.error('no mutation #' + i); process.exit(1); }
const FILE = m.file || DEFAULT_FILE;
const BAK = bakOf(FILE);
if (!fs.existsSync(BAK)) fs.copyFileSync(FILE, BAK);

// ⭐ NORMALISE LINE ENDINGS BEFORE MATCHING. Repo files are CRLF; multi-line anchors
// here are built with '\n'.join, so they could NEVER match and the mutation was
// silently unusable — mutation #7 (the object-URL blob block) had been dead for
// exactly this reason until test/mutation-anchors.test.js found it. This is trap T6
// in PLAN-swipe-reveal.txt, biting the tooling meant to catch such things.
// The file is written back as LF for the duration of the mutation; --restore puts the
// pristine CRLF copy back, so the working tree is unaffected either way.
// A two-part mutation may now span TWO FILES: `also` can carry its own `file`. Needed
// because some guards are defence in depth across modules — the swipe's inline-style
// clearing lives in BOTH app.js finalize and nav.js resetSwipeStyles, and removing
// either alone leaves the suite green. A mutation that cannot express "remove both"
// would report that guard as undefended when it is simply doubly defended.
const parts = [m, m.also].filter(Boolean);
const byFile = new Map();
for (const part of parts) {
  const f = part.file || FILE;
  if (!byFile.has(f)) {
    const bak = bakOf(f);
    if (!fs.existsSync(bak)) fs.copyFileSync(f, bak);
    byFile.set(f, fs.readFileSync(bak, 'utf8').replace(/\r\n/g, '\n'));   // PRISTINE, LF
  }
  const src = byFile.get(f);
  const label = `#${i} [${f}] ${m.name}`;
  const resolved = resolveAnchor(src, part, label);
  if (resolved.index === -1) {
    console.error(resolved.error + ' — mutation NOT applied');
    process.exit(1);
  }
  const from = part.from.replace(/\r\n/g, '\n');
  const to = part.to.replace(/\r\n/g, '\n');
  byFile.set(f, src.slice(0, resolved.index) + to + src.slice(resolved.index + from.length));
}
for (const [f, src] of byFile) fs.writeFileSync(f, src);
console.log(`applied #${i} [${FILE}]: ${m.name}`);

}   // end CLI guard

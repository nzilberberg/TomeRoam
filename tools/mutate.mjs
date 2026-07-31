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
  "        applyScreen(currentDesc(), { render: cur ? (cur.live && cur.finPlan.abortRender === 'rerender') : false, resetScroll: cur ? false : undefined, keepGhosts: cur ? true : undefined });",
].join('\n');
const HARDRESET_DISPOSE_TO = '        /* mutated: no hard reset */';
// stage 6a §9 VR — the two ordering defects the Loki strike measured against the real
// js/browse.js + js/virtuallist.js (STRIKE-swipe-stage6-recover-before-arm-r2.md §3).
const VR_HOLD_ORDER_FROM = [
  "        if (cur) disposeOwnedPanes(cur, 'superseded');",
  '        resetSwipeStyles(cur ? true : undefined);',
  "        applyScreen(currentDesc(), { render: cur ? (cur.live && cur.finPlan.abortRender === 'rerender') : false, resetScroll: cur ? false : undefined, keepGhosts: cur ? true : undefined });",
  '        if (cur) window.scrollTo(0, cur.scroll0);',
  '        dropRowHold();',
].join('\n');
const VR_HOLD_ORDER_TO = [
  '        dropRowHold();',
  "        if (cur) disposeOwnedPanes(cur, 'superseded');",
  '        resetSwipeStyles(cur ? true : undefined);',
  "        applyScreen(currentDesc(), { render: cur ? (cur.live && cur.finPlan.abortRender === 'rerender') : false, resetScroll: cur ? false : undefined, keepGhosts: cur ? true : undefined });",
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
const RECOVERY_RENDER_LINE = "        applyScreen(currentDesc(), { render: cur ? (cur.live && cur.finPlan.abortRender === 'rerender') : false, resetScroll: cur ? false : undefined, keepGhosts: cur ? true : undefined });";
const RECOVERY_RENDER_ALWAYS_FALSE = "        applyScreen(currentDesc(), { render: false, resetScroll: cur ? false : undefined, keepGhosts: cur ? true : undefined });";
// stage 6a Poirot F1 (Claude/Poirot/f09cf9d-swipe-stage6-supersession.md) — the orphan
// sub-case (d===null) must keep nav.js's default resetScroll so a home/options source
// still scrolls to top. Forcing resetScroll:false back onto the orphan (the f09cf9d bug)
// reds the OB-home cell in test/swipe-stage6.test.js.
const F1_ORPHAN_RESETSCROLL_TO = "        applyScreen(currentDesc(), { render: cur ? (cur.live && cur.finPlan.abortRender === 'rerender') : false, resetScroll: false, keepGhosts: cur ? true : undefined });";

// ── SWIPE stage 5 multi-line anchors (built by join, per the CRLF/'\n' rule) ──────────
// Stage 1 (PLAN-swipe-declone.md §5.1) retires the `fromKind` argument along with
// ghostApp's HOME-source branch (browse->browse is the only caller left), so this anchor
// re-points at the now-bare `ghostApp()` call — same F7a ordering intent, new text.
const S5_ORDER_FROM = [
  "    if (plan.outgoing === 'app-ghost') {",
  '      const g = ghostApp();',
].join('\n');
const S5_ORDER_TO = [
  "    if (plan.outgoing === 'app-ghost') {",
  '      env.renderDestination(dest, destinationHost);',
  '      const g = ghostApp();',
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
    from: "    if (browseVisible() && !offscreen(page)) positionOnEnter(desc, page, 0);",
    to: "    if (!offscreen(page)) positionOnEnter(desc, page, 0);" },
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
  { name: 'stage6a (a): the Browse hold releases BEFORE the recovery render (-> VR: kept rows dematerialize/rebuild)',
    from: VR_HOLD_ORDER_FROM, to: VR_HOLD_ORDER_TO },
  { name: 'stage6a (b): session/d null BEFORE the hold release (-> VR: dropRowHold no-ops, hold leaks)',
    from: VR_IDENTITY_ORDER_FROM, to: VR_IDENTITY_ORDER_TO },
  { name: 'stage6a: recovery never re-renders a clobbered source (-> SR known-red test)',
    from: RECOVERY_RENDER_LINE, to: RECOVERY_RENDER_ALWAYS_FALSE },
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
  { name: 'swipe: held abort stops restoring the starting scroll (-> I7 test)',
    // Unique via the following mark('restored') — only the held-abort path (the
    // `abortRender === 'rerender'` branch) reports that mark immediately after the
    // scroll restore.
    from: [
      '          window.scrollTo(0, cur.scroll0);',
      "          mark('restored');",
    ].join('\n'),
    to: [
      '          /* mutated: no scroll restore */',
      "          mark('restored');",
    ].join('\n') },
  { name: 'swipe: no-hold abort stops restoring the starting scroll (-> AB.noclobber-overlay / AB.noclobber-home tests)',
    // Unique via the preceding applyScreen statement — only the no-hold abort branch
    // pairs this scroll restore with that exact resetScroll:false applyScreen call.
    from: [
      "          applyScreen(dest, { render: cur.finPlan.abortRender === 'rerender', resetScroll: false });",
      '          window.scrollTo(0, cur.scroll0);',
    ].join('\n'),
    to: [
      "          applyScreen(dest, { render: cur.finPlan.abortRender === 'rerender', resetScroll: false });",
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
  { name: 'stage3: held reveal drop does not end ownership (-> endpoint held-reveal test)',
    from: DROP_SESSIONDONE_FROM, to: DROP_SESSIONDONE_TO },
  // ── .223 review fixes (sanctioned: findings 1a, 2, and 4's stronger test) ──────
  { name: 'r223 1a: settle rAF not cancelled → stale transform on real #browse (-> 1a test)',
    from: 'cancelAnimationFrame(cur.settleFrame);',
    to:   '/* mutated: settle rAF left uncancelled */' },
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
  { name: 'swipe5 F1c: an owned pane is not the sole capture source (capture set for overlay<->overlay) (-> capture-null test)',
    file: 'js/swipe.js',
    from: '    let capture = null, outgoing, incoming, decoration = null;',
    to:   '    let capture = { animSync: 0, animRes: 0 }, outgoing, incoming, decoration = null;' },
  // swipe5 F2-r "the home snapshot capture carries a ghostY it must not" REMOVED (Stage 6i,
  // PLAN-swipe-noswap-home.md §5/§12 scrub): its target, snapshotHome()'s return statement,
  // is DELETED — a →home reveal no longer builds any owned pane, so there is no home-snapshot
  // capture left for a ghostY to leak into. The class of defect (a capture missing/gaining a
  // field it should not carry) stays covered elsewhere: swipe5 F1c above (capture set when it
  // must be null) and the exact-key assertions in test/swipe-construction.test.js.
  { name: 'swipe5 F4a: the app-ghost recipe reads an ambient document, not env.document (-> no-ambient recipe test)',
    file: 'js/swipe.js',
    from: "      const clone = doc.querySelector('.app').cloneNode(true);",
    to:   "      const clone = document.querySelector('.app').cloneNode(true);" },
  { name: 'swipe5 F4b: copyAnimPhase reads an ambient Element, not env\'s (-> copyAnimPhase-through-env test)',
    file: 'js/swipe.js',
    from: '      const El = win && win.Element;',
    to:   "      const El = (typeof Element !== 'undefined') ? Element : (win && win.Element);" },
  { name: 'swipe6d FP/AB: finalizationPlanFor forces abortRender to none regardless of classification (-> FP oracle + AB.clobber test)',
    file: 'js/swipe.js',
    from: "    const abortRender = (c.fromKind === 'browse' && c.toKind === 'browse') ? 'rerender' : 'none';",
    to:   "    const abortRender = 'none';" },
  { name: 'swipe5 F7a: the destination render runs BEFORE the outgoing ghost is built (-> outgoing-before-render test)',
    file: 'js/swipe.js',
    from: S5_ORDER_FROM, to: S5_ORDER_TO },
  { name: 'swipe5 navGhost: the ghost wrapper sits ABOVE the persistent bars (z>=30) (-> nav-ghost contract test)',
    file: 'js/swipe.js',
    from: "      wrap.style.cssText = 'position:fixed;inset:0;z-index:28;overflow:hidden;pointer-events:none;will-change:transform;';",
    to:   "      wrap.style.cssText = 'position:fixed;inset:0;z-index:99;overflow:hidden;pointer-events:none;will-change:transform;';" },
  { name: 'swipe5 npPill: npPillClone stops removing the stale float (-> NP pill recipe test)',
    file: 'js/swipe.js',
    from: S5_NPPILL_FROM, to: S5_NPPILL_TO },
  { name: 'swipe5 freezeArt: the app-ghost recipe skips freezeArt, leaving data-art on the clone (-> freezeArt recipe test)',
    file: 'js/swipe.js',
    from: S5_FREEZEART_FROM, to: S5_FREEZEART_TO },
  // — CONTRACT (js/swipe.js) —
  { name: 'swipe5 F1-r: the sourceHost projection is mis-mapped (overlay source -> in-flow) (-> per-pair host projection test)',
    file: 'js/swipe.js',
    from: "    const sourceHost = fromKind === 'overlay' ? 'overlay' : 'in-flow';",
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
  { name: 'swipe6d BC-1a: finalizationPlanFor no longer throws on an unhandled fromKind (-> finalizationPlanFor unhandled-kind test)',
    file: 'js/swipe.js',
    from: `      throw new Error('Swipe.finalizationPlanFor: unhandled source kind "' + c.fromKind + '"');`,
    to:   '      void 0; // mutated: fromKind guard inert' },
  { name: 'swipe6d BC-1b: finalizationPlanFor no longer throws on an unhandled toKind (-> finalizationPlanFor unhandled-kind test)',
    file: 'js/swipe.js',
    from: `      throw new Error('Swipe.finalizationPlanFor: unhandled destination kind "' + c.toKind + '"');`,
    to:   '      void 0; // mutated: toKind guard inert' },
  // The RC.armed §4.10 tooling loop: the committed RC.armed test catches dropping the
  // `cur.live` build-ran conjunct from the recovery reader (js/app.js), but there was no
  // REGISTERED mutant for it. Dropping `cur.live &&` makes an ARMED (pre-lock, never-built)
  // browse→browse recovery read finPlan.abortRender directly ('rerender'), so it wrongly
  // re-renders #browse → reddens RC.armed (a DRAGGING/overlay supersession is unchanged:
  // cur.live is true / abortRender is 'none' there).
  { name: 'swipe6d RC: recovery reader drops the cur.live build-ran conjunct (-> RC.armed test)',
    from: "render: cur ? (cur.live && cur.finPlan.abortRender === 'rerender') : false",
    to:   "render: cur ? (cur.finPlan.abortRender === 'rerender') : false" },
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
  { name: 'swipe6e NOOP-a: owned branch drops keepGhosts at the explicit resetSwipeStyles (app.js) -> the global .nav-ghost sweep runs (-> NOOP.mechanism)',
    from: '        resetSwipeStyles(cur ? true : undefined);',
    to:   '        resetSwipeStyles(undefined);' },
  { name: 'swipe6e NOOP-b: owned branch drops keepGhosts in the applyScreen opts (app.js) -> applyScreen\'s internal sweep runs (-> NOOP.mechanism)',
    from: "        applyScreen(currentDesc(), { render: cur ? (cur.live && cur.finPlan.abortRender === 'rerender') : false, resetScroll: cur ? false : undefined, keepGhosts: cur ? true : undefined });",
    to:   "        applyScreen(currentDesc(), { render: cur ? (cur.live && cur.finPlan.abortRender === 'rerender') : false, resetScroll: cur ? false : undefined });" },
  // B2 — RSN reason correctness (plan §9 promised a mistag mutant that never landed). (a) the
  // disposal reason TOKEN is wrong -> RSN's "superseded recorded" assertion reddens; (b) the trace
  // fires UNCONDITIONALLY, ignoring the `disposed` flag (Charpy F2) -> a pane-LESS supersession
  // then claims a disposal that never happened, reddening RSN's pane-less-no-trace clause.
  { name: 'swipe6e RSN-mistag: the disposal reason token is wrong (-> RSN "superseded" recorded)',
    from: "        if (cur) disposeOwnedPanes(cur, 'superseded');",
    to:   "        if (cur) disposeOwnedPanes(cur, 'wrong-reason');" },
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
      from: "        applyScreen(currentDesc(), { render: cur ? (cur.live && cur.finPlan.abortRender === 'rerender') : false, resetScroll: cur ? false : undefined, keepGhosts: cur ? true : undefined });",
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
    from: "    const outgoing = (c.fromKind === 'browse' && c.toKind === 'browse') ? 'app-ghost' : 'real-source';",
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
  { name: 'browse-decouple GHOSTSCROLL: the outgoing app-ghost reverts to reading window.scrollY for a BROWSE source (-> GHOSTSCROLL equals-500 test)',
    file: 'js/swipe.js',
    from: "      const ghostY = doc.getElementById('browse').scrollTop || 0;",
    to:   "      const ghostY = env.scrollY() || 0;" },
  { name: 'browse-decouple STRIPEXCLUDE: the .alphaindex exclusion is dropped from the ghost clone (-> STRIPEXCLUDE no-strip test)',
    file: 'js/swipe.js',
    from: "      clone.querySelectorAll('.alphaindex').forEach((n) => n.remove());",
    to:   "      /* mutated: .alphaindex not excluded from the ghost clone */" },
  { name: 'browse-decouple REALIZE: the virtual-list scroll listener reverts to window (bubble phase), never seeing a #browse own-scroll (-> REALIZE listener test)',
    file: 'js/virtuallist.js',
    from: "  if (typeof document !== 'undefined') document.addEventListener('scroll', onDocScroll, { capture: true, passive: true });",
    to:   "  if (typeof window !== 'undefined') window.addEventListener('scroll', onDocScroll, { passive: true });" },
  { name: 'browse-decouple METRICS: browse.js virtualView stops injecting #browse-relative metrics/scrollTo (-> METRICS injected-metrics test)',
    file: 'js/browse.js',
    from: "      metrics: {\n        scrollY: () => o.mount.scrollTop,\n        viewportH: () => o.mount.clientHeight,\n        listTop: () => o.mount.scrollTop + list.getBoundingClientRect().top - o.mount.getBoundingClientRect().top,\n      },\n      scrollTo: (y) => { o.mount.scrollTop = y; },",
    to:   "      /* mutated: no #browse-relative metrics/scrollTo injected — falls to the window default */" },
  { name: 'browse-decouple RESTORE: applyScrollY reverts to window.scrollTo instead of writing #browse.scrollTop (-> RESTORE write-surface test)',
    file: 'js/browse.js',
    from: "    o.mount.scrollTop = clampY(y, o.mount.scrollHeight, o.mount.clientHeight);",
    to:   "    window.scrollTo(0, clampY(y, o.mount.scrollHeight, o.mount.clientHeight));   // mutated: window, not #browse.scrollTop" },
  { name: 'browse-decouple PINGONE: the retired .266 stable-height pin is reintroduced on →home (-> PINGONE stays-empty test)',
    file: 'js/nav.js',
    from: "        if (d.browseWillHide) d.browseWillHide();\n      }",
    to:   "        if (d.browseWillHide) d.browseWillHide();\n        const appEl = document.querySelector('.app');\n        if (appEl) appEl.style.minHeight = appEl.scrollHeight + 'px';\n      }" },

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
    from: "          applyScreen(dest, { render: cur.finPlan.abortRender === 'rerender', resetScroll: false });",
    to:   "          applyScreen(dest, { render: cur.finPlan.abortRender === 'rerender', resetScroll: true });" },
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
    from: "          applyScreen(dest, { render: cur.finPlan.abortRender === 'rerender', resetScroll: false });\n          window.scrollTo(0, cur.scroll0);",
    to:   "          applyScreen(dest, { render: cur.finPlan.abortRender === 'rerender', resetScroll: false });\n          window.scrollTo(0, cur.scroll0);\n          if (cur.from.v === 'home') $('home').scrollTop = cur.scroll0;   /* mutated: the retired restore, re-derived */" },
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
  { name: 'M2ALIGN: the ghost builder reverts to the vestigial in-flow 46px, misaligning the clone content-top from the real fixed-inset content-top (-> M2ALIGN aligned-value test)',
    file: 'js/swipe.js',
    from: "      const lib = clone.querySelector('#library'); if (lib) lib.style.paddingTop = '53px';",
    to:   "      const lib = clone.querySelector('#library'); if (lib) lib.style.paddingTop = '46px';" },

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
  { name: 'one-screen-type PEERPARK/PEERFINALIZE-b: #browse is hidden BEFORE the browseWillHide anchor capture, so Browse.deactivate measures a zero-height box (-> PEERPARK + PEERFINALIZE observed-un-hidden assertions; at HEAD, nav.test.js deactivate-before-hide)',
    file: 'js/nav.js',
    from: '        if (d.browseWillHide) d.browseWillHide();\n      }',
    to:   "        browseEl.classList.toggle('hidden', true);   /* mutated: hide BEFORE the capture */\n        if (d.browseWillHide) d.browseWillHide();\n      }" },

  // NOSETTINGSBG's second mutant — the OTHER direction. The cell's painter-set equality must fail
  // when .nowplaying LOSES its background just as surely as when a settings screen regains one;
  // a cell that only fails one way would bless deleting the one screen that must keep painting.
  // The anchor is the .nowplaying-specific comment tail, which distinguishes it from the #options
  // ("so (unlike #home/#browse) it needs its own background") and five-sub ("so they need their
  // own background") copies, and which no stage touches (invariant S4).
  // At HEAD its live killer is this file's own predecessor test, PAGE-BG-SINGLE-PAINTER; A1
  // deletes that test in the same commit that unskips NOSETTINGSBG, so the guard is never
  // undefended for an instant.
  { name: 'one-screen-type NOSETTINGSBG-b: .nowplaying loses its own --page-bg background, so the one screen that must keep painting stops (-> NOSETTINGSBG painter-set equality; at HEAD, PAGE-BG-SINGLE-PAINTER)',
    file: 'css/app.css',
    from: '     un-parked page underneath, so it needs its own background. */\n  background: var(--page-bg);',
    to:   '     un-parked page underneath, so it needs its own background. */' },

  // NPUNTOUCHED is a PRESERVATION cell — green at HEAD by construction, because it asserts what
  // must NOT change. This mutant is therefore the whole of its evidence that it can fail, which is
  // why it is registered now rather than at build time: it removes the npOpen exemption, so
  // setView('nowplaying') hides the settings screen Now Playing was opened over and the NP-back
  // reveal has nothing to filmstrip to.
  //
  // ⛔ STAGE A1 MUST RE-ANCHOR THIS ENTRY, and test/mutation-anchors.test.js will BLOCK the commit
  // until it does. A1 narrows the park guard on js/nav.js:56 to `if (!npOpen) {` — the identical
  // text — so after the build this `from` occurs TWICE in js/nav.js and the uniqueness gate
  // refuses it with NON-UNIQUE ANCHOR. Extend the `from` with the six-way visibility loop that
  // follows it (whatever exact text ships), e.g.
  //     from: "    if (!npOpen) {\n      for (const s of ['options', ...SETTINGS_SUBS])"
  //     to:   "    if (true) {\n      for (const s of ['options', ...SETTINGS_SUBS])"
  // That is a deliberate, mechanized stop rather than a trap: the collision is real either way,
  // and this is the only construct in the repo that makes the builder see it.
  { name: 'one-screen-type NPUNTOUCHED: the npOpen exemption is removed, so opening Now Playing hides the settings screen underneath and the NP-back reveal has nothing to return to (-> NPUNTOUCHED still-un-hidden assertion)',
    file: 'js/nav.js',
    from: '    if (!npOpen) {',
    to:   '    if (true) {' },
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

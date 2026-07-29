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
const S5_GHOSTBG_FROM = [
  '    const GHOST_BG = (() => {',
  "      try { return win.getComputedStyle(doc.documentElement).getPropertyValue('--page-bg').trim() || 'var(--bg)'; }",
  "      catch { return 'var(--bg)'; }",
  '    })();',
].join('\n');
const S5_GHOSTBG_TO = "    const GHOST_BG = getComputedStyle(doc.documentElement).getPropertyValue('--page-bg').trim() || 'var(--bg)';";
const S5_ORDER_FROM = [
  "    if (plan.outgoing === 'app-ghost') {",
  '      const g = ghostApp(fromKind);',
].join('\n');
const S5_ORDER_TO = [
  "    if (plan.outgoing === 'app-ghost') {",
  '      env.renderDestination(dest, destinationHost);',
  '      const g = ghostApp(fromKind);',
].join('\n');
const S5_NPPILL_FROM = [
  "      doc.querySelectorAll('.np-pill-float').forEach((n) => n.remove());",
  '      const clone = env.navPill().cloneNode(true);',
].join('\n');
const S5_NPPILL_TO = '      const clone = env.navPill().cloneNode(true);';
const S5_FREEZEART_FROM = [
  "      clone.querySelectorAll('.hidden, .parked').forEach((n) => n.remove());",
  '      freezeArt(clone);',
].join('\n');
const S5_FREEZEART_TO = "      clone.querySelectorAll('.hidden, .parked').forEach((n) => n.remove());";
const S5_UNHIDE_FROM = [
  "          el.classList.remove('hidden');",
  '          return el;',
].join('\n');
const S5_UNHIDE_TO = '          return el;';

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
  { name: 'swipe: abort stops restoring the starting scroll (-> I7)',
    from: 'window.scrollTo(0, cur.scroll0);', to: '/* mutated: no scroll restore */' },
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
  { name: 'swipe4 F6: constructionPlanFor absorbs a bad fromKind instead of throwing (-> source-kind test)',
    file: 'js/swipe.js',
    from: '    if (KINDS.indexOf(c.fromKind) === -1) {',
    to:   '    if (false && KINDS.indexOf(c.fromKind) === -1) {' },
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
  { name: 'swipe5 F8: GHOST_BG reads an ambient getComputedStyle, not env\'s (-> ghost-background-through-env test)',
    file: 'js/swipe.js',
    from: S5_GHOSTBG_FROM, to: S5_GHOSTBG_TO },
  { name: 'swipe5 navGhost: the ghost wrapper sits ABOVE the persistent bars (z>=30) (-> nav-ghost contract test)',
    file: 'js/swipe.js',
    from: "      wrap.style.cssText = 'position:fixed;inset:0;z-index:28;overflow:hidden;background:' + GHOST_BG + ';pointer-events:none;will-change:transform;';",
    to:   "      wrap.style.cssText = 'position:fixed;inset:0;z-index:99;overflow:hidden;background:' + GHOST_BG + ';pointer-events:none;will-change:transform;';" },
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
  // is shared with constructionPlanFor's own guard, so it would mutate the wrong function).
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
  // ── SWIPE stage 6f: outgoing app-ghost for in-flow→overlay (PLAN-swipe-stage6f.md) ──
  // The single production edit is the outgoing decision value in constructionPlanFor.
  // Reverting it to the pre-6f rule (keyed off destination browse only, instead of
  // "destination not home") re-opens the hole the five stage-6f red cells were authored
  // against: in-flow->overlay again borrows the real #browse/#home as the outgoing mover.
  { name: 'stage6f: constructionPlanFor outgoing reverts to the pre-6f rule, keyed off destination browse only (-> SIbrowse/SIhome/GHOST commit+abort/MODEL)',
    file: 'js/swipe.js',
    from: [
      "    const outgoing = c.fromKind === 'overlay' ? 'real-source'",
      "      : (c.toKind === 'home' ? 'real-source' : 'app-ghost');",
    ].join('\n'),
    to: [
      "    const outgoing = c.fromKind === 'overlay' ? 'real-source'",
      "      : (c.toKind === 'browse' ? 'app-ghost' : 'real-source');",
    ].join('\n') },
  // REVEAL's dedicated mutant (plan §9): route the browse→overlay ABORT reveal through
  // the paint-gated hold instead of the plain dropPanes() path. Widening the abort-hold
  // condition to fire on every abort (not just a browse->browse rerender) makes the
  // browse→overlay abort hold its ghost past finalize awaiting a paint frame.
  { name: 'stage6f REVEAL: the browse→overlay abort reveal is routed through the paint-gated hold instead of the plain no-hold path (-> REVEAL no-hold test)',
    from: "        if (!commit && cur.finPlan.abortRender === 'rerender') {",
    to:   "        if (!commit) {" },
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
  { name: 'stage6i ABORT: setView stops re-parking #home when the target view is not home (-> ABORT parked-after test; also DP.browse-home)',
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
  { name: 'stage6i GHOSTSCROLL: the outgoing app-ghost reverts to reading window.scrollY for a HOME source (-> GHOSTSCROLL equals-500 test)',
    file: 'js/swipe.js',
    from: "      const ghostY = fromKind === 'home' ? (doc.getElementById('home').scrollTop || 0) : (env.scrollY() || 0);",
    to:   "      const ghostY = env.scrollY() || 0;" },
  { name: 'stage6i HOMEFIXED: the active #home rule drops position:fixed/overflow-y (-> HOMEFIXED source-text test)',
    file: 'css/app.css',
    from: '#home {\n  position: fixed; left: 0; right: 0;',
    to:   '#home {\n  left: 0; right: 0;' },
  // stable-height PROBE (PLAN-stableheight-probe.md) — replaces the .265 clamp mutation (whose
  // scrollTo(0,0) anchor is deleted). Three defenders for the STABLEHEIGHT cell's load-bearing
  // assertions: (A) the pin-set (before the #browse hide), (B) the →browse clear, (C) the
  // no-.265-pre-empt guard.
  { name: 'clamp-probe A: the .app min-height pin is omitted on →home (no stable-height hold before the collapse) (-> STABLEHEIGHT pin-set + order)',
    file: 'js/nav.js',
    from: "        if (appEl) appEl.style.minHeight = appEl.scrollHeight + 'px';",
    to:   "        /* mutated: .app min-height pin omitted */" },
  { name: 'clamp-probe B: the →browse min-height clear is omitted (a short browse page over-scrolls into empty space) (-> STABLEHEIGHT clear-on-browse)',
    file: 'js/nav.js',
    from: "      if (v === 'browse' && appEl) appEl.style.minHeight = '';",
    to:   "      /* mutated: →browse min-height clear omitted */" },
  { name: 'clamp-probe C: the .265 window.scrollTo(0,0) pre-empt is re-added on →home (the delta the probe removes) (-> STABLEHEIGHT no-scrollTo(0,0))',
    file: 'js/nav.js',
    from: "        if (appEl) appEl.style.minHeight = appEl.scrollHeight + 'px';",
    to:   "        window.scrollTo(0, 0);\n        if (appEl) appEl.style.minHeight = appEl.scrollHeight + 'px';" },
];

// Exported so a TEST can check every anchor still matches the source. A mutation
// whose anchor has rotted silently stops testing anything — mutate.mjs exits nonzero
// when you run it by hand, but nobody runs all eleven by hand, so the rot is
// invisible until someone needs the mutation and finds it dead.
export { MUTATIONS, DEFAULT_FILE };

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
  const from = part.from.replace(/\r\n/g, '\n');
  const src = byFile.get(f);
  if (!src.includes(from)) {
    console.error(`ANCHOR NOT FOUND for #${i} in ${f} — mutation NOT applied`);
    process.exit(1);
  }
  byFile.set(f, src.replace(from, part.to.replace(/\r\n/g, '\n')));
}
for (const [f, src] of byFile) fs.writeFileSync(f, src);
console.log(`applied #${i} [${FILE}]: ${m.name}`);

}   // end CLI guard

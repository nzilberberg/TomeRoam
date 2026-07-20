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
    from: 'if (!cur.live) return;', to: 'if (false) return;' },
  { name: 'swipe: touchcancel no longer shares onEnd (-> I19 DRAGGING commit test)',
    from: "target.addEventListener('touchcancel', onEnd, { passive: true });",
    to: "target.addEventListener('touchcancel', () => {}, { passive: true });" },
  { name: 'swipe: begin() stops hard-resetting a superseded session (-> I2/I20 pane test)',
    from: "d = null; resetSwipeStyles(); applyScreen(currentDesc(), { render: false });",
    to: '/* mutated: no hard reset */' },
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

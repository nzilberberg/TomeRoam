#!/usr/bin/env node
// gen-swipe-model.mjs — STAGE 1 of PLAN-swipe-reveal.md: freeze the swipe/reveal model.
//
// WHY THIS IS GENERATED AND NOT WRITTEN. Plan §8C: "DERIVE, DO NOT READ." The pane
// inventory was hand-written twice and wrong twice; the iOS-26 label on the 1px Home
// scroll was wrong in two drafts; touchcancel routing contradicted itself in draft 4;
// I11 was unsatisfiable through draft 5. Every one concerned code the author had
// already read, and every one was caught by review rather than by the author. So the
// model is emitted from the source of truth, and the regions this file MIRRORS are
// fingerprinted — if they move, this document stops being trustworthy and says so.
//
//   node tools/gen-swipe-model.mjs            # write docs/swipe-model.generated.txt
//   node tools/gen-swipe-model.mjs --print    # stdout only
//
// The registry, the structural matrix and the transition predicate are IMPORTED from
// gen-transition-matrix.mjs (build .215's gate) rather than reimplemented — two copies
// of a derivation is exactly the drift this discipline exists to prevent.
//
// ⚠️ NOT EVERYTHING HERE IS PARITY (plan §8A). Every row carries a `basis`:
//     parity   — verified against a named region of js/app.js, reproduced as-is
//     policy   — NEW behaviour the rewrite must CLOSE; today it is undefined
//   A future session must be able to tell, without reading this generator, which
//   rows describe what the code does and which describe what it should do.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { registry, planFor, sourceFingerprint } from './gen-transition-matrix.mjs';

// Re-exported so the frozen model is a single entry point: a consumer should never
// have to know which of the two generators owns which half of the derivation.
export { registry, planFor, sourceFingerprint };

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');

// ---- fingerprints of the regions this model mirrors --------------------------------
// Same weak link as the transition matrix: this file reimplements conditions rather
// than executing them. Pinning the source region makes the reimplementation falsifiable.
function regionHash(src, startNeedle, endNeedle, label) {
  const a = src.indexOf(startNeedle);
  const b = src.indexOf(endNeedle, a + 1);
  if (a < 0 || b <= a) throw new Error(`region not found in js/app.js: ${label}`);
  const region = src.slice(a, b).replace(/\s+/g, ' ').trim();
  return crypto.createHash('sha256').update(region).digest('hex').slice(0, 16);
}

/** The navTo() stack rule — replace-vs-push. Drives descriptor stack effects (§4.3). */
export function navToFingerprint() {
  return regionHash(read('js/app.js'), 'function navTo(desc', 'function goBack()', 'navTo');
}
/** begin()'s edge/direction/destination selection. Drives navigation relations (§2.6.2). */
export function navRelationFingerprint() {
  return regionHash(read('js/app.js'), 'const fromLeft = x <= EDGE', 'if (!dest) return;', 'begin/nav-relation');
}
/** end()'s state routing — the I19 parity claim (ARMED finishes, DRAGGING settles). */
export function gestureEndFingerprint() {
  return regionHash(read('js/app.js'), 'function end() {', 'function settle(cur, commit)', 'end');
}
/** begin()'s supersession guard + hard reset — the I17/I20 parity claim. */
export function supersessionFingerprint() {
  return regionHash(read('js/app.js'), 'function begin(x, y, target) {', 'if (target.closest', 'begin/supersede');
}

// ---- descriptors (§4.3) -------------------------------------------------------------
// Two registry entries are PARAMETERIZED: authorBooks carries an author, files carries
// a book (browse.js keys them 'author:<rk>' / 'files:<rk>').
export const D = {
  home: () => ({ v: 'home' }),
  books: () => ({ v: 'books' }),
  authors: () => ({ v: 'authors' }),
  authorBooks: (author) => (author === undefined ? { v: 'authorBooks' } : { v: 'authorBooks', author }),
  files: (book) => (book === undefined ? { v: 'files' } : { v: 'files', book }),
  overlay: (v) => ({ v }),
};

export const label = (d) => {
  if (d.v === 'authorBooks') return `authorBooks(${d.author === undefined ? '—' : d.author})`;
  if (d.v === 'files') return `files(${d.book === undefined ? '—' : d.book})`;
  return `${d.v}()`;
};

/** A parameterized descriptor missing its payload must be REJECTED, never planned. */
export function validate(d) {
  if (d.v === 'authorBooks' && d.author === undefined) {
    return { ok: false, reason: 'malformed-descriptor:authorBooks-without-author' };
  }
  if (d.v === 'files' && d.book === undefined) {
    return { ok: false, reason: 'malformed-descriptor:files-without-book' };
  }
  return { ok: true, reason: null };
}

// MIRRORS js/app.js navTo():
//   if (cur && cur.v === desc.v && !desc.author && !desc.book) navStack[len-1] = desc;
//   else navStack.push(desc);
// NOTE the guard tests the PRESENCE of author/book, not their identity — so
// authorBooks('A') over authorBooks('A') PUSHES just as authorBooks('B') does.
export function stackEffect(cur, next) {
  return cur && cur.v === next.v && !next.author && !next.book ? 'replace' : 'push';
}

// A back-swipe from `top` to `below` needs the stack to read [... below, top]. That
// arrangement can only arise if navigating to `top` while on `below` APPENDED. If
// navTo REPLACED instead, the two can never be adjacent — unreachable by construction.
//
// ⚠️ THIS IS ONLY SOUND BECAUSE OF THE CENSUS BELOW. navTo is NOT the only site that
// appends to navStack, and an earlier draft of this generator claimed it was — the
// same confident-error shape §8B warns about. The four append sites are:
//   navTo         guarded by the replace rule above
//   openSub       pushes a SETTINGS SUB onto Options; the pushed `v` is never 'options'
//   commit/newNav pushes files(...) onto nowplaying only (begin() requires from===NP)
//   fwd-replay    pushes back an entry popped from navStack, restoring prior adjacency
// The invariant that actually holds is therefore: EVERY append path either applies
// navTo's replace guard, or appends a descriptor whose `v` differs from the current
// top. A new append site could break that silently, so it is pinned by census.
export function backReachable(top, below) {
  return stackEffect(below, top) === 'push';
}

/**
 * Every screen NAME that appears in a production descriptor literal or nav control.
 *
 * ⚠️ WHY THIS EXISTS, stated honestly: registry() is only PARTLY derived. It reads the
 * settings sub-screens from Nav.SETTINGS_SUBS, but home / books / authors / authorBooks
 * / files / options / nowplaying are HAND-LISTED there. So a future browse-family or
 * overlay screen could be added and the inventory would silently omit it — an external
 * review of .218 pointed out that the gate's name claimed more than its implementation
 * delivered. The honest fix at this stage is a PIN, not a claim of derivation: a real
 * production screen registry exported by Nav would be the proper answer, but that is a
 * production change and stages 1-2 deliberately touch no production code.
 *
 * Scans descriptor literals (`v: 'name'`) in app.js and nav.js and the bottom-nav
 * controls in index.html. A new screen has to show up in at least one of these.
 */
// Names that match the scan but are NOT screens. Listed explicitly, with a reason, so
// the exclusion is reviewable — a silent filter is how a census stops meaning anything.
export const NOT_SCREENS = {
  app: 'history.replaceState({ v: \'app\' }) — a history state, not a screen descriptor',
};

export function screenNameCensus() {
  const names = new Set();
  for (const rel of ['js/app.js', 'js/nav.js']) {
    for (const m of read(rel).matchAll(/\bv:\s*'([A-Za-z][A-Za-z0-9]*)'/g)) names.add(m[1]);
  }
  for (const m of read('index.html').matchAll(/data-nav="([A-Za-z][A-Za-z0-9]*)"/g)) names.add(m[1]);
  return [...names].filter((n) => !(n in NOT_SCREENS)).sort();
}

/**
 * Every line in js/app.js that APPENDS to or REBINDS navStack. Pinned by the test so a
 * newly added append site invalidates the reachability derivation loudly instead of
 * quietly making this document wrong.
 */
export function navStackAppendCensus() {
  const src = read('js/app.js').split('\n');
  const out = [];
  src.forEach((text, i) => {
    if (/navStack\.push\(|navStack\s*=\s*\[|navStack\[navStack\.length - 1\]\s*=/.test(text)) {
      out.push({ line: i + 1, text: text.trim() });
    }
  });
  return out;
}

const kindOf = (() => {
  const byName = new Map(registry().map((s) => [s.v, s]));
  return (d) => {
    const e = byName.get(d.v);
    if (!e) throw new Error(`descriptor ${d.v} is not in the derived registry`);
    return e;
  };
})();

/** Full outcome for one ordered descriptor pair. No default branch — everything named. */
export function scenarioFor(from, to) {
  const vf = validate(from), vt = validate(to);
  if (!vf.ok) return { status: 'rejected', reason: `source ${vf.reason}` };
  if (!vt.ok) return { status: 'rejected', reason: `destination ${vt.reason}` };
  if (from.v === 'home' && to.v === 'home') return { status: 'rejected', reason: 'not-a-transition:home-to-home' };
  const p = planFor(kindOf(from), kindOf(to));
  return {
    status: 'planned',
    outgoing: p.outgoing, incoming: p.incoming, pane: p.pane, abortRender: p.abortRender,
    decorations: p.decorations,
    stackEffectOnForward: stackEffect(to, from),   // navigating TO `from` while on `to`
    backReachable: backReachable(from, to),
    degenerate: JSON.stringify(from) === JSON.stringify(to) ? 'source and destination are semantically equal' : null,
  };
}

// ---- the frozen policy tables -------------------------------------------------------
// basis: 'parity' rows reproduce today's behaviour and name where it was verified.
//        'policy' rows are NEW — today these paths are undefined (plan §8A).

/** §3.7 / I19 — gesture-ending inputs route by STATE, not by input. */
export const GESTURE_END_BY_STATE = [
  { state: 'ARMED', outcome: 'finish, NO navigation, release listeners, remain on source',
    basis: 'parity', where: 'end(): releaseGesture() then returns at `if (!cur.live)`' },
  { state: 'DRAGGING', outcome: 'ordinary travel+velocity decision via settleSession(); touchcancel CAN commit',
    basis: 'parity', where: 'touchcancel binds the SAME onEnd as touchend' },
  { state: 'SETTLING or later', outcome: 'ignore as a stale duplicate event',
    basis: 'parity', where: 'end() returns at `if (!d)` — d is nulled before settle()' },
];

/** §3.7 — normal and abnormal termination reasons. */
export const TERMINATION = [
  { reason: 'vertical-intent (pre-drag)', nav: 'unchanged', screen: 'source', scroll: 'unchanged', pane: 'none built',
    basis: 'parity', where: 'move(): releaseGesture(); d = null; return — before start()' },
  { reason: 'touch-cancel (dragging)', nav: 'settle decision', screen: 'from decision', scroll: 'commit/abort', pane: 'normal settle',
    basis: 'parity', where: 'touchcancel shares onEnd with touchend' },
  { reason: 'hard-reset (leftover)', nav: 'unchanged', screen: 'currentDesc()', scroll: 'NOT restored today', pane: 'dispose orphan',
    basis: 'parity', where: 'begin(): releaseGesture, dropRowHold, d=null, resetSwipeStyles, applyScreen({render:false})' },
];

/** §3.7 — recovery is keyed on PHASE, never on reason. ALL ROWS ARE NEW POLICY. */
export const RECOVERY = [
  { phase: 'pre-stack', nav: 'unchanged', screen: 'restore source', scroll: 'restore session start', basis: 'policy' },
  { phase: 'post-stack', nav: 'stack authoritative', screen: 'render current stack top', scroll: 'destination policy', basis: 'policy' },
];
export const RECOVERY_REASONS = ['lease-invalid', 'destination-gone', 'finalize-threw', 'superseded'];

/** §3.4 — the only reasons a pane may be disposed rather than released. */
export const DISPOSE_REASONS = ['superseded', 'lease-invalid', 'finalize-threw', 'hard-reset', 'destination-gone'];

/**
 * §8A — the COMPLETE set of new-policy repairs, as structured data. Everything NOT in
 * this list is preserved deliberately (parity). The §10 ledger and the render() prose
 * are both derived from here, so they cannot drift apart — and the gate asserts this
 * EXACT set, so silently dropping one (e.g. reverting the .219 source-content repair
 * back to [parity]) fails the test rather than quietly regenerating a clean document.
 * That drift is exactly what the .219 review caught by hand; this makes it mechanical.
 */
export const NEW_POLICIES = [
  { id: 'phase-aware-recovery',
    text: 'the recovery table (§7), pre/post-stack, all reasons' },
  { id: 'supersession-restore-scroll',
    text: 'restoring the starting scroll when a gesture is SUPERSEDED' },
  { id: 'supersession-rerender-source',
    text: 're-rendering the SOURCE into #browse when a gesture is SUPERSEDED '
        + '(added after review of .218 found the first draft had labelled it [parity])' },
];

/** §2.6 — the four previously-unresolved rules, resolved from code. */
export const RESOLVED_RULES = [
  { rule: 'NP pill', statement: 'cloned when nowplaying is EITHER endpoint; a third mover with the same lifetime as outgoing/incoming; from NP -> base 0 and body loses np-locked; to NP -> base off',
    basis: 'parity', where: 'start(): pill built in both the fromV and toV nowplaying branches' },
  { rule: 'navigation relation', statement: 'back = left edge, dest navStack[len-2]; new-forward = right edge FROM nowplaying only -> filesDescForCurrent(), newNav, commit PUSHES and CLEARS fwdStack; forward-replay = right edge otherwise, dest fwdStack top; a back commit pushes the popped entry onto fwdStack',
    basis: 'parity', where: 'begin(): the fromLeft / from.v===nowplaying / fwdStack.length branch chain' },
  { rule: 'overlay->overlay reachability', statement: 'ESTABLISHED, not deferred: openSub() pushes a sub-screen ON TOP of Options, so a left-edge swipe yields e.g. general->options directly. Button navigation between overlays uses Nav.overlayFilmstrip(), a DIFFERENT path this plan does not touch and must not assume shares code',
    basis: 'parity', where: 'openSub(): navStack.push({v}) while currentDesc().v === options' },
  { rule: 'scroll policy', statement: 'FROZEN FOR PARITY. Home entry uses window.scrollTo(0,1) when resetScroll is set. This is NOT an iOS-26 runway requirement — nav.js says the navbar seater is body.home-tall and the 1px is a remnant of the abandoned runway theory. Stage 1 does NOT decide whether the 1px survives; remove it AFTER device parity in a separate commit',
    basis: 'parity', where: 'nav.js: body.home-tall seating comment; plan §2.6.4 / T12' },
];

/** §2.6.4 — the plan states policy; Browse resolves coordinates. */
export const SCROLL_POLICY = {
  onCommit: 'destination-entry', onAbort: 'restore-session-start',
  overlay: 'preserve-document', reveal: 'destination-final',
};

// ---- rendering ----------------------------------------------------------------------
const pad = (s, n) => String(s).padEnd(n);

export function render() {
  const screens = registry();
  const L = [];
  const P = (s = '') => L.push(s);

  P('SWIPE / REVEAL — FROZEN MODEL (PLAN-swipe-reveal.md stage 1)');
  P('GENERATED, DO NOT EDIT.  Regenerate: node tools/gen-swipe-model.mjs');
  P('Guarded by: test/swipe-model.test.js');
  P('');
  P('Every row below is one of:');
  P('  [parity] reproduces what js/app.js does today, verified at the named region');
  P('  [policy] NEW behaviour the rewrite must CLOSE — today this path is UNDEFINED');
  P('');
  P('SOURCE FINGERPRINTS — if one changes, the mirrored rule must be RE-VERIFIED');
  P('before this document is trusted again. Never update a pinned constant alone.');
  P(`  transition branches   ${sourceFingerprint()}`);
  P(`  navTo stack rule      ${navToFingerprint()}`);
  P(`  begin/nav-relation    ${navRelationFingerprint()}`);
  P(`  end/state-routing     ${gestureEndFingerprint()}`);
  P(`  begin/supersession    ${supersessionFingerprint()}`);
  P('');
  P('1. REGISTRY — PARTLY DERIVED, PARTLY PINNED (say which, and mean it)');
  P(`   ${screens.length} screens, ${screens.length * (screens.length - 1)} ordered name pairs.`);
  P('   DERIVED  the settings sub-screens, read from Nav.SETTINGS_SUBS.');
  P('   PINNED   home, books, authors, authorBooks, files, options, nowplaying are');
  P('            hand-listed in the generator. A future browse-family or overlay screen');
  P('            would NOT appear here on its own — so the screen-name census below is');
  P('            what makes its absence loud. This is a pin, not a derivation, and an');
  P('            external review of .218 was right that the earlier wording claimed');
  P('            more than the implementation delivered. The proper fix is one screen');
  P('            registry exported by Nav; that is a PRODUCTION change, and stages 1-2');
  P('            touch no production code.');
  P('   census (every screen name in a production descriptor literal or nav control):');
  P(`     ${screenNameCensus().join(' ')}`);
  for (const [n, why] of Object.entries(NOT_SCREENS)) P(`   excluded: ${n} — ${why}`);
  P('   (A settings sub-screen may still SHOW UP in the census when some other literal');
  P('    or nav control names it — `downloads` does, via the book-menu control. But the');
  P('    census does not RELY on that: every sub is derived from SETTINGS_SUBS, so one');
  P('    that appears in no literal is still in the registry. openSub pushes { v } from');
  P('    a VARIABLE, which is why the subs cannot be counted on to appear here.)');
  P('   The structural matrix lives in docs/transition-matrix.generated.txt and is');
  P('   imported here rather than restated — one derivation, one home.');
  P('');
  P('2. DESCRIPTOR SCENARIOS (§4.3) — names are NOT enough');
  P('   navTo REPLACES the stack top when `v` matches AND the descriptor carries');
  P('   neither `author` nor `book`; otherwise it PUSHES. The guard tests PRESENCE,');
  P('   not identity, so authorBooks(A) over authorBooks(A) pushes just like (B).');
  P('   Consequence, derived rather than asserted: a pair whose forward navigation');
  P('   REPLACES can never occupy two adjacent stack slots, so it is UNREACHABLE as a');
  P('   back-swipe. That is why 132 name pairs cannot express this space.');
  P('');
  P('   ⚠️ That derivation is only sound because of the append census below. navTo is');
  P('   NOT the only site that appends to navStack. The invariant that actually holds:');
  P('   EVERY append path either applies navTo\'s replace guard, or appends a descriptor');
  P('   whose `v` differs from the current top. A new append site would break this');
  P('   silently, so the sites are pinned:');
  for (const c of navStackAppendCensus()) P(`     js/app.js:${pad(c.line, 5)} ${c.text}`);
  P('');
  const scenarios = [
    ['different type', D.books(), D.authors()],
    ['same type, different identity', D.authorBooks('A'), D.authorBooks('B')],
    ['same type, different identity', D.files('A'), D.files('B')],
    ['same semantic descriptor', D.books(), D.books()],
    ['same parameterized identity', D.authorBooks('A'), D.authorBooks('A')],
    ['browse -> home', D.books(), D.home()],
    ['home -> browse', D.home(), D.books()],
    ['overlay -> overlay', D.overlay('general'), D.overlay('options')],
    ['overlay -> browse', D.overlay('options'), D.books()],
    ['browse -> overlay', D.books(), D.overlay('nowplaying')],
    ['nowplaying -> files (new-forward)', D.overlay('nowplaying'), D.files('A')],
    ['malformed payload', D.authorBooks(), D.books()],
    ['malformed payload', D.books(), D.files()],
    ['not a transition', D.home(), D.home()],
  ];
  P('   case                              from -> to                              result');
  P('   --------------------------------  --------------------------------------  ------------------------');
  for (const [name, from, to] of scenarios) {
    const s = scenarioFor(from, to);
    const pair = `${label(from)} -> ${label(to)}`;
    const out = s.status === 'rejected'
      ? `REJECTED ${s.reason}`
      : `pane=${s.pane ? 'yes' : 'no '} abort=${pad(s.abortRender, 8)} back=${s.backReachable ? 'reachable' : 'UNREACHABLE'}`;
    P(`   ${pad(name, 32)}  ${pad(pair, 38)}  ${out}`);
  }
  P('');
  P('   Two independently allocated but semantically equal descriptors classify');
  P('   identically — the model keys on VALUE, never on object identity.');
  P('');
  P('3. THE FOUR RESOLVED RULES (§2.6)');
  for (const r of RESOLVED_RULES) {
    P(`   [${r.basis}] ${r.rule}`);
    for (const line of wrap(r.statement, 68)) P(`        ${line}`);
    P(`        verified at: ${r.where}`);
  }
  P('');
  P('   scroll policy object (plan states policy; Browse resolves coordinates):');
  for (const [k, v] of Object.entries(SCROLL_POLICY)) P(`        ${pad(k, 10)} ${v}`);
  P('');
  P('4. GESTURE-ENDING INPUTS, BY STATE (§3.7, I19)');
  P('   state              basis     outcome');
  P('   -----------------  --------  -------------------------------------------------');
  for (const g of GESTURE_END_BY_STATE) {
    P(`   ${pad(g.state, 17)}  ${pad('[' + g.basis + ']', 8)}  ${g.outcome}`);
    P(`   ${pad('', 17)}          at: ${g.where}`);
  }
  P('');
  P('5. SUPERSESSION — a new touch during ARMED or DRAGGING (§3.7, I20)');
  P('   [parity] PARITY IS SUPERSEDE, NOT REJECT. begin() rejects only while');
  P('            `finishing` is true; otherwise it hard-resets and arms the new');
  P('            gesture. I17(a) is the separate rule: while an active session is');
  P('            SETTLING / FINALIZING / REVEALING a new gesture does NOT arm, and');
  P('            that session\'s pane is NOT disposed to make room (I10 must hold).');
  P('   [parity] What today ACTUALLY does on supersession: releaseGesture, dropRowHold,');
  P('            d = null, resetSwipeStyles, applyScreen(currentDesc(), {render:false}).');
  P('            Listeners, row hold, panes and inline styles are all released; the nav');
  P('            stack and navbar return to the source. Movers are torn down BY');
  P('            OWNERSHIP (§3.2) — panes disposed, decorations removed, borrowed real');
  P('            views restored and NEVER removed.');
  P('');
  P('   ⚠️ TWO SEPARATE DEFECTS live here, and BOTH are new policy. An earlier draft of');
  P('   this document labelled the whole of supersession [parity]; that was wrong, and');
  P('   an external review of .218 caught it. The pre-stack recovery row this section');
  P('   leans on is itself [policy], so "recovered pre-stack" cannot be parity.');
  P('');
  P('   [policy] (1) SCROLL. Today\'s hard reset does NOT restore the starting scroll,');
  P('            so a superseded browse->browse drag can be left at the DESTINATION\'s');
  P('            scroll (its mid-drag render ran positionOnEnter).');
  P('   [policy] (2) SOURCE CONTENT. `render:false` means nothing re-renders the source');
  P('            into the shared #browse, so the host keeps the DESTINATION\'s content');
  P('            while the stack and navbar say source. MEASURED at .218:');
  P('            renders = ["books","authors","books"] after Authors->Books is');
  P('            superseded. That is an I11 violation and the same wrong-page/wrong-tap');
  P('            class as .178 — the nav says one screen and Browse shows another.');
  P('            Both are covered by `{todo}` tests in test/swipe-invariants.test.js.');
  P('');
  P('6. TERMINATION REASONS (§3.7)');
  P('   reason                      basis     nav              screen        scroll              pane');
  P('   --------------------------  --------  ---------------  ------------  ------------------  --------------');
  for (const t of TERMINATION) {
    P(`   ${pad(t.reason, 26)}  ${pad('[' + t.basis + ']', 8)}  ${pad(t.nav, 15)}  ${pad(t.screen, 12)}  ${pad(t.scroll, 18)}  ${t.pane}`);
  }
  P('');
  P('7. RECOVERY — ONE RULE, KEYED ON PHASE (§3.7, I18)');
  P(`   reasons: ${RECOVERY_REASONS.join(' | ')}`);
  P('   There are NO per-reason screen/scroll rules. After the stack has been mutated');
  P('   the stack is authoritative, for every reason alike.');
  P('   phase        basis     navigation           screen                    scroll');
  P('   -----------  --------  -------------------  ------------------------  ----------------------');
  for (const r of RECOVERY) {
    P(`   ${pad(r.phase, 11)}  ${pad('[' + r.basis + ']', 8)}  ${pad(r.nav, 19)}  ${pad(r.screen, 24)}  ${r.scroll}`);
  }
  P('   [policy] ALL RECOVERY ROWS ARE NEW. Today finalization has a try/finally for');
  P('            the row hold and nothing else. These are gaps the rewrite must CLOSE,');
  P('            not behaviour it must reproduce.');
  P('');
  P('8. PANE DISPOSAL (§3.4) — release is the normal path, dispose is the emergency');
  P(`   permitted dispose reasons: ${DISPOSE_REASONS.join(', ')}`);
  P('   pane.release()       ONLY from reveal(), ONLY after under-view readiness AND');
  P('                        the paint barrier (I10).');
  P('   pane.dispose(reason) idempotent emergency teardown; bypasses I10 deliberately.');
  P('');
  P('9. AUTHORITATIVE SETTLED DESCRIPTOR (I11) — selected by OUTCOME, not by stack');
  P('   commit              -> the committed destination');
  P('   abort               -> the original source');
  P('   pre-stack recovery  -> the original source');
  P('   post-stack recovery -> the current stack top');
  P('   hard reset          -> currentDesc()');
  P('   Draft 5 said "destination descriptor", which is IMPOSSIBLE on an abort: the');
  P('   destination is precisely the thing NOT navigated to.');
  P('');
  P('10. PARITY vs NEW POLICY LEDGER (§8A) — the short answer');
  P('    NEW POLICY, and only these (derived from NEW_POLICIES, asserted exactly by');
  P('    the gate so none can be silently dropped):');
  for (const p of NEW_POLICIES) for (const line of wrap('- ' + p.text, 66)) P(`      ${line}`);
  P('    Everything else in this document is preserved deliberately, including the');
  P('    1px Home entry scroll and the overlay->browse hidden-host side effect');
  P('    (abort leaves #browse holding the destination\'s content; canonicalizing it');
  P('    is a SEPARATE cleanup after parity).');
  return L.join('\n') + '\n';
}

function wrap(s, n) {
  const words = s.split(' ');
  const out = []; let line = '';
  for (const w of words) {
    if ((line + ' ' + w).trim().length > n) { out.push(line.trim()); line = w; }
    else line += ' ' + w;
  }
  if (line.trim()) out.push(line.trim());
  return out;
}

const invokedDirectly = process.argv[1] && process.argv[1].endsWith('gen-swipe-model.mjs');
if (invokedDirectly) {
  const out = render();
  if (process.argv.includes('--print')) process.stdout.write(out);
  else {
    const dest = path.join(ROOT, 'docs', 'swipe-model.generated.txt');
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, out);
    console.log('wrote docs/swipe-model.generated.txt');
  }
}

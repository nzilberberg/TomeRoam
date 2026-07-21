// GATE — the frozen swipe/reveal model (PLAN-swipe-reveal.md stage 1).
//
// WHY. Plan §8B: the model in §2 was WRONG THREE TIMES before it was right — the pane
// inventory in drafts 1 and 2, the iOS-26 label on the 1px Home scroll in drafts 2 and
// 3, touchcancel routing contradicting itself in draft 4, I11 unsatisfiable through
// draft 5. Every one concerned code the author had already read; every one was caught
// by review, none by the author. Prose about this subsystem is a guess until executed.
//
// So the model is GENERATED and this file guards four separate things:
//   1. the committed document is exactly what the generator produces (no hand edits);
//   2. every js/app.js region the generator MIRRORS is fingerprinted, so a change to
//      the real conditions invalidates the document loudly instead of silently;
//   3. the navStack APPEND CENSUS is pinned — the reachability derivation is only
//      sound while every append path either applies navTo's replace guard or appends a
//      `v` that differs from the top, and a new append site could break that quietly;
//   4. the PARITY vs POLICY ledger (§8A) — a new [policy] row cannot be smuggled in
//      without updating the ledger that tells a future session what is a behaviour
//      change and what is preserved deliberately.
//
// A fingerprint failure does NOT mean the code is wrong. It means the mirrored rule
// must be RE-VERIFIED against js/app.js before the document can be trusted again.
// Never update a pinned constant alone.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { ROOT } = require('./dom-fixture.js');

const GENERATED = path.join(ROOT, 'docs', 'swipe-model.generated.txt');
const load = () => import(pathToFileURL(path.join(ROOT, 'tools', 'gen-swipe-model.mjs')).href);
const lf = (s) => s.replace(/\r\n/g, '\n');

// Verified line by line against js/app.js on 2026-07-20, at the regions named in each
// generator export. Update ONLY together with a re-verification.
const VERIFIED = {
  navTo: '0e84abdf6d072586',
  navRelation: 'ac356cd1a669c2a3',
  gestureEnd: 'f1d6b8391fa4ad57',
  // Re-verified 2026-07-20 for stage 3 (session owner). The region text changed —
  // begin()'s hard reset gained `session = null`, the log gained `sid=`, and its
  // comment was corrected — but the SEMANTICS the model mirrors did NOT: supersession
  // is still reject-while-finishing, else hard-reset-and-arm (frozen model §5). So the
  // parity claim stands and only the pin moves. Was 'a470962594518cb9' (pre-stage-3),
  // then 'd455d0d197ea3af8' (before the comment fix).
  supersession: 'c70d4ed49257af8e',
};

// Every line in js/app.js that appends to or rebinds navStack, as it stood when the
// reachability derivation was verified. A NEW entry here invalidates that derivation
// until it is re-checked: does the new site apply navTo's replace guard, or does it
// append a descriptor whose `v` differs from the current top?
// ⚠️ This list was hand-written and was WRONG on its first draft — it omitted the
// sign-out reset at the bottom, because the excerpt being eyeballed was truncated
// exactly there. The gate caught it immediately. That is the fourth time in this
// subsystem's history that a hand-read inventory was wrong, and the reason the
// document itself is generated rather than written.
const VERIFIED_APPEND_SITES = [
  "let navStack = [{ v: 'home' }];",                      // root binding
  "if (cur && cur.v === desc.v && !desc.author && !desc.book) navStack[navStack.length - 1] = desc;",
  'else navStack.push(desc);',                            // navTo, guarded by the line above
  'navStack.push({ v }); fwdStack.length = 0;',           // openSub — pushed `v` is never 'options'
  'else if (cur.newNav) { navStack.push(cur.dest); fwdStack.length = 0; }   // NP → chapters is a fresh forward nav',
  'else navStack.push(fwdStack.pop());',                  // forward replay — restores prior adjacency
  "navStack = [{ v: 'home' }];",                          // sign-out reset — rebind, not an append
];

test('the committed model is exactly what the generator produces', async () => {
  const gen = await load();
  const committed = lf(fs.readFileSync(GENERATED, 'utf8'));
  assert.equal(lf(gen.render()), committed,
    'docs/swipe-model.generated.txt is stale or was hand-edited. '
    + 'Run: node tools/gen-swipe-model.mjs');
});

test('every mirrored js/app.js region still matches what was verified', async () => {
  const gen = await load();
  const actual = {
    navTo: gen.navToFingerprint(),
    navRelation: gen.navRelationFingerprint(),
    gestureEnd: gen.gestureEndFingerprint(),
    supersession: gen.supersessionFingerprint(),
  };
  for (const [name, want] of Object.entries(VERIFIED)) {
    assert.equal(actual[name], want,
      `js/app.js's ${name} region CHANGED. The generator reimplements those conditions `
      + 'rather than executing them, so the frozen model can no longer be trusted for '
      + 'that rule. Re-verify the mirrored rule in tools/gen-swipe-model.mjs against '
      + 'js/app.js, regenerate, and update VERIFIED in the same commit.');
  }
});

test('the navStack append census is unchanged, so reachability still derives', async () => {
  const gen = await load();
  const sites = gen.navStackAppendCensus().map((c) => c.text);
  assert.deepEqual(sites, VERIFIED_APPEND_SITES,
    'js/app.js gained or lost a navStack append site. The "unreachable by construction" '
    + 'results in the frozen model assume EVERY append path either applies navTo\'s '
    + 'replace guard or appends a descriptor whose `v` differs from the current top. '
    + 'Re-check the new site against that invariant before regenerating.');
});

// registry() is only PARTLY derived — SETTINGS_SUBS is read from nav.js, the other
// seven screens are hand-listed. An external review of .218 was right that the gate's
// wording claimed full derivation. Until a production screen registry exists (a
// production change, out of scope for stages 1-2) this census is the honest substitute:
// a new screen has to appear in a descriptor literal or a nav control, and that turns
// this red.
const VERIFIED_SCREEN_NAMES = ['authorBooks', 'authors', 'books', 'downloads', 'files', 'home', 'nowplaying', 'options'];

test('the screen-name census is unchanged, so the PINNED half of the registry still holds', async () => {
  const gen = await load();
  assert.deepEqual(gen.screenNameCensus(), VERIFIED_SCREEN_NAMES,
    'a screen name appeared or vanished in production. registry() hand-lists everything '
    + 'except the settings subs, so it does NOT pick a new screen up on its own — '
    + 're-check registry() against this census before regenerating.');
});

test('census exclusions are named and justified, never silent', async () => {
  const gen = await load();
  for (const [name, why] of Object.entries(gen.NOT_SCREENS)) {
    assert.ok(why && why.length > 20, `exclusion "${name}" must carry a real reason, got: ${why}`);
  }
  // The exclusion must still be REACHABLE — an excuse that outlives what it excused is
  // just a hole. If `app` stops appearing in production, delete the exclusion.
  const raw = new Set();
  const fs2 = require('node:fs');
  for (const rel of ['js/app.js', 'js/nav.js']) {
    const src = fs2.readFileSync(path.join(ROOT, rel), 'utf8');
    for (const m of src.matchAll(/\bv:\s*'([A-Za-z][A-Za-z0-9]*)'/g)) raw.add(m[1]);
  }
  for (const name of Object.keys(gen.NOT_SCREENS)) {
    assert.ok(raw.has(name), `exclusion "${name}" no longer matches anything — delete it`);
  }
});

test('a malformed parameterized descriptor is REJECTED with a named reason, never planned', async () => {
  const { D, scenarioFor } = await load();
  const cases = [
    [D.authorBooks(), D.books(), 'authorBooks-without-author'],
    [D.books(), D.files(), 'files-without-book'],
  ];
  for (const [from, to, needle] of cases) {
    const s = scenarioFor(from, to);
    assert.equal(s.status, 'rejected', `${from.v}->${to.v} must be rejected, not planned`);
    assert.ok(s.reason && s.reason.includes(needle),
      `rejection reason must NAME the defect; got: ${s.reason}`);
  }
});

test('I16 — every registry pair either yields a plan or a NAMED rejection, no default branch', async () => {
  const gen = await load();
  const screens = gen.registry();
  const mk = (v) => (v === 'authorBooks' ? gen.D.authorBooks('A')
    : v === 'files' ? gen.D.files('A')
      : { v });
  const unnamed = [];
  let planned = 0, rejected = 0;
  for (const f of screens) {
    for (const t of screens) {
      const s = gen.scenarioFor(mk(f.v), mk(t.v));
      if (s.status === 'planned') { planned++; continue; }
      if (s.status === 'rejected' && typeof s.reason === 'string' && s.reason.length) { rejected++; continue; }
      unnamed.push(`${f.v}->${t.v}`);
    }
  }
  assert.deepEqual(unnamed, [], `these pairs fell through with no named outcome: ${unnamed.join(', ')}`);
  // 12 screens => 144 ordered pairs including self-pairs; only home->home is rejected
  // as "not a transition". If that count moves, the registry or the rule changed.
  assert.equal(planned + rejected, screens.length * screens.length);
  assert.equal(rejected, 1, 'exactly one pair (home->home) should be rejected as not-a-transition');
});

test('a REPLACE-ing pair is unreachable as a back-swipe; a PUSH-ing one is reachable', async () => {
  const { D, stackEffect, backReachable } = await load();
  // books over books REPLACES -> can never be two adjacent stack entries.
  assert.equal(stackEffect(D.books(), D.books()), 'replace');
  assert.equal(backReachable(D.books(), D.books()), false);
  // The guard tests PRESENCE of author/book, not identity, so the same author pushes.
  assert.equal(stackEffect(D.authorBooks('A'), D.authorBooks('A')), 'push');
  assert.equal(backReachable(D.authorBooks('A'), D.authorBooks('A')), true);
  assert.equal(backReachable(D.authorBooks('A'), D.authorBooks('B')), true);
  // Different `v` always pushes.
  assert.equal(stackEffect(D.authors(), D.books()), 'push');
  assert.equal(backReachable(D.books(), D.authors()), true);
});

test('descriptors are compared by VALUE — two independently allocated equals classify alike', async () => {
  const { D, scenarioFor } = await load();
  const a = scenarioFor(D.authorBooks('A'), D.books());
  const b = scenarioFor(D.authorBooks('A'), D.books());
  assert.deepEqual(a, b, 'object identity must not affect classification');
});

// The §8A ledger is a PRIMARY stage-1 guarantee: it is the contract that says which
// behaviours are being preserved (parity) and which are deliberately changed (policy).
// An earlier version of this test only checked that the rendered document MENTIONED the
// scroll repair, so this regression would have passed silently: drop the source-content
// repair from the generator, regenerate, exact-document test passes, ledger test passes,
// and the model reverts to the exact misclassification the .219 review had just found.
// The fix (external review of .219): assert the EXACT set of new policies as data.
test('§8A ledger — the EXACT set of new policies, asserted as data not prose', async () => {
  const gen = await load();
  const ids = gen.NEW_POLICIES.map((p) => p.id).sort();
  assert.deepEqual(ids, [
    'phase-aware-recovery',
    'supersession-rerender-source',   // the .219 finding — must never fall out silently
    'supersession-restore-scroll',
  ], 'the set of new-policy repairs changed. If that is intended, update this assertion '
   + 'IN THE SAME COMMIT and say which classification moved and why — do not let the '
   + 'exact-document test bless a silent regeneration.');

  // Every new policy must actually appear in the rendered ledger, so the document and
  // the data cannot drift (the whole point of deriving §10 from NEW_POLICIES). Match on
  // a short stable head — the renderer word-wraps at 66 cols, so the full text is split
  // across lines and would never be a single substring.
  const out = gen.render().replace(/\s+/g, ' ');
  for (const p of gen.NEW_POLICIES) {
    const head = p.text.split(' ').slice(0, 4).join(' ');
    assert.ok(out.includes(head), `the §8A ledger must render the "${p.id}" policy; missing: ${head}`);
  }
  assert.ok(/1px Home entry scroll/.test(out),
    'the §8A ledger must still record the 1px Home scroll as deliberately preserved');

  // Recovery is entirely new policy: today finalization has a try/finally for the row
  // hold and nothing else.
  assert.ok(gen.RECOVERY.length > 0);
  for (const r of gen.RECOVERY) {
    assert.equal(r.basis, 'policy', `recovery row ${r.phase} must be labelled new policy`);
  }
  // Everything that claims parity must name where it was verified, or the label is an
  // assertion rather than a check.
  for (const row of [...gen.GESTURE_END_BY_STATE, ...gen.TERMINATION, ...gen.RESOLVED_RULES]) {
    assert.equal(row.basis, 'parity', `${row.state || row.reason || row.rule} should be parity`);
    assert.ok(row.where && row.where.length > 10,
      `a [parity] row must name the region it was verified at; ${row.state || row.reason || row.rule} does not`);
  }
});

test('the permitted pane-dispose reasons are a closed set', async () => {
  const gen = await load();
  assert.deepEqual([...gen.DISPOSE_REASONS].sort(),
    ['destination-gone', 'finalize-threw', 'hard-reset', 'lease-invalid', 'superseded'],
    'dispose() bypasses I10 deliberately, so its reasons must stay a closed, reviewed set');
  // Recovery reasons and dispose reasons overlap but are NOT the same set; recovery has
  // no 'hard-reset' (that is a begin()-time orphan cleanup, not a mid-flight failure).
  assert.ok(!gen.RECOVERY_REASONS.includes('hard-reset'));
});

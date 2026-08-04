// GATE — a device-gate item recorded as OWED must be RUNNABLE (name a Gesture and an Observable).
//
// THE INCIDENT. 2026-08-02: the parked-page plan filed device gate item 2 as a bare PROPERTY —
// "a page parked 3 viewports away retains its decoded cover bitmaps exactly as one parked 1.01
// viewports away does." When the user was finally asked to check it, the gesture was INVENTED at
// ask-time — "start a swipe into a book list and abort it, then watch the covers" — and the user
// replied: "if you abort the swipe into books you won't see the books. I don't understand." They
// were right; aborting that swipe returns to Home and reveals no covers. The wasted ask is the
// cheap half of the cost. The expensive half: deriving the gesture properly showed the property
// was close to unobservable BY CONSTRUCTION, a fact that would have changed the plan had it
// surfaced at filing time.
//
// A note in memory does not stop this recurring; the format check does.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { ROOT } = require('./dom-fixture.js');

const CHECKER = path.join(ROOT, 'tools', 'hooks', 'device-gate-check.mjs');

// The checker only considers files that LOOK like device records, so a fixture must live at a
// path matching that shape or the run is vacuous — it would "pass" by being ignored.
function runOn(contents) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'devgate-'));
  const nested = path.join(dir, 'Claude', 'Zelda');
  fs.mkdirSync(nested, { recursive: true });
  const file = path.join(nested, 'DEVICE-VERDICT-fixture.md');
  fs.writeFileSync(file, contents, 'utf8');
  const r = spawnSync(process.execPath, [CHECKER, file], { encoding: 'utf8' });
  fs.rmSync(dir, { recursive: true, force: true });
  return r;
}

// Verbatim shape of the defect: an OWED item that states only the property it wants confirmed.
const THE_DEFECT = `# Device gate verdict — fixture

### Item 1 — does the fix clear the reported garbage? **ANSWERED — PASS.**

The user could no longer reproduce it.

### Item 2 — iOS cover-bitmap retention at the new distance. **STILL OWED.**

That a page parked 3 viewports away retains its decoded cover bitmaps exactly as one parked
1.01 viewports away does. The bench cannot close it; only the device can.
`;

const THE_FIX = THE_DEFECT.replace(
  'That a page parked 3 viewports away',
  `**Gesture:** abort a swipe between two browse pages (NOT from Home into a list — that reveals
no covers). **Observable:** the returning list's covers visibly pop in / re-decode all at once.
**Source:** css/app.css:144 (the park rule), js/app.js:198 (EDGE/THRESH/FLICK_V).

That a page parked 3 viewports away`,
);

// ── The SECOND incident, 2026-08-03. Both of these carry Gesture AND Observable and are still
// unusable, because the UI they describe was imagined rather than read. Verbatim from what was
// actually sent to the user, who replied "another nonsense instruction. what is the step to
// follow?" — tapping a book opens its CHAPTER LIST; Now Playing opens only from the mini-player
// bar (js/app.js:2837). And "as fast as is comfortable" inverts the test: FLICK_V (js/app.js:198)
// makes a fast release COMMIT the swipe rather than abort it.
const IMAGINED_UI = `# Device gate verdict — fixture

### Item 3 — the repeated half-swipe. **OWED.**

- **Gesture:** on a long Books list, tap a book so Now Playing covers it, then half-swipe back
  from Now Playing and abort, repeatedly and as fast as is comfortable.
- **Observable:** the list gets progressively slower or emptier across the repeats.
`;

const PROSE_SOURCE = IMAGINED_UI.replace(
  '- **Observable:**',
  '- **Source:** the swipe handler in the app.\n- **Observable:**',
);

test('the gate REDDENS on an OWED item that names only a property', () => {
  const r = runOn(THE_DEFECT);
  assert.notStrictEqual(r.status, 0,
    'the fixture reproducing the 2026-08-02 incident was accepted — this gate is vacuous');
  assert.match(r.stderr, /Item 2/, 'the failure must name the offending item');
  assert.match(r.stderr, /Gesture and no Observable/,
    'the failure must say which fields are missing, not merely that something is wrong');
});

test('the gate PASSES once the item names a Gesture and an Observable', () => {
  const r = runOn(THE_FIX);
  assert.strictEqual(r.status, 0, 'a properly-filed item was rejected:\n' + r.stderr);
});

test('the gate REDDENS on an instruction whose UI was IMAGINED, not read', () => {
  // Gesture and Observable are both present. The two-field version accepted this, and the user
  // could not act on it. Requiring the implementing line is what forces the derivation: you
  // cannot cite js/app.js:2837 and still write "tap a book".
  const r = runOn(IMAGINED_UI);
  assert.notStrictEqual(r.status, 0,
    'an item with both fields but no source citation was accepted — this is the 2026-08-03 defect');
  assert.match(r.stderr, /Source/, 'the failure must name the missing Source field');
});

test('a Source that cites no path:line is not a Source', () => {
  // Otherwise the field degrades to the hand-waving it exists to prevent.
  const r = runOn(PROSE_SOURCE);
  assert.notStrictEqual(r.status, 0, 'a prose-only Source was accepted');
  assert.match(r.stderr, /cites no path:line/);
});

test('an item that is no longer OWED is not gated', () => {
  // Answered items are records, not instructions — requiring a gesture on them would be noise,
  // and noise is what gets a gate switched off.
  const answered = THE_DEFECT.replace('**STILL OWED.**', '**ANSWERED — PASS.**');
  assert.strictEqual(runOn(answered).status, 0);
});

test('a missing field is caught even when the OTHER one is present', () => {
  // Guards the naive implementation that stops at the first field it finds.
  const only = THE_DEFECT.replace('That a page parked',
    '**Gesture:** abort a browse->browse swipe.\n\nThat a page parked');
  const r = runOn(only);
  assert.notStrictEqual(r.status, 0, 'an item with a Gesture but no Observable was accepted');
  assert.match(r.stderr, /no Observable/);
  assert.doesNotMatch(r.stderr, /no Gesture/);
});

test('the REAL device record in this repo passes', () => {
  // The gate must hold on the live artifact, not only on fixtures — a gate green solely because
  // nothing real is in scope is the vacuity this project keeps paying for.
  const real = path.join(ROOT, 'Claude', 'Zelda',
    'DEVICE-VERDICT-parked-page-rides-home-2026-08-02.md');
  assert.ok(fs.existsSync(real), 'the real device record is missing — this test would be vacuous');
  const r = spawnSync(process.execPath, [CHECKER, real], { encoding: 'utf8' });
  assert.strictEqual(r.status, 0, 'the live device record fails its own gate:\n' + r.stderr);
});

test('the scope predicate actually selects device records', () => {
  // If isDeviceRecord matched nothing, every test above would pass by exclusion.
  const mod = require('node:url').pathToFileURL(CHECKER).href;
  return import(mod).then(() => {}).catch(() => {}) // module runs as CLI; predicate checked textually
    .then(() => {
      const src = fs.readFileSync(CHECKER, 'utf8');
      assert.match(src, /Claude\[\/\\\\\]\.\*\[\/\\\\\]DEVICE-/,
        'the scope predicate no longer targets Claude/**/DEVICE-*.md');
    });
});

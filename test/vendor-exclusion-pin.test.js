// GATE — js/vendor/ is excluded from the (future) first-party scroll-writer inventory
// (PLAN-home-shift-fix.md §7.5 S1: "js/ first-party only; js/vendor/** EXCLUDED, with
// its reason recorded") on a stated reason: it is ONE vendored third-party debug
// console (js/vendor/eruda.js), never precached, never touching #home. That reason is
// a claim about a SPECIFIC file's CONTENT, not merely about how many files sit in the
// directory.
//
// WHY THIS GATE, SEPARATELY FROM A FILE COUNT. "Fail if js/vendor/ gains a second
// file" only catches a NEW file appearing — it is blind to an IN-PLACE upgrade of
// eruda.js itself (a version bump that adds scroll-touching code, say), because the
// count never changes. That falsifies the exclusion's stated reason just as
// completely as a second file would, and a count-only guard would stay green through
// it. So the exclusion is pinned by FILE IDENTITY — a recorded content hash alongside
// the file count — and this gate fails if EITHER one changes.
//
// ON A FAILURE: the correct response is to RE-DERIVE the exclusion's reason against
// the new content (does the new eruda.js write into #home? does it touch scrollTop
// anywhere reachable from the app?) and re-record the pin once that is confirmed — NOT
// to bump the recorded hash/count to silence the gate. A bumped-without-re-checking
// pin is worse than no pin: it reads as "verified" while nothing was re-verified. This
// gate proves the vendored bytes are the ones whose reason was last checked; it does
// not and cannot prove the reason itself is still true — that is judgment, re-owed at
// every bump, exactly as every other baseline entry's "cannot reach #home" line is.
//
// LINE-ENDING NORMALISATION BEFORE HASHING. `core.autocrlf` makes the checked-out
// bytes of a text file checkout-dependent even when the tracked git object never
// changed: this repo's main checkout of eruda.js is LF-only, while a fresh worktree
// checkout of the SAME commit comes out CRLF (git converts on checkout). A raw-byte
// hash pin fires on that non-event in every fresh clone/worktree — the exact footgun
// `tools/mutate.mjs` already normalises around (see its "NORMALISE LINE ENDINGS
// BEFORE MATCHING" comment) for the same reason. Fixed here by hashing content with
// CRLF normalised to LF first, matching that established convention, so the pin is
// sensitive to the file's actual content and blind to how a given checkout happened
// to materialise its line endings.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');

const ROOT = path.join(__dirname, '..');
const VENDOR_DIR = path.join(ROOT, 'js', 'vendor');

// Pure, exported so this test's own claims about "changes X" can be exercised against
// a synthetic directory rather than by editing the real vendored file.
function sha256(buf) {
  return createHash('sha256').update(buf).digest('hex');
}

// Hashes content CRLF-normalised to LF (see the header comment) so the fingerprint is
// invariant to core.autocrlf's checkout-time translation and sensitive only to an
// actual content change.
function normalisedHash(buf) {
  return sha256(buf.toString('utf8').replace(/\r\n/g, '\n'));
}

function vendorFingerprint(dir) {
  const files = fs.readdirSync(dir).sort();
  const hashes = {};
  for (const f of files) hashes[f] = normalisedHash(fs.readFileSync(path.join(dir, f)));
  return { count: files.length, files, hashes };
}

// ── THE PIN. Re-derived under the CRLF-normalised scheme above and recorded here —
// see the header comment for what a failure means and what the correct repair is
// (never a blind bump). This re-derivation is NOT an upgrade of the exclusion's
// reason: `git log --follow -- js/vendor/eruda.js` shows one commit (the initial
// import) and `git status` reports the file unmodified, so the tracked content this
// pin protects has provably not changed — only the hashing scheme changed, from
// raw-byte (checkout-sensitive) to CRLF-normalised (checkout-independent).
const PINNED = {
  count: 1,
  files: ['eruda.js'],
  hashes: {
    'eruda.js': '1037b59d194a76c779dad1264811a995a933a23dd923110fff80ea6bf4254d5d',
  },
};

test('js/vendor/ pin: file count is unchanged (a NEW vendored file must not appear unreviewed)', () => {
  const live = vendorFingerprint(VENDOR_DIR);
  assert.strictEqual(live.count, PINNED.count,
    `js/vendor/ now contains ${live.count} file(s) (${live.files.join(', ')}), pinned at `
    + `${PINNED.count} (${PINNED.files.join(', ')}). Do not bump this number — re-derive `
    + `whether the new file can reach #home (per PLAN-home-shift-fix.md §7.5 S1) and `
    + `re-record the pin only once that is confirmed.`);
});

test('js/vendor/ pin: eruda.js content hash is unchanged (an in-place upgrade must not pass silently)', () => {
  const live = vendorFingerprint(VENDOR_DIR);
  const liveHash = live.hashes['eruda.js'];
  const pinnedHash = PINNED.hashes['eruda.js'];
  assert.strictEqual(liveHash, pinnedHash,
    `js/vendor/eruda.js content hash is ${liveHash}, pinned at ${pinnedHash}. This is `
    + `what a file-count guard cannot see: an in-place upgrade changes nothing about `
    + `how many files are in the directory. Do not bump the recorded hash — re-derive `
    + `the exclusion's reason against the NEW content (does it write into #home? does `
    + `it touch scrollTop anywhere reachable from the app?) and re-record the pin only `
    + `once that is confirmed.`);
});

// Proves the two gates above CAN fail — not merely that they currently report zero.
// Exercised against synthetic in-memory-derived fingerprints (via a temp directory),
// never against the real js/vendor/, so this is a structural test of the comparison
// itself.
test('vendorFingerprint pin comparison actually distinguishes a changed file from an unchanged one', () => {
  const tmp = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'vendor-pin-'));
  try {
    fs.writeFileSync(path.join(tmp, 'eruda.js'), 'console.log(1);\n');
    const before = vendorFingerprint(tmp);
    assert.strictEqual(before.count, 1);
    const beforeHash = before.hashes['eruda.js'];

    // An in-place content change (the eruda-upgrade shape) changes the hash, count held.
    fs.writeFileSync(path.join(tmp, 'eruda.js'), 'console.log(1); el.scrollTop = 0;\n');
    const afterEdit = vendorFingerprint(tmp);
    assert.strictEqual(afterEdit.count, before.count, 'sanity: the edit did not add a file');
    assert.notStrictEqual(afterEdit.hashes['eruda.js'], beforeHash,
      'a changed file must produce a changed hash — otherwise the pin could never fail');

    // A second file appearing changes the count, independent of any hash.
    fs.writeFileSync(path.join(tmp, 'other.js'), 'console.log(2);\n');
    const afterAdd = vendorFingerprint(tmp);
    assert.strictEqual(afterAdd.count, 2, 'a new file must be visible to the count check');

    // An unchanged directory reproduces the identical fingerprint (the pin's pass path).
    const rehash = vendorFingerprint(tmp);
    assert.deepEqual(rehash, afterAdd, 'an unchanged directory must fingerprint identically');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

// Proves the checkout-independence property the normalisation was added for: the SAME
// logical content, checked out with two different line endings (as core.autocrlf can
// produce across a main checkout vs. a fresh worktree of the identical commit), must
// fingerprint identically — otherwise the pin fires on which checkout you happen to be
// in rather than on the tracked content actually changing.
test('vendorFingerprint is invariant to CRLF vs LF line endings on identical content', () => {
  const tmp = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'vendor-pin-eol-'));
  try {
    const lfContent = 'console.log(1);\nconsole.log(2);\n';
    const crlfContent = lfContent.replace(/\n/g, '\r\n');
    assert.notStrictEqual(Buffer.byteLength(lfContent), Buffer.byteLength(crlfContent),
      'sanity: the two encodings of the same content must actually differ in raw bytes');

    fs.writeFileSync(path.join(tmp, 'eruda.js'), lfContent);
    const lfFingerprint = vendorFingerprint(tmp);

    fs.writeFileSync(path.join(tmp, 'eruda.js'), crlfContent);
    const crlfFingerprint = vendorFingerprint(tmp);

    assert.strictEqual(crlfFingerprint.hashes['eruda.js'], lfFingerprint.hashes['eruda.js'],
      'a CRLF checkout of the same tracked content must fingerprint identically to an LF checkout — '
      + 'a raw-byte hash would fail this and pin the checkout, not the content');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

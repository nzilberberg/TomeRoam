// Deploy-consistency guards. These catch the mistakes that have actually bitten
// this project: BUILD drifting between files, a new script missing from the SW
// precache, and — the big one — a stale index.html pairing with fresh JS. The
// fix is version-stamped asset URLs (js/app.js?v=<BUILD>) that MUST match in
// index.html, the meta tag, and the SW precache. These tests enforce that.
const { test } = require('node:test');
const assert = require('node:assert');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const root = join(__dirname, '..');
const read = (p) => readFileSync(join(root, p), 'utf8');
const grab = (txt, re) => { const m = txt.match(re); return m && m[1]; };

// All core script/style refs in index.html (vendor excluded — lazy-loaded).
function htmlRefs() {
  const html = read('index.html');
  const refs = [
    ...[...html.matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]),
    ...[...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map((m) => m[1]),
  ];
  return refs.filter((r) => !r.startsWith('js/vendor/'));
}

test('BUILD is identical across sw.js, debug.js, index.html meta, and build.json', () => {
  const sw = grab(read('sw.js'), /const BUILD = '([^']+)'/);
  const dbg = grab(read('js/debug.js'), /const BUILD = '([^']+)'/);
  const meta = grab(read('index.html'), /name="tomeroam-build" content="([^"]+)"/);
  const json = grab(read('build.json'), /"build":\s*"([^"]+)"/);
  assert.ok(sw && dbg && meta && json, 'all four declare a build');
  assert.equal(dbg, sw, `debug.js ${dbg} != sw.js ${sw}`);
  assert.equal(meta, sw, `index.html meta ${meta} != sw.js ${sw}`);
  assert.equal(json, sw, `build.json ${json} != sw.js ${sw}`);
});

test('every core asset in index.html is version-stamped ?v=<BUILD>', () => {
  const build = grab(read('sw.js'), /const BUILD = '([^']+)'/);
  const refs = htmlRefs();
  assert.ok(refs.length >= 8, 'found the core script/style refs');
  for (const r of refs) {
    assert.ok(r.includes('?v=' + build), `${r} must be stamped ?v=${build} (prevents stale-HTML/fresh-JS mixing)`);
  }
});

test('every version-stamped index.html asset is precached by the SW', () => {
  const sw = read('sw.js');
  for (const r of htmlRefs()) {
    const base = r.split('?')[0];                       // e.g. js/app.js
    // sw.js lists it as `'./js/app.js' + V` — assert the base entry is present
    // AND carries the "+ V" version suffix (so the cache key matches ?v=BUILD).
    const esc = base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp("'\\./" + esc + "'\\s*\\+\\s*V\\b");
    assert.ok(re.test(sw), `${base} must be precached as './${base}' + V in sw.js ASSETS`);
  }
});

test('the SW builds its version suffix from BUILD', () => {
  assert.ok(/const V = '\?v=' \+ BUILD;/.test(read('sw.js')), 'sw.js must derive V from BUILD');
});

test('vendored eruda is never precached (500 KB, on-demand only)', () => {
  assert.ok(!/['"]\.?\/?js\/vendor\//.test(read('sw.js')), 'sw.js must not precache js/vendor/*');
});

// The root cause of the offline saga: a top-level `const Foo` is a lexical global,
// NOT window.Foo. Modules read via window.<Name> MUST assign it explicitly.
test('modules assign themselves to window (const is not window.X)', () => {
  const mods = [['js/store.js', 'Store'], ['js/net.js', 'Net'], ['js/syncqueue.js', 'SyncQueue'], ['js/plex.js', 'Plex'], ['js/progress.js', 'Progress']];
  for (const [file, name] of mods) {
    assert.ok(read(file).includes(`window.${name} = ${name}`), `${file} must assign window.${name} = ${name}`);
  }
});

// debug.js's "Clear cached data" clears the cover cache by its literal name —
// a name OWNED by sw.js (IMG_CACHE). A typo or a future sw.js rename that
// forgets debug.js makes the clear silently no-op (caches.delete of an unknown
// name resolves false, no error), so pin the two shipped files to each other.
// debug.js binds it once (`const IMG = '<name>'`) and clears via that const, so
// assert the exact quoted name is present rather than a specific call shape.
test('debug.js clearCachedData targets the exact IMG_CACHE name sw.js owns', () => {
  const imgCache = grab(read('sw.js'), /const IMG_CACHE = '([^']+)'/);
  assert.ok(imgCache, 'sw.js declares IMG_CACHE');
  const dbg = read('js/debug.js');
  assert.ok(dbg.includes(`'${imgCache}'`),
    `debug.js must reference the cover-cache name '${imgCache}' (the name sw.js owns)`);
  assert.ok(/caches\.delete\(IMG\)/.test(dbg),
    'debug.js must clear the cover cache (caches.delete(IMG))');
});

#!/usr/bin/env node
// bench-virtual-swipe.mjs — drive the app's WINDOWED browse path in a real Blink engine,
// on a synthetic library past FULL_RENDER_MAX, and check the item-5 observables.
//
// WHY THIS EXISTS. Device gate item 5 (Claude/Zelda/DEVICE-GATE-swipe-declone-stage2-2026-08-04.md)
// asks the user to run item 1's browse↔browse gestures on a library list of more than 600 items.
// The user's library has no such list, so the item was deferred and the windowed path stayed
// unexercised outside jsdom. jsdom cannot answer it: `getBoundingClientRect` returns zeros there,
// and item 5's observable is "rows must be PRESENT as the page slides" — a geometry fact.
// This bench supplies the missing fixture instead of waiting for the collection to grow.
//
// REAL VOLUME, NOT THE FLAG. `pb_forceVirtual` (Options → Diagnostics → "Windowed browse",
// js/virtuallist.js:38-45) can force windowing on a small list, and the user has already rejected
// it as a stand-in for real data. It is not used to produce the result here. The fixture seeds
// 900 books / 900 authors / a 700-book author page, so `usesVirtual()` trips on `itemCount >
// FULL_RENDER_MAX` with the flag off — which is the branch the device would take. The bench
// asserts the flag is off and that the exercised controller's model really holds > 600 items;
// a run that cannot show that is reported VACUOUS. The flag is offered as `--force-virtual` for
// one purpose only: a differential run, to see whether the flag and real volume behave alike.
//
// USAGE (node is not on PATH: NODE="$(git config --get tomeroam.node)")
//     node tools/bench-virtual-swipe.mjs                 # headless, seeds, runs, prints a report
//     node tools/bench-virtual-swipe.mjs --headful       # watch it
//     node tools/bench-virtual-swipe.mjs --books 900 --authors 900 --author-books 700
//     node tools/bench-virtual-swipe.mjs --force-virtual # flag ON instead of volume (differential)
//     node tools/bench-virtual-swipe.mjs --json          # machine-readable report on stdout
// Exit code 0 = every gesture clean and non-vacuous; 1 = a violation, a vacuous run, or a
// fire drill that did not fire.
//
// WHAT IT DOES NOT WITNESS. It reads DOM geometry, not pixels: it can prove a row box is laid out
// on the viewport, and cannot prove the row was painted, that its cover had decoded, or that the
// compositor showed one frame rather than two. It runs desktop Blink under device-metrics
// emulation, not iOS WebKit, so nothing about iOS's cover-dropping or native-scroll grants is
// under test here. It is a re-confirm instrument for a deletion pass, not a replacement for a
// human looking at a phone.
import { spawn } from 'node:child_process';
import { readFile, writeFile, rm, mkdtemp, access } from 'node:fs/promises';
import { readFileSync, unlinkSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const flag = (n) => argv.includes(n);
const opt = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };

const PORT = Number(opt('--port', 8899));
const CDP_PORT = Number(opt('--cdp-port', 9333));
const N_BOOKS = Number(opt('--books', 900));
const N_AUTHORS = Number(opt('--authors', 900));
const N_AUTHOR_BOOKS = Number(opt('--author-books', 700));
const HEADFUL = flag('--headful');
const FORCE_VIRTUAL = flag('--force-virtual');
const JSON_OUT = flag('--json');
const BASE = `http://localhost:${PORT}`;

const CHROMES = [
  opt('--chrome', ''),
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, 'Google/Chrome/Application/chrome.exe') : '',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean);

const log = (...a) => { if (!JSON_OUT) console.log(...a); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const exists = (p) => access(p).then(() => true, () => false);

// ---- the disposable `identity` file ---------------------------------------------
// plex.js probeConn does GET <base>/identity; a 200 there makes localhost the PMS base so the
// bench never contacts plex.tv (every other API call then 404s — a 4xx, never the 401→signOut
// path). tools/serve.mjs has no such route, so the file is created in the repo root and
// removed after. It is removed by CONTENT, not by a flag remembered in a variable: the first
// run of this bench was piped through `head`, the EPIPE killed the process before its cleanup,
// and the file sat untracked in the repo root while every later run saw it as pre-existing and
// left it alone. A sentinel plus exit/signal handlers means only the bench's own file is
// deleted and it is deleted however the process ends.
const IDENTITY = join(ROOT, 'identity');
const SENTINEL = 'tomeroam-bench-virtual-swipe: disposable /identity responder\n';
function dropIdentity() {
  try { if (readFileSync(IDENTITY, 'utf8') === SENTINEL) unlinkSync(IDENTITY); } catch { /* absent or not ours */ }
}
process.on('exit', dropIdentity);
for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.on(sig, () => { dropIdentity(); process.exit(130); });
process.on('uncaughtException', (e) => { dropIdentity(); console.error('bench failed: ' + e.message); process.exit(2); });

// ---- a minimal CDP client over node 22's built-in WebSocket ---------------------
class CDP {
  constructor(url) {
    this.ws = new WebSocket(url);
    this.id = 0; this.pending = new Map(); this.handlers = new Map();
    this.ready = new Promise((res, rej) => { this.ws.onopen = res; this.ws.onerror = rej; });
    this.ws.onmessage = (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id != null && this.pending.has(m.id)) {
        const { res, rej } = this.pending.get(m.id); this.pending.delete(m.id);
        m.error ? rej(new Error(m.error.message + ' — ' + JSON.stringify(m.error))) : res(m.result);
      } else if (m.method) {
        for (const h of this.handlers.get(m.method) || []) h(m.params, m.sessionId);
      }
    };
  }
  on(method, fn) { if (!this.handlers.has(method)) this.handlers.set(method, []); this.handlers.get(method).push(fn); }
  send(method, params = {}, sessionId) {
    const id = ++this.id;
    this.ws.send(JSON.stringify(sessionId ? { id, method, params, sessionId } : { id, method, params }));
    return new Promise((res, rej) => this.pending.set(id, { res, rej }));
  }
  close() { try { this.ws.close(); } catch { /* already gone */ } }
}

/** Runtime.evaluate that surfaces page-side exceptions as real errors. */
function evaluator(cdp, sid) {
  return async (expression, awaitPromise = true) => {
    const r = await cdp.send('Runtime.evaluate', {
      expression, awaitPromise, returnByValue: true, allowUnsafeEvalBlockedByCSP: true,
    }, sid);
    if (r.exceptionDetails) {
      const e = r.exceptionDetails;
      throw new Error('page: ' + (e.exception?.description || e.text) + '\n  in: ' + expression.slice(0, 200));
    }
    return r.result.value;
  };
}

// ---- the fixture ----------------------------------------------------------------
// Letter-grouped so the windowed model builds real per-letter shells (the >600 path's
// group geometry), and cover thumbs so tools/serve.mjs's /photo/:/transcode actually
// serves an image per row — a fixture with no images exercises none of the cover pipeline.
function fixtureScript() {
  return `(async () => {
    const N_BOOKS = ${N_BOOKS}, N_AUTHORS = ${N_AUTHORS}, N_AB = ${N_AUTHOR_BOOKS};
    const L = (i) => String.fromCharCode(65 + (i % 26));
    localStorage.setItem('pb_token', 'bench-fixture-not-a-real-token');
    localStorage.setItem('pb_server', JSON.stringify({ name: 'bench', machineId: 'bench',
      connections: [{ uri: '${BASE}', local: true }] }));
    localStorage.setItem('pb_connKind', 'local');
    localStorage.setItem('pb_lastBase', '${BASE}');
    localStorage.setItem('pb_section', 'bench-sec');
    localStorage.setItem('pb_forceVirtual', '${FORCE_VIRTUAL ? '1' : '0'}');
    // The fixture's server answers GET /identity and the cover endpoint and 404s every other
    // Plex call, so js/net.js's backoff poll keeps flipping plexReachable and each
    // unreachable→reachable flip runs the reconnect pass, which calls Browse.clearCache()
    // (js/app.js:3033) and destroys every rendered browse page mid-drag. That is real app
    // behaviour with no Plex behind it, and it is not what item 5 asks about. pb_autoretry='0'
    // is the app's own opt-out for that poll (js/net.js:151).
    localStorage.setItem('pb_autoretry', '0');
    const mkBook = (i, authorRk, authorName) => ({
      ratingKey: 'b' + i, title: L(i) + ' Book ' + String(i).padStart(4, '0'),
      titleSort: L(i) + ' Book ' + String(i).padStart(4, '0'),
      parentTitle: authorName, parentRatingKey: authorRk,
      thumb: '/library/metadata/b' + i + '/thumb/1',
      leafCount: 8, viewedLeafCount: i % 9, addedAt: 1700000000 + i,
      lastViewedAt: 1700000000 + i, duration: 3600000,
    });
    const authors = [], books = [];
    for (let i = 0; i < N_AUTHORS; i++) authors.push({
      ratingKey: 'a' + i, title: L(i) + 'uthor ' + String(i).padStart(4, '0'),
      titleSort: L(i) + 'uthor ' + String(i).padStart(4, '0'),
      thumb: '/library/metadata/a' + i + '/thumb/1', childCount: 1, summary: '',
    });
    // The oversized author is pinned to row 0 of the Authors list so the bench can open it by
    // position without depending on the sort. Its own page holds N_AB books.
    authors[1] = { ratingKey: 'a1', title: 'AAA Big Library', titleSort: 'AAA Big Library',
      thumb: '/library/metadata/a1/thumb/1', childCount: N_AB, summary: '' };
    for (let i = 0; i < N_BOOKS; i++) {
      const ai = i % N_AUTHORS;
      books.push(mkBook(i, 'a' + ai, authors[ai] ? authors[ai].title : 'Unknown'));
    }
    // One author whose own page is ALSO past the threshold, so a browse→browse swipe can
    // have a windowed page on BOTH ends (books list ⇄ author page).
    const abooks = [];
    for (let i = 0; i < N_AB; i++) abooks.push(mkBook(100000 + i, 'a1', authors[1].title));
    await Store.cacheBooks(books);
    await Store.cacheAuthors(authors);
    await Store.cacheTracks('b0', Array.from({ length: 12 }, (_, t) => ({
      ratingKey: 't' + t, title: 'Chapter ' + (t + 1), index: t + 1, duration: 600000, parentRatingKey: 'b0' })));
    await Store.kvSet('author:a1', { ratingKey: 'a1', title: authors[1].title,
      thumb: authors[1].thumb, childCount: N_AB, summary: '' });
    await Store.kvSet('authorBooks:a1', abooks);
    return { books: books.length, authors: authors.length, authorBooks: abooks.length };
  })()`;
}

// ---- server ----------------------------------------------------------------------
async function ensureServer() {
  try {
    const r = await fetch(BASE + '/index.html', { signal: AbortSignal.timeout(1500) });
    if (r.ok) { log(`· server already up on ${BASE}`); return null; }
  } catch { /* not up — start one */ }
  const child = spawn(process.execPath, [join(ROOT, 'tools/serve.mjs'), '--port', String(PORT)], { stdio: 'ignore' });
  for (let i = 0; i < 60; i++) {
    await sleep(120);
    try { const r = await fetch(BASE + '/index.html', { signal: AbortSignal.timeout(800) }); if (r.ok) { log(`· started tools/serve.mjs on ${BASE}`); return child; } } catch { /* retry */ }
  }
  child.kill();
  throw new Error('tools/serve.mjs did not come up on ' + BASE);
}

// ---- chrome ----------------------------------------------------------------------
async function launchChrome(profile) {
  let bin = null;
  for (const c of CHROMES) if (await exists(c)) { bin = c; break; }
  if (!bin) throw new Error('no Chrome found; pass --chrome <path>');
  const args = [
    `--remote-debugging-port=${CDP_PORT}`, `--user-data-dir=${profile}`,
    '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding', '--window-size=420,900', 'about:blank',
  ];
  if (!HEADFUL) args.unshift('--headless=new');
  const child = spawn(bin, args, { stdio: 'ignore' });
  for (let i = 0; i < 80; i++) {
    await sleep(150);
    try {
      const r = await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`, { signal: AbortSignal.timeout(800) });
      if (r.ok) { log(`· chrome up (${HEADFUL ? 'headful' : 'headless'}) — ${bin}`); return { child, ver: await r.json() }; }
    } catch { /* retry */ }
  }
  child.kill();
  throw new Error('chrome did not open a devtools port on ' + CDP_PORT);
}

// ---- the run ----------------------------------------------------------------------
async function main() {
  const report = { startedAt: new Date().toISOString(), fixture: null, forceVirtual: FORCE_VIRTUAL, gestures: [], fireDrill: null, violations: [], notes: [] };
  const profile = await mkdtemp(join(tmpdir(), 'tomeroam-bench-'));
  let server = null, chrome = null, cdp = null;
  try {
    if (await exists(IDENTITY)) throw new Error(`${IDENTITY} already exists — refusing to overwrite it; remove it and re-run`);
    await writeFile(IDENTITY, SENTINEL);
    server = await ensureServer();
    chrome = await launchChrome(profile);

    cdp = new CDP(chrome.ver.webSocketDebuggerUrl);
    await cdp.ready;
    const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
    const { sessionId: sid } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
    const pageErrors = [];
    cdp.on('Runtime.exceptionThrown', (p) => pageErrors.push(p.exceptionDetails?.exception?.description || p.exceptionDetails?.text));
    await cdp.send('Runtime.enable', {}, sid);
    await cdp.send('Page.enable', {}, sid);
    // A phone-shaped viewport with touch: the app's swipe arms on touch events (js/app.js:197,
    // EDGE = 44), and `Touch`/`TouchEvent` only construct when touch emulation is on.
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 375, height: 812, deviceScaleFactor: 2, mobile: true }, sid);
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }, sid);
    const ev = evaluator(cdp, sid);

    const goto = async (url, waitFor, ms = 20000) => {
      await cdp.send('Page.navigate', { url }, sid);
      const t0 = Date.now();
      for (;;) {
        await sleep(150);
        try { if (await ev(`!!(${waitFor})`, false)) return; } catch { /* still navigating */ }
        if (Date.now() - t0 > ms) throw new Error('timed out waiting for: ' + waitFor);
      }
    };

    log('· loading the app and seeding the fixture');
    await goto(BASE + '/index.html', 'window.Store && window.Store.cacheBooks');
    report.fixture = await ev(fixtureScript());
    log(`· fixture: ${report.fixture.books} books, ${report.fixture.authors} authors, ` +
        `${report.fixture.authorBooks}-book author page; pb_forceVirtual=${FORCE_VIRTUAL ? '1' : '0'}`);

    await goto(BASE + '/index.html', 'document.querySelector(\'.navbtn[data-nav="books"]\')');
    await ev(await readFile(join(ROOT, 'tools/bench-virtual-swipe.page.js'), 'utf8'), false);

    // Threshold facts, read from the running app rather than from source.
    const th = await ev(`({ max: VirtualList.FULL_RENDER_MAX, overscan: 1.5,
      flag: localStorage.getItem('pb_forceVirtual'),
      byVolume: VirtualList.usesVirtual(${N_BOOKS}), byVolumeSmall: VirtualList.usesVirtual(10) })`, false);
    report.threshold = th;
    log(`· FULL_RENDER_MAX=${th.max}; usesVirtual(${N_BOOKS})=${th.byVolume}, usesVirtual(10)=${th.byVolumeSmall}, flag=${th.flag}`);
    if (!FORCE_VIRTUAL && th.byVolumeSmall) report.violations.push('SETUP: usesVirtual(10) is true with the flag off — the fixture is not proving a volume-driven path');

    // A gesture whose page cache was rebuilt under it measured the rebuild, not the swipe.
    // It is retried once; a second contaminated sample is reported rather than scored.
    const run = async (o, attempt = 1) => {
      const g = await ev(`VB.gesture(${JSON.stringify(o)})`);
      log(`  ${g.tag}${attempt > 1 ? ' (retry)' : ''}: ${g.mode} ${g.sourceKey} → landed=${g.landedKey} ` +
          `expected=${g.expectKey || 'not-source'} minRowsSliding=${g.minVisRowsWhileSliding} ` +
          `(windowed ${g.minVisRowsWindowed}) reveal=${g.revealVisRows} settled=${g.settledVisRows} ` +
          `realized=${g.landedRealized}/${g.landedModel} armed=${g.armed} timelineLive=${g.timelineLive}` +
          `${g.contaminated ? ' CONTAMINATED(' + g.rebuilt.join(',') + ')' : ''}` +
          `${g.vacuous ? ' VACUOUS' : ''}${g.violations.length ? ' ✗' : ' ok'}`);
      for (const s of g.samples) if (s.pages.length) log(`      ${s.tag}  ${s.pages.join(' | ')}`);
      if (g.contaminated && attempt === 1) {
        log('    · page cache was rebuilt under this drag — retrying once');
        await sleep(1500);
        return run(o, 2);
      }
      report.gestures.push(g);
      for (const v of g.violations) { log('    ✗ ' + v); report.violations.push(`${g.tag}: ${v}`); }
      if (g.contaminated) report.violations.push(`${g.tag}: CONTAMINATED twice — page(s) ${g.rebuilt.join(',')} rebuilt under the drag; this sample scores neither way`);
      if (g.vacuous) report.violations.push(`${g.tag}: VACUOUS — no windowed page was on the viewport during this gesture`);
      return g;
    };
    // Drilling into a book needs that book's chapter list to exist, or the destination page is
    // empty and the gesture measures nothing. Seed the visible row's tracks first.
    const seedTracksForRow = (n) => ev(`(async () => {
      const p = [...document.querySelectorAll('.browsepage')].find(el =>
        !el.classList.contains('hidden') && !el.classList.contains('parked'));
      const row = p.querySelectorAll('.book:not(.skrow), .authrow')[${n}];
      const rk = row && row.dataset.book;
      if (!rk) return null;
      await Store.cacheTracks(rk, Array.from({ length: 12 }, (_, t) => ({
        ratingKey: rk + '-t' + t, title: 'Chapter ' + (t + 1), index: t + 1,
        duration: 600000, parentRatingKey: rk })));
      return rk;
    })()`);
    const drill = async (n, ms) => { await seedTracksForRow(n); return ev(`VB.openRow(${n}, ${ms || 1300})`).then(() => ev('VB.activeKey()', false)); };
    const facts = async (tag) => (await ev(`VB.snap(${JSON.stringify(tag)}).pages.map(VB.fmt)`, false)).forEach((l) => log('    ' + l));

    // --- Route A: Books (windowed) ⇄ a book's chapter list (classic) ----------------
    log('· route A — Books (windowed) → a book → back/forward swipes');
    await ev('VB.nav("books", 1400)');
    const booksKey = await ev('VB.activeKey()', false);
    await facts('A:booksReady');
    const filesKey = await drill(0);
    log(`  drilled ${booksKey} → ${filesKey}`);

    // The fire drill runs HERE, on the real repro state, before any negative is trusted.
    log('· fire drill — breaking the row hold on purpose, to prove the check can fire');
    report.fireDrill = await ev('VB.fireDrill()');
    log(`  broke ${report.fireDrill.broke} controller(s) → fired=${report.fireDrill.fired}`);
    for (const l of report.fireDrill.sample) log('    ' + l);
    if (!report.fireDrill.fired) report.violations.push('FIRE DRILL DID NOT FIRE — every negative below is worthless');
    await ev('VB.nav("books", 1400)');
    await drill(0);

    // back = swipe from the LEFT edge (js/app.js:496 fromLeft). 0.75 of the width commits
    // (prog > THRESH 0.42, vx pinned 0); 0.25 aborts back to where it started.
    await run({ dir: 'back', frac: 0.75, expectKey: booksKey, tag: 'A1-back-commit' });
    await drill(0);
    await run({ dir: 'back', frac: 0.25, tag: 'A2-back-abort' });
    // Now on the files page with the books page one step back: a forward swipe from the RIGHT
    // edge only arms when fwdStack has a destination, i.e. after a back-commit.
    await run({ dir: 'back', frac: 0.75, expectKey: booksKey, tag: 'A3-back-commit-again' });
    await run({ dir: 'fwd', frac: 0.75, expectKey: filesKey, tag: 'A4-fwd-commit' });
    await run({ dir: 'back', frac: 0.75, expectKey: booksKey, tag: 'A5-back-commit-3' });
    await run({ dir: 'fwd', frac: 0.25, tag: 'A6-fwd-abort' });

    // --- Route B: Authors (windowed) ⇄ a 700-book author page (windowed) -------------
    // The sharpest fixture: a windowed page on BOTH ends of the browse→browse swipe.
    log('· route B — Authors (windowed) → a 700-book author page (windowed)');
    await ev('VB.nav("authors", 1600)');
    const authorsKey = await ev('VB.activeKey()', false);
    const authorKey = await drill(0, 1800);
    await facts('B:ready');
    log(`  drilled ${authorsKey} → ${authorKey}`);
    await run({ dir: 'back', frac: 0.75, expectKey: authorsKey, tag: 'B1-back-commit' });
    await drill(0, 1800);
    await run({ dir: 'back', frac: 0.25, tag: 'B2-back-abort' });
    await run({ dir: 'back', frac: 0.75, expectKey: authorsKey, tag: 'B3-back-commit-again' });
    await run({ dir: 'fwd', frac: 0.75, expectKey: authorKey, tag: 'B4-fwd-commit' });
    await run({ dir: 'back', frac: 0.75, expectKey: authorsKey, tag: 'B5-back-commit-3' });
    await run({ dir: 'fwd', frac: 0.25, tag: 'B6-fwd-abort' });

    // --- Route C: the window is not at the top of the model --------------------------
    // Every gesture above ran with the list at row 0, where the realized window is the
    // model's first rows and a broken realizer can look like a correct one. Scroll a
    // windowed page 60% in, so the window is a slice out of the middle, then repeat.
    log('· route C — the same gestures with the windowed list scrolled deep');
    await ev('VB.nav("books", 1400)');
    const deepY = await ev(`(() => { const p = [...document.querySelectorAll('.browsepage')]
      .find(el => !el.classList.contains('hidden') && !el.classList.contains('parked'));
      p.scrollTop = Math.round(p.scrollHeight * 0.6); p._vctl && p._vctl._realize(); return p.scrollTop; })()`, false);
    await sleep(500);
    log(`  scrolled the windowed books page to y=${deepY}`);
    await facts('C:deep');
    await drill(0);
    await run({ dir: 'back', frac: 0.75, expectKey: booksKey, tag: 'C1-deep-back-commit' });
    await drill(0);
    await run({ dir: 'back', frac: 0.25, tag: 'C2-deep-back-abort' });
    await run({ dir: 'back', frac: 0.75, expectKey: booksKey, tag: 'C3-deep-back-commit' });
    await run({ dir: 'fwd', frac: 0.75, tag: 'C4-deep-fwd-commit' });
    await run({ dir: 'back', frac: 0.75, expectKey: booksKey, tag: 'C5-deep-back-commit' });
    await run({ dir: 'fwd', frac: 0.25, tag: 'C6-deep-fwd-abort' });

    // The volume run's whole claim is that the >600 branch was taken because the list is >600.
    // A model at or below the threshold means it was not, whatever else the run showed.
    const biggest = Math.max(0, ...report.gestures.map((g) => g.biggestModel));
    if (!FORCE_VIRTUAL && biggest <= th.max) {
      report.violations.push(`SETUP: the largest windowed model exercised was ${biggest} items, not above FULL_RENDER_MAX=${th.max} — this run does not witness the >${th.max} branch`);
    }
    report.pageErrors = pageErrors;
    if (pageErrors.length) report.notes.push(`${pageErrors.length} uncaught page exception(s) during the run`);
  } finally {
    if (cdp) cdp.close();
    if (chrome && !flag('--keep')) chrome.child.kill();
    if (server) server.kill();
    dropIdentity();
    await rm(profile, { recursive: true, force: true }).catch(() => {});
  }

  report.finishedAt = new Date().toISOString();
  report.ok = report.violations.length === 0;
  if (JSON_OUT) { console.log(JSON.stringify(report, null, 2)); }
  else {
    console.log('\n' + '─'.repeat(72));
    console.log(`gestures run: ${report.gestures.length}   fire drill fired: ${report.fireDrill?.fired}`);
    console.log(`largest windowed model seen: ${Math.max(0, ...report.gestures.map((g) => g.biggestModel))} items ` +
                `(threshold ${report.threshold?.max})`);
    console.log(`settle timeline live in every gesture: ${report.gestures.every((g) => g.timelineLive)}`);
    console.log(report.ok ? 'RESULT: PASS — no violations' : `RESULT: FAIL — ${report.violations.length} violation(s)`);
    for (const v of report.violations) console.log('  ✗ ' + v);
  }
  process.exit(report.ok ? 0 : 1);
}

main().catch((e) => { console.error('bench failed: ' + e.message); process.exit(2); });

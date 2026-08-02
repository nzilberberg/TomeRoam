#!/usr/bin/env node
// serve.mjs — a zero-dependency static server for driving the REAL app in a REAL browser.
//
// WHY THIS EXISTS. Every automated seat in this project reasons in jsdom or over source text, and
// jsdom has no layout and no paint. That gap is not academic: on 2026-08-01 a defect whose whole
// signature is "two screens composited on top of each other mid-swipe" was invisible to four plan
// reviews, a red suite, a build, a code review, an adversary strike and a coverage audit — and the
// user found it in minutes on a phone. The single real-engine probe we did run that day answered
// its question immediately.
//
// A real browser can do what jsdom cannot: lay out, paint, run transitions, take a screenshot
// mid-drag, and dispatch real pointer events. This server is the missing half of that loop.
//
// ⛔ NOT A DEV SERVER FOR THE PRODUCT. It serves the repo root as static files, nothing more — no
// build step, no proxy, no Plex. The app authenticates against Plex from localStorage; seeding a
// TOKEN is out of bounds, but the app also CACHES its library in localStorage, and seeding that is
// ordinary fixture data. That is the supported way to render Books here without an account.
//
//   node tools/serve.mjs [--port 8899]
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, normalize, extname } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const portArg = argv.indexOf('--port');
const PORT = portArg >= 0 ? Number(argv[portArg + 1]) : 8899;

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webmanifest': 'application/manifest+json',
  '.ico': 'image/x-icon',
};

// A 1×1-ish coloured cover, generated per request so every book looks different — the interface
// only exercises its real layout when the images actually load and differ.
function coverSvg(seed) {
  const h = (Number(seed) * 47) % 360;
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400">` +
    `<rect width="400" height="400" fill="hsl(${h},45%,28%)"/>` +
    `<rect x="0" y="330" width="400" height="70" fill="hsl(${h},55%,18%)"/>` +
    `<text x="20" y="200" font-family="serif" font-size="44" fill="hsl(${h},30%,82%)">#${seed}</text></svg>`,
  );
}

createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    let p = decodeURIComponent(url.pathname);

    // Plex art endpoint — `Plex.artUrl()` builds `<base>/photo/:/transcode?...&url=<thumb>`.
    // Answering it here is what makes covers actually LOAD, which is the difference between
    // "the geometry is right" and "the interface renders correctly". A fixture with no images
    // exercises none of the cover pipeline: decode, fade, release, the LRU, the flash windows.
    if (p.startsWith('/photo/:/transcode')) {
      const seed = (url.searchParams.get('url') || '0').replace(/\D+/g, '') || '0';
      res.writeHead(200, { 'content-type': 'image/svg+xml', 'cache-control': 'no-store' });
      res.end(coverSvg(seed));
      return;
    }

    if (p === '/' || p.endsWith('/')) p += 'index.html';
    // Contain to ROOT — normalize away any ../ before joining.
    const safe = normalize(p).replace(/^([/\\])+/, '');
    const file = join(ROOT, safe);
    if (!file.startsWith(ROOT)) { res.writeHead(403).end('forbidden'); return; }
    const body = await readFile(file);
    res.writeHead(200, {
      'content-type': TYPES[extname(file).toLowerCase()] || 'application/octet-stream',
      // No caching: a stale service worker or module is exactly the confusion this exists to avoid.
      'cache-control': 'no-store',
    });
    res.end(body);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain' }).end('not found');
  }
}).listen(PORT, () => console.log('tomeroam static server on http://localhost:' + PORT));

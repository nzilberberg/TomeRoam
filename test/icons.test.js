// App-icon guards, asserted against the SHIPPED bytes + the real manifest.
//
// WHY: icon-192.png shipped BROKEN for months — mostly transparent, with only a
// sliver of the card peeking in at the right — and nobody noticed because nothing
// ever looked at it. All three PNGs were also rasterized ~7px right of centre (at
// 512), leaving the full-bleed card CLIPPED at the right edge, while icon.svg's own
// geometry is exactly symmetric. A broken icon is invisible to every other test in
// this repo and to CI; it only surfaces when a human squints at a home screen.
//
// These decode the real files and measure them. They fail if an icon is blank,
// corrupt, mis-sized, or drifts off-centre again.
const { test } = require('node:test');
const assert = require('node:assert');
const { readRoot } = require('./dom-fixture.js');
const { decodePng, bbox, isGold, isOpaque } = require('./png.js');

const manifest = JSON.parse(readRoot('manifest.webmanifest'));
const pngIcons = manifest.icons.filter((i) => i.type === 'image/png');

test('the manifest actually declares PNG icons (fixture sanity)', () => {
  assert.ok(pngIcons.length >= 2, 'no PNG icons in the manifest');
});

for (const icon of pngIcons) {
  const declared = parseInt(icon.sizes, 10);

  test(`${icon.src}: decodes cleanly and matches its declared ${icon.sizes}`, () => {
    const img = decodePng('./' + icon.src);
    assert.equal(img.crcFailures, 0, 'corrupt chunk(s) — the file is damaged');
    assert.ok(img.cleanEnd, 'trailing garbage after IEND');
    assert.equal(img.w, declared, 'width disagrees with the manifest');
    assert.equal(img.h, declared, 'height disagrees with the manifest');
  });

  test(`${icon.src}: is not blank — the artwork is actually in the canvas`, () => {
    // The .112-era icon-192 was ~90% empty. Assert real coverage of both the card
    // and the gold glyph rather than trusting that a file exists.
    const img = decodePng('./' + icon.src);
    const gold = bbox(img, isGold);
    const frac = gold.n / (img.w * img.h);
    assert.ok(frac > 0.05, `only ${(frac * 100).toFixed(1)}% gold — icon looks blank/cropped`);
    const opaque = bbox(img, isOpaque);
    assert.ok(opaque.n / (img.w * img.h) > 0.5, 'the card should cover most of the canvas');
  });

  test(`${icon.src}: artwork is horizontally centred (the +7px drift)`, () => {
    const img = decodePng('./' + icon.src);
    const gold = bbox(img, isGold);
    const left = gold.x0, right = img.w - 1 - gold.x1;
    // icon.svg is exactly symmetric, so any drift is a rasterization fault. 1px of
    // slack for rounding at 192.
    assert.ok(Math.abs(left - right) <= 1,
      `gold sits ${left}px from the left but ${right}px from the right — off-centre by ${((left - right) / 2).toFixed(1)}px`);
  });

  test(`${icon.src}: the full-bleed card reaches both edges (not clipped)`, () => {
    const img = decodePng('./' + icon.src);
    const opaque = bbox(img, isOpaque);
    assert.equal(opaque.x0, 0, 'card does not reach the left edge — artwork is shifted');
    assert.equal(opaque.x1, img.w - 1, 'card does not reach the right edge — artwork is clipped');
  });
}

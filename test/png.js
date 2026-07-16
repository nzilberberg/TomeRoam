// Minimal PNG reader for tests: validates chunk CRCs and decodes 8-bit RGB/RGBA,
// non-interlaced images to raw pixels. Node's zlib does the inflate; everything else
// is the spec's scanline filters. Test-only (never shipped) — it exists so the
// SHIPPED icon bytes can be asserted about, rather than trusted.
const fs = require('node:fs');
const zlib = require('node:zlib');

const TBL = (() => { const t = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = (buf) => { let c = 0xFFFFFFFF; for (const x of buf) c = TBL[(c ^ x) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };

/** { w, h, chan, px, crcFailures, cleanEnd } — throws only on an unsupported format. */
function decodePng(file) {
  const b = fs.readFileSync(file);
  const sigOk = [137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => b[i] === v);
  if (!sigOk) throw new Error('not a PNG: ' + file);
  let p = 8, ihdr = null, idat = [], crcFailures = 0;
  while (p < b.length) {
    const len = b.readUInt32BE(p), type = b.slice(p + 4, p + 8).toString();
    const data = b.slice(p + 8, p + 8 + len);
    if (crc32(b.slice(p + 4, p + 8 + len)) !== b.readUInt32BE(p + 8 + len)) crcFailures++;
    if (type === 'IHDR') ihdr = { w: data.readUInt32BE(0), h: data.readUInt32BE(4), depth: data[8], color: data[9], interlace: data[12] };
    if (type === 'IDAT') idat.push(data);
    p += 12 + len;
  }
  const chan = ihdr.color === 6 ? 4 : ihdr.color === 2 ? 3 : 0;
  if (!chan || ihdr.depth !== 8 || ihdr.interlace !== 0) throw new Error('unsupported PNG format: ' + file);
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const { w, h } = ihdr, bpp = chan, stride = w * bpp;
  const px = Buffer.alloc(w * h * bpp);
  let q = 0;
  for (let y = 0; y < h; y++) {
    const f = raw[q++], line = raw.slice(q, q + stride); q += stride;
    const cur = px.slice(y * stride, (y + 1) * stride);
    const prior = y ? px.slice((y - 1) * stride, y * stride) : Buffer.alloc(stride);
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? cur[i - bpp] : 0, b2 = prior[i], c = i >= bpp ? prior[i - bpp] : 0, x = line[i];
      let v;
      if (f === 0) v = x; else if (f === 1) v = x + a; else if (f === 2) v = x + b2;
      else if (f === 3) v = x + ((a + b2) >> 1);
      else if (f === 4) { const pa = Math.abs(b2 - c), pb = Math.abs(a - c), pc = Math.abs(a + b2 - 2 * c); v = x + (pa <= pb && pa <= pc ? a : pb <= pc ? b2 : c); }
      else throw new Error('bad filter ' + f);
      cur[i] = v & 0xFF;
    }
  }
  return { w, h, chan, px, crcFailures, cleanEnd: p === b.length };
}

/** Bounding box of pixels matching pred(r,g,b,a) → {x0,y0,x1,y1,n}. */
function bbox({ w, h, chan, px }, pred) {
  let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1, n = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const o = (y * w + x) * chan;
    if (!pred(px[o], px[o + 1], px[o + 2], chan === 4 ? px[o + 3] : 255)) continue;
    n++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  return { x0, y0, x1, y1, n };
}

const isGold = (r, g, b, a) => a > 128 && r > 180 && g > 110 && g < 210 && b < 90;   // #e5a00d
const isOpaque = (r, g, b, a) => a > 128;

module.exports = { decodePng, bbox, isGold, isOpaque };

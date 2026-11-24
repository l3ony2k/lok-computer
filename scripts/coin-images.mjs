#!/usr/bin/env node
/**
 * Coin faces for Chance, from a 1909 Lincoln cent: the first year of issue,
 * the same year as the tarot deck. Heads is Victor David Brenner's Lincoln
 * portrait, tails the wheat-ears reverse (this one carries his V.D.B.).
 *
 * Source: one photograph of both sides of a 1909 VDB cent in the Smithsonian's
 * National Numismatic Collection (photograph by Jaclyn Nash, 2015), on
 * Wikimedia Commons:
 * https://commons.wikimedia.org/wiki/File:NNC-US-1909-1C-Lincoln_Cent_(wheat).jpg
 * Public domain twice over: the coin is a US Mint design (PD-USGov-money) and
 * the photograph is a work of a Smithsonian employee (PD-USGov-SI). The NNC
 * asks for credit: National Numismatic Collection, National Museum of
 * American History (given in NOTICE.md).
 *
 * Processing, per side (obverse on the left half of the photo, reverse on
 * the right):
 *   1. Find the coin on the white backdrop: a pixel is coin when it is darker
 *      or more saturated than the backdrop; a row or column belongs to the
 *      coin when enough of its pixels are (so stray dust does not count). The
 *      extents give the centre and the diameter.
 *   2. Crop a square around that centre, a little inside the rim's outer edge
 *      (RIM_INSET) so no backdrop survives, and resize it to SIZE × SIZE. Both
 *      faces come out the same size whatever their size in the photo.
 *   3. Mask everything outside the circle to transparency (an antialiased
 *      SVG circle) and encode WebP (WEBP_QUALITY, effort 6). The copper
 *      colours are kept as photographed; the photo is already upright.
 *
 * Output: SIZE × SIZE (about 2× the coin's largest display size, 164 CSS px),
 * src/assets/coin/heads.webp and tails.webp.
 *
 * The original is downloaded once into scripts/.cache/coin/ (gitignored) and
 * checked against the SHA-1 Commons publishes. upload.wikimedia.org
 * rate-limits scripted downloads, so a refused request is served from the
 * Wayback Machine's copy of the same original instead. `sharp` is a
 * devDependency used only by the asset scripts.
 *
 * Usage:
 *   node scripts/coin-images.mjs        # download if needed, write src/assets/coin
 */

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CACHE_DIR = path.join(ROOT, 'scripts/.cache/coin');
const OUT_DIR = path.join(ROOT, 'src/assets/coin');

const COMMONS_FILE = 'NNC-US-1909-1C-Lincoln Cent (wheat).jpg';
const ORIGINAL_URL = 'https://upload.wikimedia.org/wikipedia/commons/6/6b/NNC-US-1909-1C-Lincoln_Cent_%28wheat%29.jpg';
const ORIGINAL_SHA1 = '9997f42c4479aca162e0b76ccda2a7c0048e6e0e';
const USER_AGENT = 'lok-computer-coin-script/1.0 (build-time asset download)';

export const SIZE = 360;
const WEBP_QUALITY = 80;
/** Share of the radius trimmed off the rim, so the antialiased edge never shows backdrop. */
const RIM_INSET = 0.006;
/** Backdrop is brighter than this luminance and nearly grey. */
const BACKDROP_LUM = 228;
const BACKDROP_CHROMA = 24;
/** A row or column is part of the coin when this many of its pixels are coin. */
const MIN_RUN = 40;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const sha1Of = (bytes) => createHash('sha1').update(bytes).digest('hex');
const cachePath = path.join(CACHE_DIR, COMMONS_FILE);

/** The original's bytes from Commons, or the Wayback Machine's copy, checked against the published SHA-1. */
const download = async () => {
  if (existsSync(cachePath) && sha1Of(readFileSync(cachePath)) === ORIGINAL_SHA1) return 'cache';
  mkdirSync(CACHE_DIR, { recursive: true });
  const sources = [ORIGINAL_URL, `https://web.archive.org/web/2024id_/${ORIGINAL_URL}`];
  for (let attempt = 0; attempt < 3; attempt += 1) {
    let retryAfterMs = 0;
    for (const source of sources) {
      const host = new URL(source).host;
      let response;
      try {
        response = await fetch(source, { headers: { 'User-Agent': USER_AGENT } });
      } catch (error) {
        console.log(`  network error from ${host} (${error.cause?.code ?? error.message})`);
        continue;
      }
      if (!response.ok) {
        console.log(`  ${response.status} from ${host}`);
        if (response.status === 429) retryAfterMs = (Number(response.headers.get('retry-after')) || 60) * 1000;
        continue;
      }
      const bytes = Buffer.from(await response.arrayBuffer());
      if (sha1Of(bytes) !== ORIGINAL_SHA1) {
        console.log(`  checksum mismatch from ${host}`);
        continue;
      }
      writeFileSync(cachePath, bytes);
      return host;
    }
    if (!retryAfterMs) break;
    console.log(`  waiting ${Math.round(retryAfterMs / 1000)} s for Commons`);
    await sleep(retryAfterMs);
  }
  throw new Error(`No verified copy of ${COMMONS_FILE}; download it by hand into scripts/.cache/coin/`);
};

/** First and last index whose count reaches MIN_RUN. */
const extent = (counts) => {
  let first = 0;
  while (first < counts.length && counts[first] < MIN_RUN) first += 1;
  let last = counts.length - 1;
  while (last > first && counts[last] < MIN_RUN) last -= 1;
  if (first >= last) throw new Error('coin not found');
  return [first, last];
};

/** Centre and radius of the coin inside the given horizontal slice of the photo. */
const findCoin = ({ data, width, height }, fromX, toX) => {
  const rows = new Uint32Array(height);
  const cols = new Uint32Array(width);
  for (let y = 0; y < height; y += 1) {
    for (let x = fromX; x < toX; x += 1) {
      const i = (y * width + x) * 3;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      const chroma = Math.max(r, g, b) - Math.min(r, g, b);
      if (lum < BACKDROP_LUM || chroma > BACKDROP_CHROMA) {
        rows[y] += 1;
        cols[x] += 1;
      }
    }
  }
  const [top, bottom] = extent(rows);
  const [left, right] = extent(cols);
  const diameterX = right - left + 1;
  const diameterY = bottom - top + 1;
  return {
    cx: (left + right + 1) / 2,
    cy: (top + bottom + 1) / 2,
    radius: (diameterX + diameterY) / 4,
    roundness: diameterX / diameterY,
  };
};

const circleMask = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}">`
  + `<circle cx="${SIZE / 2}" cy="${SIZE / 2}" r="${SIZE / 2}" fill="#fff"/></svg>`,
);

const convert = async (photo, side, fromX, toX) => {
  const coin = findCoin(photo, fromX, toX);
  if (Math.abs(coin.roundness - 1) > 0.02) throw new Error(`${side}: coin is not round (${coin.roundness.toFixed(3)})`);
  const radius = coin.radius * (1 - RIM_INSET);
  const box = {
    left: Math.round(coin.cx - radius),
    top: Math.round(coin.cy - radius),
    width: Math.round(radius * 2),
    height: Math.round(radius * 2),
  };
  const face = await sharp(cachePath)
    .extract(box)
    .resize(SIZE, SIZE, { fit: 'fill', kernel: 'lanczos3' })
    .toBuffer();
  const output = path.join(OUT_DIR, `${side}.webp`);
  await sharp(face)
    .ensureAlpha()
    .composite([{ input: circleMask, blend: 'dest-in' }])
    .toColourspace('srgb')
    .webp({ quality: WEBP_QUALITY, alphaQuality: 90, effort: 6, smartSubsample: true })
    .toFile(output);
  return { side, coin, box, bytes: statSync(output).size };
};

const main = async () => {
  const source = await download();
  console.log(`${COMMONS_FILE} (${source}, checksum ok)`);
  mkdirSync(OUT_DIR, { recursive: true });

  const { data, info } = await sharp(cachePath).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const photo = { data, width: info.width, height: info.height };
  const middle = Math.round(photo.width / 2);
  const results = [
    await convert(photo, 'heads', 0, middle),
    await convert(photo, 'tails', middle, photo.width),
  ];
  for (const { side, coin, box, bytes } of results) {
    console.log(`${side.padEnd(6)} centre (${coin.cx.toFixed(0)}, ${coin.cy.toFixed(0)}) diameter ${(coin.radius * 2).toFixed(0)} px`
      + ` (x/y ${coin.roundness.toFixed(3)}), crop ${box.width} px → ${SIZE}×${SIZE}, ${(bytes / 1024).toFixed(1)} KB`);
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

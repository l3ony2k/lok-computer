#!/usr/bin/env node
/**
 * Tarot card images for Chance, from the 1909 Rider–Waite–Smith deck.
 *
 * Source: scans of an original 1909 "Roses & Lilies" first printing (art by
 * Pamela Colman Smith, published by William Rider & Son), scanned by Saskia
 * Jansen and released on Wikimedia Commons as public domain:
 * https://commons.wikimedia.org/wiki/Category:Rider-Waite_tarot_deck_(Roses_%26_Lilies)
 * Not the 1971 U.S. Games recolouring, which is still under copyright.
 *
 * The scans are cropped inconsistently: some keep scanner bed and the card's
 * shadowed edge, others cut into the paper margin or touch the printed frame.
 * So every card is rebuilt from its printed black frame, which all of them
 * keep whole:
 *   1. Find the frame: the outermost long dark line on each side that has
 *      paper (not scanner bed or the scan's edge) outside it. A side that has
 *      none, because the scan cut it off, is set from the opposite side and
 *      the deck's frame ratio.
 *   2. Crop the scan to the frame and resize it to FRAME_WIDTH × FRAME_HEIGHT
 *      (the scans' scale and skew vary by about 2%, which this evens out).
 *   3. Set it on a MARGIN-wide paper border in the card's own paper colour,
 *      sampled from what the scan has of its margin, and round the corners to
 *      transparency. Every card comes out the same size with even margins.
 *   4. Soften the print's halftone screen (SCREEN_BLUR) so it does not alias
 *      into moiré, and encode WebP (WEBP_QUALITY, effort 6, smart
 *      subsampling). The aged colours are kept as scanned.
 * The back has no frame; its blue panel stands in for it.
 *
 * Output: CARD_WIDTH × CARD_HEIGHT (600 × 1004, about 2× a 300 CSS px card),
 * src/assets/tarot/<card id>.webp with the ids of src/apps/chance/tarot.ts,
 * plus back.webp.
 *
 * Originals are downloaded once into scripts/.cache/tarot/ (gitignored) and
 * checked against the SHA-1 Commons publishes. upload.wikimedia.org
 * rate-limits scripted downloads, so a refused request is served from the
 * Wayback Machine's copy of the same original instead. `sharp` is a
 * devDependency used only by this script.
 *
 * Usage:
 *   node scripts/tarot-cards.mjs                  # download if needed, write src/assets/tarot
 *   node scripts/tarot-cards.mjs --only major-0,cups-ace,back
 */

import { createHash } from 'node:crypto';
import { mkdirSync, existsSync, writeFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CACHE_DIR = path.join(ROOT, 'scripts/.cache/tarot');
const OUT_DIR = path.join(ROOT, 'src/assets/tarot');

export const CARD_WIDTH = 600;
/** Paper between the printed frame and the card's edge, in output pixels. */
const MARGIN = 22;
/** The printed frame's height over its width, the median over the deck's 78 scans. */
const FRAME_RATIO = 1.727;
const FRAME_WIDTH = CARD_WIDTH - 2 * MARGIN;
const FRAME_HEIGHT = Math.round(FRAME_WIDTH * FRAME_RATIO);
export const CARD_HEIGHT = FRAME_HEIGHT + 2 * MARGIN;
/** The card's rounded corner, in output pixels. */
const CORNER_RADIUS = 20;
const WEBP_QUALITY = 76;
/**
 * Blur (sigma, in scan pixels) applied before downsizing. The 1909 print's
 * halftone dot screen turns into moiré and noise at 600 px, which costs half
 * the bytes and reads as grain; this removes it and leaves the ink lines crisp.
 */
const SCREEN_BLUR = 0.8;

/** Luminance below which a pixel is frame ink. */
const INK = 95;
/** A frame line: this share of the middle of a LINE_BAND-wide band is ink. */
const LINE_SHARE = 0.4;
const LINE_BAND = 3;
/** The median luminance along a printed frame line stays under this (62–79); a card edge's shadow does not (89+). */
const INK_LINE_LEVEL = 84;
/** Luminance above which a pixel is scanner bed rather than paper. */
const SCANNER_BED = 236;
/** Paper luminance lies between card-edge shadow and scanner bed. */
const PAPER_MIN = 150;

const COMMONS_API = 'https://commons.wikimedia.org/w/api.php';
const USER_AGENT = 'lok-computer-tarot-script/1.0 (build-time asset download)';

const MAJOR_FILES = [
  '00 Fool', '01 Magician', '02 High Priestess', '03 Empress', '04 Emperor',
  '05 Hierophant', '06 Lovers', '07 Chariot', '08 Strength', '09 Hermit',
  '10 Wheel of Fortune', '11 Justice', '12 Hanged Man', '13 Death', '14 Temperance',
  '15 Devil', '16 Tower', '17 Star', '18 Moon', '19 Sun', '20 Judgement', '21 World',
];
const SUITS = ['wands', 'cups', 'swords', 'pentacles'];
const RANKS = ['ace', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'page', 'knight', 'queen', 'king'];

/**
 * Card id (as in src/apps/chance/tarot.ts) → Commons file name. Majors follow
 * the deck's own numbering (8 Strength, 11 Justice); a suit's files run
 * 01 (Ace) to 10, then 11 Page, 12 Knight, 13 Queen, 14 King.
 */
export const CARD_FILES = {
  ...Object.fromEntries(MAJOR_FILES.map((name, index) => [`major-${index}`, `RWS1909 - ${name}.jpeg`])),
  ...Object.fromEntries(SUITS.flatMap((suit) => RANKS.map((rank, index) => [
    `${suit}-${rank}`,
    `RWS1909 - ${suit[0].toUpperCase()}${suit.slice(1)} ${String(index + 1).padStart(2, '0')}.jpeg`,
  ]))),
  // The Roses & Lilies back that gives the first printing its name.
  back: 'Waite–Smith Tarot Roses and Lilies.jpg',
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** GET, retrying network errors and server failures a few times. */
const fetchOk = async (url, attempt = 0) => {
  let response;
  try {
    response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  } catch (error) {
    if (attempt >= 4) throw error;
    console.log(`  network error (${error.cause?.code ?? error.message}), retrying in 15 s`);
    await sleep(15000);
    return fetchOk(url, attempt + 1);
  }
  if (response.status >= 500 && attempt < 4) {
    await sleep(15000);
    return fetchOk(url, attempt + 1);
  }
  return response;
};

/** Original file URL and SHA-1 for the given Commons file names, 50 per API call. */
const resolveFiles = async (files) => {
  const info = new Map();
  for (let start = 0; start < files.length; start += 50) {
    const titles = files.slice(start, start + 50).map((file) => `File:${file}`).join('|');
    const params = new URLSearchParams({ action: 'query', prop: 'imageinfo', iiprop: 'url|sha1', titles, format: 'json', formatversion: '2' });
    const response = await fetchOk(`${COMMONS_API}?${params}`);
    if (!response.ok) throw new Error(`Commons API ${response.status}`);
    const { query } = await response.json();
    const normalized = new Map((query.normalized ?? []).map(({ from, to }) => [to, from]));
    for (const page of query.pages) {
      if (!page.imageinfo) throw new Error(`Not on Commons: ${page.title}`);
      const title = normalized.get(page.title) ?? page.title;
      const { url, sha1 } = page.imageinfo[0];
      info.set(title.replace(/^File:/, ''), { url: url.split('?')[0], sha1 });
    }
  }
  return info;
};

const sha1Of = (bytes) => createHash('sha1').update(bytes).digest('hex');

/**
 * The original's bytes, checked against the SHA-1 Commons publishes, or null
 * when no source has it right now. Wikimedia rate-limits scripted downloads
 * from upload.wikimedia.org (429 with a Retry-After of minutes); the Wayback
 * Machine keeps copies of most originals, so a refused request is tried there,
 * and the checksum proves it is the identical file. With `wait`, a 429 from
 * Commons is waited out instead.
 */
const downloadOriginal = async ({ url, sha1 }, { wait }) => {
  const sources = [url, `https://web.archive.org/web/2024id_/${url}`];
  for (let attempt = 0; attempt < 4; attempt += 1) {
    let retryAfterMs = 0;
    for (const source of sources) {
      const host = new URL(source).host;
      const response = await fetchOk(source);
      if (!response.ok) {
        console.log(`    ${response.status} from ${host}`);
        if (response.status === 429) retryAfterMs = (Number(response.headers.get('retry-after')) || 60) * 1000;
        continue;
      }
      const bytes = Buffer.from(await response.arrayBuffer());
      if (sha1Of(bytes) === sha1) return { bytes, host };
      console.log(`    checksum mismatch from ${host}`);
    }
    if (!wait || !retryAfterMs) return null;
    console.log(`    waiting ${Math.round(retryAfterMs / 1000)} s for Commons`);
    await sleep(retryAfterMs);
  }
  return null;
};

const cachePath = (file) => path.join(CACHE_DIR, file);

/** Two passes: everything that is available now, then what is left, waiting out the rate limit. */
const downloadMissing = async (files) => {
  let missing = files.filter((file) => !existsSync(cachePath(file)));
  if (missing.length === 0) return;
  mkdirSync(CACHE_DIR, { recursive: true });
  const info = await resolveFiles(missing);
  for (const wait of [false, true]) {
    const left = [];
    for (const [index, file] of missing.entries()) {
      const result = await downloadOriginal(info.get(file), { wait });
      if (!result) {
        left.push(file);
        continue;
      }
      writeFileSync(cachePath(file), result.bytes);
      console.log(`  ${index + 1}/${missing.length} ${file} (${result.host}, checksum ok)`);
      await sleep(1500);
    }
    missing = left;
    if (missing.length === 0) return;
    console.log(`  ${missing.length} not available yet: ${missing.join(', ')}`);
  }
  throw new Error(`No verified copy of ${missing.join(', ')}; download them by hand into scripts/.cache/tarot/`);
};

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[sorted.length >> 1];
};

const readScan = async (file) => {
  const { data, info } = await sharp(cachePath(file)).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const rgb = (x, y) => {
    const i = (y * width + x) * 3;
    return [data[i], data[i + 1], data[i + 2]];
  };
  const lum = (x, y) => {
    const [r, g, b] = rgb(x, y);
    return 0.299 * r + 0.587 * g + 0.114 * b;
  };
  return { width, height, rgb, lum };
};

/**
 * Per line across one axis (rows when `rows`), over the middle 70% of the
 * other: the share of pixels matching `isLine`, and the median luminance.
 */
const lineProfile = (scan, rows, isLine) => {
  const count = rows ? scan.height : scan.width;
  const length = rows ? scan.width : scan.height;
  const share = new Float32Array(count);
  const level = new Float32Array(count);
  for (let k = 0; k < count; k += 1) {
    let hits = 0;
    let total = 0;
    const samples = [];
    for (let j = Math.floor(length * 0.15); j < length * 0.85; j += 1) {
      const [x, y] = rows ? [j, k] : [k, j];
      total += 1;
      if (isLine(x, y)) hits += 1;
      if (j % 4 === 0) samples.push(scan.lum(x, y));
    }
    share[k] = hits / total;
    level[k] = median(samples);
  }
  return { share, level, count };
};

/**
 * Distance from one edge (the far one when `fromEnd`) to the outermost frame
 * line, or null when none is found. A dark line with scanner bed outside it is
 * the card's shadowed edge, not the frame; one with paper outside is the
 * frame. When the scan's edge leaves no room to look outside, only a line as
 * dark as printed ink counts (shadows are lighter).
 */
const findSide = ({ share, level, count }, fromEnd) => {
  const at = (i) => (fromEnd ? count - 1 - i : i);
  // A thin frame line on a slightly skewed scan spreads over a few lines, so
  // coverage is counted over a LINE_BAND-wide band going inward.
  const band = (i) => {
    let sum = 0;
    for (let d = 0; d < LINE_BAND && i + d < count; d += 1) sum += share[at(i + d)];
    return sum;
  };
  const limit = count * 0.15;
  let i = 0;
  while (i < limit) {
    if (band(i) < LINE_SHARE) {
      i += 1;
      continue;
    }
    const start = i;
    let darkest = Infinity;
    while (i < limit && band(i) >= LINE_SHARE) {
      darkest = Math.min(darkest, level[at(i)]);
      i += 1;
    }
    const outside = [];
    for (let d = 4; d <= 12; d += 1) if (start - d >= 0) outside.push(level[at(start - d)]);
    const roomOutside = outside.length >= 5;
    if (roomOutside ? median(outside) < SCANNER_BED : darkest < INK_LINE_LEVEL) return start;
  }
  return null;
};

/** How far a frame may stray from FRAME_RATIO before a side counts as misread. */
const RATIO_TOLERANCE = 0.04;

/**
 * The printed frame (or, for the back, the blue panel) as an extract box.
 * When a side's frame line is cut off or touches the scan's edge, findSide
 * either finds nothing or settles on a line of the art further in; both are
 * caught here (missing, or a frame off the deck's ratio) and that side is set
 * from the opposite one. A misread side is always the one with the larger
 * margin, since it went past the frame.
 */
const findFrame = (scan, isLine, id) => {
  const rows = lineProfile(scan, true, isLine);
  const cols = lineProfile(scan, false, isLine);
  const sides = {
    top: findSide(rows, false),
    bottom: findSide(rows, true),
    left: findSide(cols, false),
    right: findSide(cols, true),
  };
  const size = (a, b, length) => (sides[a] !== null && sides[b] !== null ? length - sides[a] - sides[b] : null);
  const dropWider = (a, b) => {
    if (sides[a] === null || sides[b] === null) return;
    if (sides[a] > sides[b]) sides[a] = null; else sides[b] = null;
  };
  let width = size('left', 'right', scan.width);
  let height = size('top', 'bottom', scan.height);
  if (width !== null && height !== null && Math.abs(height / width / FRAME_RATIO - 1) > RATIO_TOLERANCE) {
    // The axis that came out too small is the misread one.
    if (height / width > FRAME_RATIO) dropWider('left', 'right'); else dropWider('top', 'bottom');
  }
  const reconstructed = Object.values(sides).includes(null);
  width = size('left', 'right', scan.width);
  height = size('top', 'bottom', scan.height);
  if (width === null && height === null) throw new Error(`${id}: frame not found`);
  const frameWidth = width ?? Math.round(height / FRAME_RATIO);
  const frameHeight = height ?? Math.round(width * FRAME_RATIO);
  if (sides.left === null && sides.right === null) sides.left = Math.round((scan.width - frameWidth) / 2);
  if (sides.top === null && sides.bottom === null) sides.top = Math.round((scan.height - frameHeight) / 2);
  sides.left ??= scan.width - sides.right - frameWidth;
  sides.right ??= scan.width - sides.left - frameWidth;
  sides.top ??= scan.height - sides.bottom - frameHeight;
  sides.bottom ??= scan.height - sides.top - frameHeight;
  const box = {
    left: Math.max(0, sides.left),
    top: Math.max(0, sides.top),
    width: Math.min(scan.width, scan.width - sides.right) - Math.max(0, sides.left),
    height: Math.min(scan.height, scan.height - sides.bottom) - Math.max(0, sides.top),
  };
  if (Math.abs(box.height / box.width / FRAME_RATIO - 1) > RATIO_TOLERANCE) {
    throw new Error(`${id}: frame ${box.width}×${box.height} is off the deck's ratio`);
  }
  return { box, reconstructed };
};

/** The card's paper colour: the median of what the scan keeps of its margin. */
const paperColour = (scan, box) => {
  const samples = [[], [], []];
  const take = (x, y) => {
    if (x < 0 || y < 0 || x >= scan.width || y >= scan.height) return;
    const l = scan.lum(x, y);
    if (l < PAPER_MIN || l > SCANNER_BED) return;
    scan.rgb(x, y).forEach((value, channel) => samples[channel].push(value));
  };
  for (let d = 5; d <= 14; d += 1) {
    for (let x = box.left; x < box.left + box.width; x += 3) {
      take(x, box.top - d);
      take(x, box.top + box.height - 1 + d);
    }
    for (let y = box.top; y < box.top + box.height; y += 3) {
      take(box.left - d, y);
      take(box.left + box.width - 1 + d, y);
    }
  }
  if (samples[0].length < 200) return null;
  return { r: median(samples[0]), g: median(samples[1]), b: median(samples[2]) };
};

const cardMask = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_WIDTH}" height="${CARD_HEIGHT}">`
  + `<rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" rx="${CORNER_RADIUS}" ry="${CORNER_RADIUS}" fill="#fff"/></svg>`,
);

const isInk = (scan) => (x, y) => scan.lum(x, y) < INK;
/** The back's panel is printed blue. */
const isBlue = (scan) => (x, y) => {
  const [r, , b] = scan.rgb(x, y);
  return b - r > 60;
};

const convert = async (id, file, fallbackPaper) => {
  const scan = await readScan(file);
  const { box, reconstructed } = findFrame(scan, id === 'back' ? isBlue(scan) : isInk(scan), id);
  const paper = paperColour(scan, box) ?? fallbackPaper;
  const frame = await sharp(cachePath(file))
    .extract(box)
    .blur(SCREEN_BLUR)
    .resize(FRAME_WIDTH, FRAME_HEIGHT, { fit: 'fill', kernel: 'lanczos3' })
    .toBuffer();
  const output = path.join(OUT_DIR, `${id}.webp`);
  await sharp({ create: { width: CARD_WIDTH, height: CARD_HEIGHT, channels: 4, background: { ...paper, alpha: 1 } } })
    .composite([
      { input: frame, left: MARGIN, top: MARGIN },
      { input: cardMask, blend: 'dest-in' },
    ])
    .toColourspace('srgb')
    .webp({ quality: WEBP_QUALITY, alphaQuality: 90, effort: 6, smartSubsample: true })
    .toFile(output);
  return { id, box, paper, reconstructed, bytes: statSync(output).size };
};

const main = async () => {
  const onlyIndex = process.argv.indexOf('--only');
  const only = onlyIndex > -1 ? new Set(process.argv[onlyIndex + 1].split(',')) : null;
  const entries = Object.entries(CARD_FILES).filter(([id]) => !only || only.has(id));
  if (entries.length === 0) throw new Error('No cards match --only');

  await downloadMissing(entries.map(([, file]) => file));
  mkdirSync(OUT_DIR, { recursive: true });

  const fallbackPaper = { r: 226, g: 208, b: 176 };
  const results = [];
  for (const [id, file] of entries) results.push(await convert(id, file, fallbackPaper));

  const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;
  for (const { id, box, paper, reconstructed, bytes } of results) {
    const ratio = (box.height / box.width).toFixed(3);
    console.log(`${id.padEnd(16)} frame ${box.width}×${box.height} (${ratio})${reconstructed ? ' [side rebuilt]' : ''}`
      + ` paper rgb(${paper.r},${paper.g},${paper.b}) → ${kb(bytes)}`);
  }
  const sizes = results.map((result) => result.bytes);
  console.log(`\n${results.length} images, ${CARD_WIDTH}×${CARD_HEIGHT}, total ${kb(sizes.reduce((a, b) => a + b, 0))}, `
    + `${kb(Math.min(...sizes))}–${kb(Math.max(...sizes))} each`);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

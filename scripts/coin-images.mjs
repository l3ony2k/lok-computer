#!/usr/bin/env node
/**
 * Coin faces for Chance: real coins from the Smithsonian's National
 * Numismatic Collection, photographed by Jaclyn Nash (2015) and published on
 * Wikimedia Commons. The first was a 1909 Lincoln cent, the same year as the
 * tarot deck; the list below adds US type coins and three gold and world coins.
 *
 * Public domain twice over: US coins are US Mint designs (PD-USGov-money), the
 * world coins are designs long out of copyright (Wyon, 1835 and 1839), and the
 * photographs are works of a Smithsonian employee (PD-USGov-SI). The NNC asks
 * for credit: National Numismatic Collection, National Museum of American
 * History (given in NOTICE.md and About).
 *
 * Processing, per side (obverse on the left half of the photo, reverse on
 * the right):
 *   1. Find the coin on its backdrop (white or black): a pixel is coin when it
 *      differs from the backdrop in brightness or saturation; a row or column
 *      belongs to the coin when enough of its pixels are (so stray dust does
 *      not count). The extents give the centre and the diameter.
 *   2. Crop a square around that centre, a little inside the rim's outer edge
 *      (RIM_INSET) so no backdrop survives, and resize it to SIZE × SIZE. Both
 *      faces come out the same size whatever their size in the photo.
 *   3. Mask everything outside the circle to transparency (an antialiased
 *      SVG circle) and encode WebP (WEBP_QUALITY, effort 6). Colours are kept
 *      as photographed; the photos are already upright.
 *
 * Output: SIZE × SIZE (about 2× the coin's largest display size, 164 CSS px),
 * src/assets/coin/<id>/heads.webp and tails.webp. Add the id to COIN_TYPES in
 * src/apps/chance/coins.ts and a row to NOTICE.md.
 *
 * Originals are downloaded once into scripts/.cache/coin/ (gitignored) and
 * checked against the SHA-1 Commons publishes. upload.wikimedia.org
 * rate-limits scripted downloads, so a refused request is served from the
 * Wayback Machine's copy of the same original instead, and the script pauses
 * between downloads. `sharp` is a devDependency used only by the asset scripts.
 *
 * Usage:
 *   node scripts/coin-images.mjs                     # every coin
 *   node scripts/coin-images.mjs --only peace-dollar-1921,barber-dime-1892
 */

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CACHE_DIR = path.join(ROOT, 'scripts/.cache/coin');
const OUT_ROOT = path.join(ROOT, 'src/assets/coin');

/**
 * The coins, each one photograph with the obverse (heads) on the left half and
 * the reverse (tails) on the right, all from the National Numismatic
 * Collection on Wikimedia Commons. `backdrop` is what the coins sit on: the
 * US base-metal and silver coins were shot on white, the gold and world coins
 * on black.
 */
const COINS = [
  {
    id: 'lincoln-cent-1909',
    file: 'NNC-US-1909-1C-Lincoln Cent (wheat).jpg',
    url: 'https://upload.wikimedia.org/wikipedia/commons/6/6b/NNC-US-1909-1C-Lincoln_Cent_%28wheat%29.jpg',
    sha1: '9997f42c4479aca162e0b76ccda2a7c0048e6e0e',
    backdrop: 'white',
  },
  {
    id: 'indian-head-cent-1859',
    file: "NNC-US-1859-1C-Indian Head Cent (wreath).jpg",
    url: 'https://upload.wikimedia.org/wikipedia/commons/3/31/NNC-US-1859-1C-Indian_Head_Cent_%28wreath%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original',
    sha1: 'fc7b7f5fd7395834cfc4dd5138bd5de8a496d90c',
    backdrop: 'white',
  },
  {
    id: 'buffalo-nickel-1913',
    file: "NNC-US-1913-5C-Buffalo Nickel (TyI-mound).jpg",
    url: 'https://upload.wikimedia.org/wikipedia/commons/0/00/NNC-US-1913-5C-Buffalo_Nickel_%28TyI-mound%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original',
    sha1: '8233bb97d73262994dbe661dd461d0787ede65f1',
    backdrop: 'white',
  },
  {
    id: 'peace-dollar-1921',
    file: "NNC-US-1921-1$-Peace dollar.jpg",
    url: 'https://upload.wikimedia.org/wikipedia/commons/9/9d/NNC-US-1921-1%24-Peace_dollar.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original',
    sha1: 'eea708fe91cbf00f59fcb8c04dd63934de205d56',
    backdrop: 'white',
  },
  {
    id: 'morgan-dollar-1878',
    file: "NNC-US-1878-CC-1$-Morgan dollar.jpg",
    url: 'https://upload.wikimedia.org/wikipedia/commons/6/68/NNC-US-1878-CC-1%24-Morgan_dollar.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original',
    sha1: '25c07dcfd7d7ee7e029c6bc5f54b9ad55baee0f3',
    backdrop: 'white',
  },
  {
    id: 'barber-dime-1892',
    file: "NNC-US-1892-10C-Barber Dime.jpg",
    url: 'https://upload.wikimedia.org/wikipedia/commons/8/84/NNC-US-1892-10C-Barber_Dime.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original',
    sha1: '9c5e17fb3bde411a11a432913483b344b44d4343',
    backdrop: 'white',
  },
  {
    id: 'seated-quarter-1873',
    file: "NNC-US-1873-25C-Seated Liberty (no arrows).jpg",
    url: 'https://upload.wikimedia.org/wikipedia/commons/f/fe/NNC-US-1873-25C-Seated_Liberty_%28no_arrows%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original',
    sha1: '2062eac263b353cc91cfe721267994f3f9863118',
    backdrop: 'white',
  },
  {
    id: 'double-eagle-1907',
    file: "NNC-US-1907-G$20-Saint Gaudens (Arabic).jpg",
    url: 'https://upload.wikimedia.org/wikipedia/commons/1/16/NNC-US-1907-G%2420-Saint_Gaudens_%28Arabic%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original',
    sha1: '52e2212d24e07e0829d1bce6422e885b9d4b75c4',
    backdrop: 'black',
  },
  {
    id: 'una-and-the-lion-1839',
    file: "England (UK) 1839 5 Pounds (Una and the Lion).jpg",
    url: 'https://upload.wikimedia.org/wikipedia/commons/4/4f/England_%28UK%29_1839_5_Pounds_%28Una_and_the_Lion%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original',
    sha1: 'a17a9cd5f7e21f4beacaf4cdbebde684b2bb01e9',
    backdrop: 'black',
  },
  {
    id: 'india-mohurs-1835',
    file: "India 1835 2 Mohurs.jpg",
    url: 'https://upload.wikimedia.org/wikipedia/commons/7/75/India_1835_2_Mohurs.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original',
    sha1: 'adbb531608e634e42ed0eb86b03009ed7ddc741c',
    backdrop: 'black',
  },
];
const USER_AGENT = 'lok-computer-coin-script/1.0 (build-time asset download)';

export const SIZE = 360;
const WEBP_QUALITY = 80;
/** Share of the radius trimmed off the rim, so the antialiased edge never shows backdrop. */
const RIM_INSET = 0.006;
/** A white backdrop is brighter than this luminance, a black one darker than BLACK_LUM; both nearly grey. */
const BACKDROP_LUM = 228;
const BLACK_LUM = 40;
const BACKDROP_CHROMA = 24;
/** Pause between downloads, to stay under Commons' rate limit. */
const DOWNLOAD_PAUSE_MS = 4000;
/** A row or column is part of the coin when this many of its pixels are coin. */
const MIN_RUN = 40;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const sha1Of = (bytes) => createHash('sha1').update(bytes).digest('hex');
const cachePathOf = (coin) => path.join(CACHE_DIR, coin.file);

/** The original's bytes from Commons, or the Wayback Machine's copy, checked against the published SHA-1. */
const download = async (coin) => {
  const cachePath = cachePathOf(coin);
  if (existsSync(cachePath) && sha1Of(readFileSync(cachePath)) === coin.sha1) return 'cache';
  mkdirSync(CACHE_DIR, { recursive: true });
  const sources = [coin.url, `https://web.archive.org/web/2024id_/${coin.url}`];
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
      if (sha1Of(bytes) !== coin.sha1) {
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
  throw new Error(`No verified copy of ${coin.file}; download it by hand into scripts/.cache/coin/`);
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
const findCoin = ({ data, width, height }, fromX, toX, backdrop) => {
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
      const differs = backdrop === 'black' ? lum > BLACK_LUM : lum < BACKDROP_LUM;
      if (differs || chroma > BACKDROP_CHROMA) {
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

const convert = async (entry, photo, side, fromX, toX) => {
  const coin = findCoin(photo, fromX, toX, entry.backdrop);
  if (Math.abs(coin.roundness - 1) > 0.02) throw new Error(`${side}: coin is not round (${coin.roundness.toFixed(3)})`);
  const radius = coin.radius * (1 - RIM_INSET);
  const box = {
    left: Math.round(coin.cx - radius),
    top: Math.round(coin.cy - radius),
    width: Math.round(radius * 2),
    height: Math.round(radius * 2),
  };
  const face = await sharp(cachePathOf(entry))
    .extract(box)
    .resize(SIZE, SIZE, { fit: 'fill', kernel: 'lanczos3' })
    .toBuffer();
  const output = path.join(OUT_ROOT, entry.id, `${side}.webp`);
  await sharp(face)
    .ensureAlpha()
    .composite([{ input: circleMask, blend: 'dest-in' }])
    .toColourspace('srgb')
    .webp({ quality: WEBP_QUALITY, alphaQuality: 90, effort: 6, smartSubsample: true })
    .toFile(output);
  return { side, coin, box, bytes: statSync(output).size };
};

const processCoin = async (entry) => {
  const source = await download(entry);
  console.log(`${entry.id}: ${entry.file} (${source}, checksum ok)`);
  mkdirSync(path.join(OUT_ROOT, entry.id), { recursive: true });
  const { data, info } = await sharp(cachePathOf(entry)).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const photo = { data, width: info.width, height: info.height };
  const middle = Math.round(photo.width / 2);
  const results = [
    await convert(entry, photo, 'heads', 0, middle),
    await convert(entry, photo, 'tails', middle, photo.width),
  ];
  for (const { side, coin, box, bytes } of results) {
    console.log(`  ${side.padEnd(6)} centre (${coin.cx.toFixed(0)}, ${coin.cy.toFixed(0)}) diameter ${(coin.radius * 2).toFixed(0)} px`
      + ` (x/y ${coin.roundness.toFixed(3)}), crop ${box.width} px → ${SIZE}×${SIZE}, ${(bytes / 1024).toFixed(1)} KB`);
  }
  return source;
};

const main = async () => {
  const onlyIndex = process.argv.indexOf('--only');
  const only = onlyIndex > -1 ? new Set(process.argv[onlyIndex + 1].split(',')) : null;
  const coins = only ? COINS.filter((coin) => only.has(coin.id)) : COINS;
  if (only && coins.length !== only.size) throw new Error(`unknown coin id in --only: ${[...only].join(', ')}`);
  for (const [index, coin] of coins.entries()) {
    const source = await processCoin(coin);
    if (source !== 'cache' && index < coins.length - 1) await sleep(DOWNLOAD_PAUSE_MS);
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

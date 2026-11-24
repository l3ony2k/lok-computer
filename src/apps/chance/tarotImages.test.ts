import { describe, expect, test } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { TAROT_DECK, TAROT_IMAGE_SIZE } from './tarot';

// Vite resolves the glob in tarotImages.ts at build time; here the directory is read directly.
const directory = fileURLToPath(new URL('../../assets/tarot/', import.meta.url));

/** Pixel size from a WebP header (lossy VP8, lossless VP8L, or extended VP8X). */
const webpSize = (bytes: Buffer): { width: number; height: number } => {
  const chunk = bytes.toString('ascii', 12, 16);
  if (chunk === 'VP8X') return { width: 1 + bytes.readUIntLE(24, 3), height: 1 + bytes.readUIntLE(27, 3) };
  if (chunk === 'VP8L') {
    const bits = bytes.readUInt32LE(21);
    return { width: 1 + (bits & 0x3fff), height: 1 + ((bits >> 14) & 0x3fff) };
  }
  return { width: bytes.readUInt16LE(26) & 0x3fff, height: bytes.readUInt16LE(28) & 0x3fff };
};

describe('tarot art', () => {
  const files = readdirSync(directory).filter((name) => name.endsWith('.webp'));

  test('every card in the deck has an image', () => {
    const names = new Set(files);
    expect(TAROT_DECK.filter((card) => !names.has(`${card.id}.webp`)).map((card) => card.id)).toEqual([]);
  });

  test('every image has the size the layout reserves', () => {
    const odd = files.filter((name) => {
      const { width, height } = webpSize(readFileSync(`${directory}${name}`));
      return width !== TAROT_IMAGE_SIZE.width || height !== TAROT_IMAGE_SIZE.height;
    });
    expect(odd).toEqual([]);
  });
});

/**
 * URLs of the coin photos (see coins.ts). Vite resolves the glob at build
 * time; the boot warm-up leaves coins out, so only coins on the table load.
 */
import { coinType } from './coins';
import type { CoinSide } from './random';

const files = import.meta.glob('/src/assets/coin/*/*.webp', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const faces = new Map(Object.entries(files).map(([path, url]) => {
  const [type, file] = path.split('/').slice(-2);
  return [`${type}/${file.slice(0, -'.webp'.length)}`, url];
}));

/** The photo of one face of a coin type. */
export const coinFace = (id: string, side: CoinSide): string | undefined => faces.get(`${coinType(id).id}/${side}`);

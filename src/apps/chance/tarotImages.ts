/**
 * Card art for the tarot deck: the 1909 Rider–Waite–Smith scans, one WebP per
 * card at src/assets/tarot/<card id>.webp (made by scripts/tarot-cards.mjs).
 * They are hashed build assets loaded only when drawn; the boot screen leaves
 * them out of its warm-up. tarotImages.test.ts checks every card has a file.
 */
import type { TarotCard } from './tarot';

const files = import.meta.glob('/src/assets/tarot/*.webp', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const urls = new Map(Object.entries(files).map(([path, url]) => [
  path.slice(path.lastIndexOf('/') + 1, -'.webp'.length),
  url,
]));

export const tarotImage = (card: TarotCard): string | undefined => urls.get(card.id);

/** The card back, if the art includes one. */
export const TAROT_BACK: string | undefined = urls.get('back');

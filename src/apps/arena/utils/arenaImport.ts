/**
 * Collects things from an Are.na channel or block for other apps: playable
 * media for the Media Player, images for the Image Viewer.
 *
 * Pages are read one at a time, newest first like the channel window, so a
 * large channel doesn't trip Are.na's rate limit.
 */
import { fetchBlock, getChannelContents, getChannelDetails } from '@/lib/api';
import type { ArenaItem } from '@/types/arena';
import type { ArenaReference } from './arenaLinks';

const PAGE_SIZE = 100;
/** Blocks read before giving up on finding more matches. */
const MAX_SCANNED = 1000;

export interface ArenaCollectProgress {
  scanned: number;
  total: number;
  found: number;
}

export interface ArenaCollection<T> {
  title: string;
  items: T[];
  scanned: number;
  total: number;
  /** More matches may exist past the limit or the scan cap. */
  truncated: boolean;
}

interface CollectOptions {
  limit?: number;
  signal?: AbortSignal;
  onProgress?: (progress: ArenaCollectProgress) => void;
}

export const collectFromArena = async <T>(
  reference: ArenaReference,
  pick: (item: ArenaItem) => T | null,
  { limit = 200, signal, onProgress }: CollectOptions = {},
): Promise<ArenaCollection<T>> => {
  if (reference.type === 'block') {
    const block = await fetchBlock(reference.id, signal);
    const item = pick(block);
    return {
      title: block.title && block.title !== 'Untitled' ? block.title : `Block ${reference.id}`,
      items: item ? [item] : [],
      scanned: 1,
      total: 1,
      truncated: false,
    };
  }

  const channel = await getChannelDetails(reference.slug, signal);
  const items: T[] = [];
  let total = channel.counts.contents || channel.counts.blocks;
  let scanned = 0;
  let truncated = false;

  for (let page = 1; ; page += 1) {
    const result = await getChannelContents(reference.slug, page, PAGE_SIZE, signal);
    total = Math.max(total, result.meta.totalCount);
    for (const entry of result.items) {
      const item = pick(entry);
      if (!item) continue;
      items.push(item);
      if (items.length >= limit) break;
    }
    scanned += result.items.length;
    onProgress?.({ scanned, total, found: items.length });

    const full = items.length >= limit;
    if (full || !result.meta.hasMorePages || !result.items.length || scanned >= MAX_SCANNED) {
      truncated = scanned < total && (full || scanned >= MAX_SCANNED);
      break;
    }
  }

  return { title: channel.title || reference.slug, items, scanned, total, truncated };
};

/** A sentence for a failed Are.na read. */
export const describeArenaError = (error: unknown, reference: ArenaReference) => {
  const what = reference.type === 'channel' ? 'channel' : 'block';
  const status = error instanceof Error ? /\((\d{3})\)/.exec(error.message)?.[1] : undefined;
  switch (status) {
    case '401':
    case '403':
      return `That Are.na ${what} is private.`;
    case '404':
      return `No Are.na ${what} at that address.`;
    case '429':
      return 'Are.na is rate limiting requests. Try again in a minute.';
    default:
      return `Couldn’t read that Are.na ${what}. Check your connection and try again.`;
  }
};

export const isAbortError = (error: unknown) => (
  typeof error === 'object' && error !== null && (error as { name?: unknown }).name === 'AbortError'
);

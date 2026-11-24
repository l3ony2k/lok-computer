import { cacheDebugLog } from '@/lib/debug';
import { isOnline } from '@/hooks/useOnlineStatus';
import { getCachedEntry, incrementRequestCount, setCachedData } from '@/lib/storage';

export interface CachedRequestOptions<T> {
  cacheKey: string;
  ttlMs: number;
  source: string;
  load: () => Promise<T>;
  debugLabel?: string;
}

/** Thrown offline when nothing has been saved for the request yet. */
export class OfflineError extends Error {
  constructor(message = 'You are offline, and nothing is saved for this yet.') {
    super(message);
    this.name = 'OfflineError';
  }
}

export const isOfflineError = (error: unknown): error is OfflineError => (
  error instanceof OfflineError || (error instanceof Error && error.name === 'OfflineError')
);

type RevalidatedListener = (cacheKey: string) => void;

const revalidatedListeners = new Set<RevalidatedListener>();
const revalidating = new Set<string>();
// When each key last refreshed in the background. If the write did not stick
// (storage full or blocked), the entry still reads as expired; this keeps a
// key from refreshing again before its TTL has passed.
const revalidatedAt = new Map<string, number>();

/**
 * Called after a background refresh has stored a newer copy than the one a
 * request already returned. The query layer uses it to re-read the cache.
 */
export const onCacheRevalidated = (listener: RevalidatedListener) => {
  revalidatedListeners.add(listener);
  return () => {
    revalidatedListeners.delete(listener);
  };
};

const revalidate = <T>({ cacheKey, ttlMs, source, load, debugLabel = cacheKey }: CachedRequestOptions<T>) => {
  if (revalidating.has(cacheKey)) return;
  const last = revalidatedAt.get(cacheKey);
  if (last !== undefined && Date.now() - last < ttlMs) return;

  revalidating.add(cacheKey);
  void (async () => {
    try {
      await incrementRequestCount(source);
      const data = await load();
      await setCachedData(cacheKey, data, ttlMs);
      revalidatedAt.set(cacheKey, Date.now());
      cacheDebugLog(`[Cache] Refreshed in the background: ${debugLabel}`);
      revalidatedListeners.forEach((listener) => listener(cacheKey));
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      console.warn(`[Cache] Background refresh failed, keeping saved copy: ${debugLabel}`, error);
    } finally {
      revalidating.delete(cacheKey);
    }
  })();
};

/**
 * Runs the complete persistent request lifecycle behind one interface.
 * Source modules retain request construction and decoding; cache policy,
 * accounting, and debug behavior stay local to this implementation.
 *
 * A fresh entry wins. An expired entry is returned at once, so a window fills
 * immediately instead of waiting on the network, and a newer copy is fetched
 * in the background (stale-while-revalidate); `onCacheRevalidated` reports it.
 * Offline, or when that refresh fails, the saved copy simply stays.
 */
export const cachedRequest = async <T>(options: CachedRequestOptions<T>): Promise<T> => {
  const { cacheKey, ttlMs, source, load, debugLabel = cacheKey } = options;
  const cached = await getCachedEntry<T>(cacheKey);
  if (cached && !cached.expired) {
    cacheDebugLog(`[Cache] Hit: ${debugLabel}`);
    return cached.data;
  }

  if (!isOnline()) {
    if (cached) {
      cacheDebugLog(`[Cache] Offline, serving saved copy: ${debugLabel}`);
      return cached.data;
    }
    throw new OfflineError();
  }

  if (cached) {
    cacheDebugLog(`[Cache] Stale, serving saved copy while it refreshes: ${debugLabel}`);
    revalidate(options);
    return cached.data;
  }

  await incrementRequestCount(source);
  const data = await load();
  await setCachedData(cacheKey, data, ttlMs);
  return data;
};

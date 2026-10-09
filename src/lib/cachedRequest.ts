import { cacheDebugLog } from '@/lib/debug';
import { isOnline } from '@/hooks/useOnlineStatus';
import { getCachedData, incrementRequestCount, setCachedData } from '@/lib/storage';

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

/**
 * Runs the complete persistent request lifecycle behind one interface.
 * Source modules retain request construction and decoding; cache policy,
 * accounting, and debug behavior stay local to this implementation.
 *
 * A fresh entry wins. Offline, or when the network fails, an expired entry is
 * served instead of an error, so the desktop keeps showing the last copy of a
 * feed rather than a spinner or a red message.
 */
export const cachedRequest = async <T>({
  cacheKey,
  ttlMs,
  source,
  load,
  debugLabel = cacheKey,
}: CachedRequestOptions<T>): Promise<T> => {
  const cached = await getCachedData<T>(cacheKey);
  if (cached !== null) {
    cacheDebugLog(`[Cache] Hit: ${debugLabel}`);
    return cached;
  }

  const stale = () => getCachedData<T>(cacheKey, { allowStale: true });

  if (!isOnline()) {
    const saved = await stale();
    if (saved !== null) {
      cacheDebugLog(`[Cache] Offline, serving saved copy: ${debugLabel}`);
      return saved;
    }
    throw new OfflineError();
  }

  await incrementRequestCount(source);
  let data: T;
  try {
    data = await load();
  } catch (error) {
    const saved = await stale();
    if (saved !== null) {
      console.warn(`[Cache] Request failed, serving saved copy: ${debugLabel}`, error);
      return saved;
    }
    throw error;
  }
  await setCachedData(cacheKey, data, ttlMs);
  return data;
};

import { cacheDebugLog } from '@/lib/debug';
import { getCachedData, incrementRequestCount, setCachedData } from '@/lib/storage';

export interface CachedRequestOptions<T> {
  cacheKey: string;
  ttlMs: number;
  source: string;
  load: () => Promise<T>;
  debugLabel?: string;
}

/**
 * Runs the complete persistent request lifecycle behind one interface.
 * Source modules retain request construction and decoding; cache policy,
 * accounting, and debug behavior stay local to this implementation.
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

  await incrementRequestCount(source);
  const data = await load();
  await setCachedData(cacheKey, data, ttlMs);
  return data;
};

import { beforeEach, describe, expect, it, mock } from 'bun:test';

const getCachedData = mock(async () => null as unknown);
const incrementRequestCount = mock(async () => undefined);
const setCachedData = mock(async () => undefined);
const cacheDebugLog = mock(() => undefined);

mock.module('@/lib/storage', () => ({
  getCachedData,
  incrementRequestCount,
  setCachedData,
}));

mock.module('@/lib/debug', () => ({ cacheDebugLog }));

let online = true;
mock.module('@/hooks/useOnlineStatus', () => ({ isOnline: () => online }));

const { cachedRequest, OfflineError, isOfflineError } = await import('@/lib/cachedRequest');

describe('cachedRequest', () => {
  beforeEach(() => {
    getCachedData.mockReset();
    getCachedData.mockResolvedValue(null);
    incrementRequestCount.mockReset();
    incrementRequestCount.mockResolvedValue(undefined);
    setCachedData.mockReset();
    setCachedData.mockResolvedValue(undefined);
    cacheDebugLog.mockReset();
    online = true;
  });

  it('returns a cache hit without crossing the remote seam', async () => {
    getCachedData.mockResolvedValue({ value: 7 });
    const load = mock(async () => ({ value: 9 }));

    const result = await cachedRequest({
      cacheKey: 'example:7',
      ttlMs: 1000,
      source: 'example',
      load,
    });

    expect(result).toEqual({ value: 7 });
    expect(load).not.toHaveBeenCalled();
    expect(incrementRequestCount).not.toHaveBeenCalled();
    expect(setCachedData).not.toHaveBeenCalled();
    expect(cacheDebugLog).toHaveBeenCalledTimes(1);
  });

  it('accounts, loads, and stores once on a cache miss', async () => {
    const load = mock(async () => ({ value: 9 }));

    const result = await cachedRequest({
      cacheKey: 'example:9',
      ttlMs: 2500,
      source: 'example',
      debugLabel: 'example item',
      load,
    });

    expect(result).toEqual({ value: 9 });
    expect(incrementRequestCount).toHaveBeenCalledWith('example');
    expect(load).toHaveBeenCalledTimes(1);
    expect(setCachedData).toHaveBeenCalledWith('example:9', { value: 9 }, 2500);
  });

  it('serves the saved copy when the network fails', async () => {
    getCachedData.mockImplementation(async (_key: string, options?: { allowStale?: boolean }) => (
      options?.allowStale ? { value: 'stale' } : null
    ));
    const load = mock(async () => { throw new Error('boom'); });

    const result = await cachedRequest({ cacheKey: 'example:stale', ttlMs: 1000, source: 'example', load });

    expect(result).toEqual({ value: 'stale' });
    expect(load).toHaveBeenCalledTimes(1);
    expect(setCachedData).not.toHaveBeenCalled();
  });

  it('offline, serves the saved copy without touching the network', async () => {
    online = false;
    getCachedData.mockImplementation(async (_key: string, options?: { allowStale?: boolean }) => (
      options?.allowStale ? { value: 'stale' } : null
    ));
    const load = mock(async () => ({ value: 'fresh' }));

    const result = await cachedRequest({ cacheKey: 'example:offline', ttlMs: 1000, source: 'example', load });

    expect(result).toEqual({ value: 'stale' });
    expect(load).not.toHaveBeenCalled();
    expect(incrementRequestCount).not.toHaveBeenCalled();
  });

  it('offline with nothing saved, fails with an OfflineError', async () => {
    online = false;
    const load = mock(async () => ({ value: 'fresh' }));

    const attempt = cachedRequest({ cacheKey: 'example:miss', ttlMs: 1000, source: 'example', load });

    await expect(attempt).rejects.toBeInstanceOf(OfflineError);
    expect(load).not.toHaveBeenCalled();
    expect(isOfflineError(new OfflineError())).toBeTrue();
    expect(isOfflineError(new Error('boom'))).toBeFalse();
  });
});

import { beforeEach, describe, expect, it, mock } from 'bun:test';

const getCachedEntry = mock(async (_key: string): Promise<{ data: unknown; expired: boolean } | null> => null);
const incrementRequestCount = mock(async () => undefined);
const setCachedData = mock(async () => undefined);
const cacheDebugLog = mock(() => undefined);

// Bun's module mocks are process-wide and outlive this file, so each one keeps
// the real module's other exports; later test files import the same modules.
const realStorage = await import('@/lib/storage');
const realDebug = await import('@/lib/debug');
const realOnlineStatus = await import('@/hooks/useOnlineStatus');

mock.module('@/lib/storage', () => ({
  ...realStorage,
  getCachedEntry,
  incrementRequestCount,
  setCachedData,
}));

mock.module('@/lib/debug', () => ({ ...realDebug, cacheDebugLog }));

let online = true;
mock.module('@/hooks/useOnlineStatus', () => ({ ...realOnlineStatus, isOnline: () => online }));

const { cachedRequest, onCacheRevalidated, OfflineError, isOfflineError } = await import('@/lib/cachedRequest');

const stale = (data: unknown) => async () => ({ data, expired: true });
// The background refresh is fire-and-forget; let its promise chain settle.
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('cachedRequest', () => {
  beforeEach(() => {
    getCachedEntry.mockReset();
    getCachedEntry.mockResolvedValue(null);
    incrementRequestCount.mockReset();
    incrementRequestCount.mockResolvedValue(undefined);
    setCachedData.mockReset();
    setCachedData.mockResolvedValue(undefined);
    cacheDebugLog.mockReset();
    online = true;
  });

  it('returns a cache hit without crossing the remote seam', async () => {
    getCachedEntry.mockResolvedValue({ data: { value: 7 }, expired: false });
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

  it('serves an expired copy at once and refreshes it in the background', async () => {
    getCachedEntry.mockImplementation(stale({ value: 'stale' }));
    const load = mock(async () => ({ value: 'fresh' }));
    const revalidated = mock((_key: string) => undefined);
    const stop = onCacheRevalidated(revalidated);

    const result = await cachedRequest({ cacheKey: 'example:swr', ttlMs: 1000, source: 'example', load });
    expect(result).toEqual({ value: 'stale' });

    await settle();
    stop();
    expect(load).toHaveBeenCalledTimes(1);
    expect(incrementRequestCount).toHaveBeenCalledWith('example');
    expect(setCachedData).toHaveBeenCalledWith('example:swr', { value: 'fresh' }, 1000);
    expect(revalidated).toHaveBeenCalledWith('example:swr');
  });

  it('refreshes a key once while a refresh is in flight, and not again within its TTL', async () => {
    getCachedEntry.mockImplementation(stale({ value: 'stale' }));
    let finish: (value: { value: string }) => void = () => undefined;
    const load = mock(() => new Promise<{ value: string }>((resolve) => { finish = resolve; }));
    const options = { cacheKey: 'example:once', ttlMs: 60_000, source: 'example', load };

    await cachedRequest(options);
    await cachedRequest(options);
    finish({ value: 'fresh' });
    await settle();
    // The write did not stick (the entry still reads as expired): no second refresh.
    await cachedRequest(options);
    await settle();

    expect(load).toHaveBeenCalledTimes(1);
  });

  it('keeps the saved copy when the background refresh fails', async () => {
    getCachedEntry.mockImplementation(stale({ value: 'stale' }));
    const load = mock(async (): Promise<{ value: string }> => { throw new Error('boom'); });
    const revalidated = mock((_key: string) => undefined);
    const stop = onCacheRevalidated(revalidated);
    const warn = console.warn;
    console.warn = () => undefined;

    const result = await cachedRequest({ cacheKey: 'example:fail', ttlMs: 1000, source: 'example', load });
    await settle();
    console.warn = warn;
    stop();

    expect(result).toEqual({ value: 'stale' });
    expect(load).toHaveBeenCalledTimes(1);
    expect(setCachedData).not.toHaveBeenCalled();
    expect(revalidated).not.toHaveBeenCalled();
  });

  it('fails a miss when the network fails', async () => {
    const load = mock(async (): Promise<{ value: string }> => { throw new Error('boom'); });

    await expect(cachedRequest({ cacheKey: 'example:down', ttlMs: 1000, source: 'example', load })).rejects.toThrow('boom');
    expect(setCachedData).not.toHaveBeenCalled();
  });

  it('offline, serves the saved copy without touching the network', async () => {
    online = false;
    getCachedEntry.mockImplementation(stale({ value: 'stale' }));
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

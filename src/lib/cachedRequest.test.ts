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

const { cachedRequest } = await import('@/lib/cachedRequest');

describe('cachedRequest', () => {
  beforeEach(() => {
    getCachedData.mockReset();
    getCachedData.mockResolvedValue(null);
    incrementRequestCount.mockReset();
    incrementRequestCount.mockResolvedValue(undefined);
    setCachedData.mockReset();
    setCachedData.mockResolvedValue(undefined);
    cacheDebugLog.mockReset();
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
});

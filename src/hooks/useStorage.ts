/**
 * React hooks for IndexedDB storage
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import {
    initStorage,
    getAppState,
    setAppState,
    getCachedData,
    setCachedData,
    getUsageStats,
    clearCache,
    clearExpiredCache,
    isStorageAvailable,
    type UsageStats,
} from '@/lib/storage';

/**
 * Hook to initialize storage on app mount
 */
export const useStorageInit = () => {
    const [isReady, setIsReady] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (!isStorageAvailable()) {
            console.warn('[Storage] IndexedDB not available, using fallback');
            setIsReady(true);
            return;
        }

        initStorage()
            .then(() => {
                setIsReady(true);
            })
            .catch((err) => {
                console.error('[Storage] Failed to initialize:', err);
                setError(err);
                setIsReady(true); // Still mark as ready to allow app to function
            });
    }, []);

    return { isReady, error };
};

/**
 * Hook for persisted state that syncs with IndexedDB
 * 
 * @param key - Storage key
 * @param defaultValue - Default value if nothing is stored
 * @returns [value, setValue, isLoading]
 */
export const usePersistedState = <T>(
    key: string,
    defaultValue: T
): [T, (value: T | ((prev: T) => T)) => void, boolean] => {
    const [value, setValue] = useState<T>(defaultValue);
    const [isLoading, setIsLoading] = useState(true);
    const isInitialLoad = useRef(true);

    // Load initial value from storage
    useEffect(() => {
        let mounted = true;

        const loadValue = async () => {
            try {
                const stored = await getAppState<T>(key);
                if (mounted && stored !== null) {
                    setValue(stored);
                }
            } catch (error) {
                console.error(`[Storage] Failed to load persisted state for "${key}":`, error);
            } finally {
                if (mounted) {
                    setIsLoading(false);
                    isInitialLoad.current = false;
                }
            }
        };

        loadValue();

        return () => {
            mounted = false;
        };
    }, [key]);

    // Save to storage when value changes (skip initial load)
    useEffect(() => {
        if (isInitialLoad.current || isLoading) {
            return;
        }

        const saveValue = async () => {
            try {
                await setAppState(key, value);
            } catch (error) {
                console.error(`[Storage] Failed to save persisted state for "${key}":`, error);
            }
        };

        saveValue();
    }, [key, value, isLoading]);

    const updateValue = useCallback((newValue: T | ((prev: T) => T)) => {
        setValue((prev) => {
            if (typeof newValue === 'function') {
                return (newValue as (prev: T) => T)(prev);
            }
            return newValue;
        });
    }, []);

    return [value, updateValue, isLoading];
};

/**
 * Hook for cached API data with automatic expiration
 */
export const useCachedQuery = <T>(
    cacheKey: string,
    fetchFn: () => Promise<T>,
    ttlMs: number,
    options?: {
        enabled?: boolean;
        onSuccess?: (data: T) => void;
        onError?: (error: Error) => void;
    }
) => {
    const [data, setData] = useState<T | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const [isCacheHit, setIsCacheHit] = useState(false);

    const enabled = options?.enabled ?? true;

    const refetch = useCallback(async (skipCache = false) => {
        if (!enabled) return;

        setIsLoading(true);
        setError(null);

        try {
            // Check cache first (unless skipping)
            if (!skipCache) {
                const cached = await getCachedData<T>(cacheKey);
                if (cached !== null) {
                    setData(cached);
                    setIsCacheHit(true);
                    setIsLoading(false);
                    options?.onSuccess?.(cached);
                    return;
                }
            }

            // Fetch fresh data
            setIsCacheHit(false);
            const freshData = await fetchFn();

            // Store in cache
            await setCachedData(cacheKey, freshData, ttlMs);

            setData(freshData);
            options?.onSuccess?.(freshData);
        } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            setError(error);
            options?.onError?.(error);
        } finally {
            setIsLoading(false);
        }
    }, [cacheKey, fetchFn, ttlMs, enabled, options]);

    useEffect(() => {
        refetch();
    }, [cacheKey, enabled]); // eslint-disable-line react-hooks/exhaustive-deps

    return {
        data,
        isLoading,
        error,
        isCacheHit,
        refetch: () => refetch(true), // Force refetch skips cache
    };
};

/**
 * Hook for usage statistics
 */
export const useUsageStats = () => {
    const [stats, setStats] = useState<UsageStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const refresh = useCallback(async () => {
        try {
            const data = await getUsageStats();
            setStats(data);
        } catch (error) {
            console.error('[Storage] Failed to get usage stats:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const handleClearCache = useCallback(async () => {
        await clearCache();
        await refresh();
    }, [refresh]);

    const handleClearExpired = useCallback(async () => {
        await clearExpiredCache();
        await refresh();
    }, [refresh]);

    return {
        stats,
        isLoading,
        refresh,
        clearCache: handleClearCache,
        clearExpiredCache: handleClearExpired,
    };
};

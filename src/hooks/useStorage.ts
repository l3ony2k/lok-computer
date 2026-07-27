/**
 * React hooks for IndexedDB storage
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import {
    initStorage,
    getAppState,
    setAppState,
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
export interface PersistedStateOptions<T> {
    key: string;
    defaultValue: T;
    enabled?: boolean;
    debounceMs?: number;
    normalize?: (stored: unknown, defaultValue: T) => T;
    onChange?: (value: T) => void;
}

export const usePersistedState = <T>({
    key,
    defaultValue,
    enabled = true,
    debounceMs = 0,
    normalize,
    onChange,
}: PersistedStateOptions<T>): [T, (value: T | ((prev: T) => T)) => void, boolean] => {
    const [value, setValue] = useState<T>(defaultValue);
    const [isLoading, setIsLoading] = useState(true);
    const hydratedKey = useRef<string | null>(null);
    const skipNextSave = useRef(false);
    const defaultValueRef = useRef(defaultValue);
    const normalizeRef = useRef(normalize);
    const onChangeRef = useRef(onChange);
    defaultValueRef.current = defaultValue;
    normalizeRef.current = normalize;
    onChangeRef.current = onChange;

    // Load initial value from storage
    useEffect(() => {
        let active = true;
        hydratedKey.current = null;
        setIsLoading(true);

        if (!enabled) {
            skipNextSave.current = true;
            setValue(defaultValueRef.current);
            setIsLoading(false);
            return () => { active = false; };
        }

        const loadValue = async () => {
            try {
                const stored = await getAppState<unknown>(key);
                // Only set value if stored is truthy (not null, undefined, or empty string)
                // This prevents corrupted/empty values from overriding valid defaults
                if (active) {
                    const fallback = defaultValueRef.current;
                    const nextValue = stored !== null && stored !== undefined && stored !== ''
                        ? normalizeRef.current?.(stored, fallback) ?? stored as T
                        : fallback;
                    skipNextSave.current = true;
                    setValue(nextValue);
                }
            } catch (error) {
                console.error(`[Storage] Failed to load persisted state for "${key}":`, error);
            } finally {
                if (active) {
                    hydratedKey.current = key;
                    setIsLoading(false);
                }
            }
        };

        loadValue();

        return () => {
            active = false;
        };
    }, [enabled, key]);

    // Save to storage when value changes (skip initial load)
    useEffect(() => {
        if (!enabled || hydratedKey.current !== key || isLoading) {
            return;
        }

        if (skipNextSave.current) {
            skipNextSave.current = false;
            onChangeRef.current?.(value);
            return;
        }

        onChangeRef.current?.(value);
        const timeout = setTimeout(async () => {
            try {
                await setAppState(key, value);
            } catch (error) {
                console.error(`[Storage] Failed to save persisted state for "${key}":`, error);
            }
        }, debounceMs);

        return () => clearTimeout(timeout);
    }, [enabled, key, value, isLoading, debounceMs]);

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

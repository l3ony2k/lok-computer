/**
 * Persisted view state backed by IndexedDB (see src/lib/storage.ts).
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { getAppState, setAppState } from '@/lib/storage';
import { createDebouncedWrite, type DebouncedWrite } from '@/lib/debouncedWrite';

export interface PersistedStateOptions<T> {
    key: string;
    defaultValue: T;
    enabled?: boolean;
    debounceMs?: number;
    normalize?: (stored: unknown, defaultValue: T) => T;
    onChange?: (value: T) => void;
}

/**
 * State that survives reloads. Owns the initial-load protection (nothing is
 * written back until the stored value has been read), key changes, optional
 * normalization of legacy values, and debounced writes.
 *
 * A pending write is flushed, never dropped, when the window closes or the
 * page unloads (a change made just before closing used to be lost). Effects
 * that run again for a key already loaded neither reload storage over the
 * newer value in memory nor write or report the same value twice.
 *
 * @returns [value, setValue, isLoading]
 */
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
    const handled = useRef<{ key: string | null; value: unknown }>({ key: null, value: undefined });
    const [writer] = useState<DebouncedWrite<T>>(() => createDebouncedWrite<T>((storeKey, storeValue) => setAppState(storeKey, storeValue)));
    defaultValueRef.current = defaultValue;
    normalizeRef.current = normalize;
    onChangeRef.current = onChange;

    // Load initial value from storage
    useEffect(() => {
        // Effects re-running for a key already loaded:
        // the value in memory is at least as new as storage.
        if (enabled && hydratedKey.current === key) return;
        // A write still pending belongs to the previous key.
        writer.flush();
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

        void loadValue();

        return () => {
            active = false;
        };
    }, [enabled, key, writer]);

    // Save to storage when value changes (skip initial load)
    useEffect(() => {
        if (!enabled || hydratedKey.current !== key || isLoading) {
            return;
        }
        if (handled.current.key === key && Object.is(handled.current.value, value)) {
            skipNextSave.current = false;
            return;
        }
        handled.current = { key, value };

        onChangeRef.current?.(value);
        if (skipNextSave.current) {
            skipNextSave.current = false;
            return;
        }
        writer.schedule(key, value, debounceMs);
    }, [enabled, key, value, isLoading, debounceMs, writer]);

    // Hide, unmount, or leaving the page: write what is pending now.
    useEffect(() => {
        const flush = () => writer.flush();
        window.addEventListener('pagehide', flush);
        return () => {
            window.removeEventListener('pagehide', flush);
            flush();
        };
    }, [writer]);

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

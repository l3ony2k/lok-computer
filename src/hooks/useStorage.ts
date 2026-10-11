/**
 * Persisted view state backed by IndexedDB (see src/lib/storage.ts).
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { getAppState, setAppState } from '@/lib/storage';

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

        void loadValue();

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

import { cacheDebugLog } from "@/lib/debug";

/**
 * IndexedDB Storage Layer for lok.computer
 * 
 * Provides persistent storage for:
 * - App state (window sessions, user settings, per-app UI state)
 * - API cache with TTL expiration
 * - Usage statistics (request counts, cache hits)
 */

const DB_NAME = 'lok-computer-db';
const DB_VERSION = 1;

// Store names
const STORES = {
    APP_STATE: 'appState',
    API_CACHE: 'apiCache',
    USAGE_STATS: 'usageStats',
} as const;

// Cache TTL constants (in milliseconds)
export const CACHE_TTL = {
    NEODB_SHELF: 10 * 60 * 1000,    // 10 minutes
    BSKY_PROFILE: 5 * 60 * 1000,    // 5 minutes
    BSKY_POSTS: 5 * 60 * 1000,      // 5 minutes
    FEDI_ACCOUNT: 5 * 60 * 1000,    // 5 minutes
    FEDI_STATUSES: 5 * 60 * 1000,   // 5 minutes
    WEATHER: 10 * 60 * 1000,        // 10 minutes
    ARENA_CHANNEL: 30 * 60 * 1000,  // 30 minutes
    ARENA_BLOCK: 60 * 60 * 1000,    // 1 hour
} as const;

// Types
interface CachedData<T> {
    data: T;
    timestamp: number;
    ttl: number;
}

export interface UsageStats {
    totalRequests: number;
    cacheHits: number;
    cacheMisses: number;
    requestsByApp: Record<string, number>;
    lastUpdated: number;
}

// Database instance (singleton)
let dbInstance: IDBDatabase | null = null;
let dbInitPromise: Promise<IDBDatabase> | null = null;

/**
 * Initialize the IndexedDB database
 */
export const initDB = (): Promise<IDBDatabase> => {
    if (dbInstance) {
        return Promise.resolve(dbInstance);
    }

    if (dbInitPromise) {
        return dbInitPromise;
    }

    dbInitPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            console.error('[Storage] Failed to open IndexedDB:', request.error);
            reject(request.error);
        };

        request.onsuccess = () => {
            dbInstance = request.result;
            console.info('[Storage] IndexedDB initialized successfully');
            resolve(dbInstance);
        };

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            console.info('[Storage] Upgrading IndexedDB schema...');

            // Create app state store
            if (!db.objectStoreNames.contains(STORES.APP_STATE)) {
                db.createObjectStore(STORES.APP_STATE);
                console.info('[Storage] Created appState store');
            }

            // Create API cache store with timestamp index for cleanup
            if (!db.objectStoreNames.contains(STORES.API_CACHE)) {
                const cacheStore = db.createObjectStore(STORES.API_CACHE);
                cacheStore.createIndex('timestamp', 'timestamp', { unique: false });
                console.info('[Storage] Created apiCache store');
            }

            // Create usage stats store
            if (!db.objectStoreNames.contains(STORES.USAGE_STATS)) {
                db.createObjectStore(STORES.USAGE_STATS);
                console.info('[Storage] Created usageStats store');
            }
        };
    });

    return dbInitPromise;
};

/**
 * Get a value from a store
 */
const getFromStore = async <T>(storeName: string, key: string): Promise<T | null> => {
    const db = await initDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.get(key);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result ?? null);
    });
};

/**
 * Set a value in a store
 */
const setInStore = async <T>(storeName: string, key: string, value: T): Promise<void> => {
    const db = await initDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.put(value, key);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
    });
};

/**
 * Delete a value from a store
 */
const deleteFromStore = async (storeName: string, key: string): Promise<void> => {
    const db = await initDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.delete(key);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
    });
};

/**
 * Clear all entries from a store
 */
const clearStore = async (storeName: string): Promise<void> => {
    const db = await initDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.clear();

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
    });
};

// ============================================
// App State Operations
// ============================================

/**
 * Get app state by key
 */
export const getAppState = async <T>(key: string): Promise<T | null> => {
    try {
        return await getFromStore<T>(STORES.APP_STATE, key);
    } catch (error) {
        console.error(`[Storage] Failed to get app state for key "${key}":`, error);
        return null;
    }
};

/**
 * Set app state by key
 */
export const setAppState = async <T>(key: string, value: T): Promise<void> => {
    try {
        await setInStore(STORES.APP_STATE, key, value);
    } catch (error) {
        console.error(`[Storage] Failed to set app state for key "${key}":`, error);
    }
};

/**
 * Delete app state by key
 */
export const deleteAppState = async (key: string): Promise<void> => {
    try {
        await deleteFromStore(STORES.APP_STATE, key);
    } catch (error) {
        console.error(`[Storage] Failed to delete app state for key "${key}":`, error);
    }
};

// ============================================
// API Cache Operations
// ============================================

/**
 * Get cached data if it exists and hasn't expired
 */
export const getCachedData = async <T>(key: string): Promise<T | null> => {
    try {
        const cached = await getFromStore<CachedData<T>>(STORES.API_CACHE, key);

        if (!cached) {
            await incrementCacheMiss();
            return null;
        }

        const now = Date.now();
        const isExpired = now - cached.timestamp > cached.ttl;

        if (isExpired) {
            // Clean up expired entry
            await deleteFromStore(STORES.API_CACHE, key);
            await incrementCacheMiss();
            cacheDebugLog(`[Storage] Cache expired for key "${key}"`);
            return null;
        }

        await incrementCacheHit();
        return cached.data;
    } catch (error) {
        console.error(`[Storage] Failed to get cached data for key "${key}":`, error);
        return null;
    }
};

/**
 * Set cached data with TTL
 */
export const setCachedData = async <T>(key: string, data: T, ttlMs: number): Promise<void> => {
    try {
        const cacheEntry: CachedData<T> = {
            data,
            timestamp: Date.now(),
            ttl: ttlMs,
        };
        await setInStore(STORES.API_CACHE, key, cacheEntry);
        cacheDebugLog(`[Storage] Cached data for key "${key}" (TTL: ${ttlMs / 1000}s)`);
    } catch (error) {
        console.error(`[Storage] Failed to cache data for key "${key}":`, error);
    }
};

/**
 * Clear all cached data
 */
export const clearCache = async (): Promise<void> => {
    try {
        await clearStore(STORES.API_CACHE);
        cacheDebugLog('[Storage] Cache cleared');
    } catch (error) {
        console.error('[Storage] Failed to clear cache:', error);
    }
};

/**
 * Clear expired cache entries
 */
export const clearExpiredCache = async (): Promise<number> => {
    try {
        const db = await initDB();
        const now = Date.now();
        let clearedCount = 0;

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORES.API_CACHE, 'readwrite');
            const store = transaction.objectStore(STORES.API_CACHE);
            const request = store.openCursor();

            request.onerror = () => reject(request.error);
            request.onsuccess = (event) => {
                const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;

                if (cursor) {
                    const value = cursor.value as CachedData<unknown>;
                    const isExpired = now - value.timestamp > value.ttl;

                    if (isExpired) {
                        cursor.delete();
                        clearedCount++;
                    }

                    cursor.continue();
                } else {
                    if (clearedCount > 0) {
                        cacheDebugLog(`[Storage] Cleared ${clearedCount} expired cache entries`);
                    }
                    resolve(clearedCount);
                }
            };
        });
    } catch (error) {
        console.error('[Storage] Failed to clear expired cache:', error);
        return 0;
    }
};

// ============================================
// Usage Stats Operations
// ============================================

const getOrCreateStats = async (): Promise<UsageStats> => {
    const existing = await getFromStore<UsageStats>(STORES.USAGE_STATS, 'stats');

    if (existing) {
        return existing;
    }

    const defaultStats: UsageStats = {
        totalRequests: 0,
        cacheHits: 0,
        cacheMisses: 0,
        requestsByApp: {},
        lastUpdated: Date.now(),
    };

    return defaultStats;
};

/**
 * Increment request count for an app
 */
export const incrementRequestCount = async (appName: string): Promise<void> => {
    try {
        const stats = await getOrCreateStats();
        stats.totalRequests++;
        stats.requestsByApp[appName] = (stats.requestsByApp[appName] || 0) + 1;
        stats.lastUpdated = Date.now();
        await setInStore(STORES.USAGE_STATS, 'stats', stats);
    } catch (error) {
        console.error('[Storage] Failed to increment request count:', error);
    }
};

/**
 * Increment cache hit count
 */
const incrementCacheHit = async (): Promise<void> => {
    try {
        const stats = await getOrCreateStats();
        stats.cacheHits++;
        stats.lastUpdated = Date.now();
        await setInStore(STORES.USAGE_STATS, 'stats', stats);
    } catch (error) {
        console.error('[Storage] Failed to increment cache hit:', error);
    }
};

/**
 * Increment cache miss count
 */
const incrementCacheMiss = async (): Promise<void> => {
    try {
        const stats = await getOrCreateStats();
        stats.cacheMisses++;
        stats.lastUpdated = Date.now();
        await setInStore(STORES.USAGE_STATS, 'stats', stats);
    } catch (error) {
        console.error('[Storage] Failed to increment cache miss:', error);
    }
};

/**
 * Get usage statistics
 */
export const getUsageStats = async (): Promise<UsageStats> => {
    try {
        return await getOrCreateStats();
    } catch (error) {
        console.error('[Storage] Failed to get usage stats:', error);
        return {
            totalRequests: 0,
            cacheHits: 0,
            cacheMisses: 0,
            requestsByApp: {},
            lastUpdated: Date.now(),
        };
    }
};

/**
 * Reset usage statistics
 */
export const resetUsageStats = async (): Promise<void> => {
    try {
        await deleteFromStore(STORES.USAGE_STATS, 'stats');
        console.info('[Storage] Usage stats reset');
    } catch (error) {
        console.error('[Storage] Failed to reset usage stats:', error);
    }
};

// ============================================
// Initialization and Cleanup
// ============================================

/**
 * Initialize storage and perform cleanup
 */
export const initStorage = async (): Promise<void> => {
    await initDB();
    // Clear expired cache entries on startup
    await clearExpiredCache();
};

/**
 * Check if IndexedDB is available
 */
export const isStorageAvailable = (): boolean => {
    try {
        return typeof indexedDB !== 'undefined';
    } catch {
        return false;
    }
};

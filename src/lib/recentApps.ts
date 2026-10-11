/**
 * Recently opened applications and channels, for the system menu's Recent
 * submenu and the keyboard launcher. The launcher is the single launch path,
 * so every open lands here; the list is persisted in IndexedDB.
 */
import { useSyncExternalStore } from 'react';
import { getAppState, setAppState } from '@/lib/storage';

export interface RecentEntry {
  componentType: string;
  title: string;
  iconType?: string;
  /** Only the props that identify what was opened (see RECENT_PROP_KEYS). */
  props?: Record<string, unknown>;
  openedAt: number;
}

export const RECENT_STORAGE_KEY = 'desktop:recent';
export const RECENT_LIMIT = 8;
const SAVE_DEBOUNCE_MS = 300;

/** Launch props that distinguish one window from another of the same app. */
const RECENT_PROP_KEYS = ['channelSlug', 'username', 'blockId', 'initialUrl', 'arena', 'imageUrl'] as const;

/** Keeps the identifying props and drops everything else (callbacks, media queues, link lists). */
export const pickRecentProps = (props?: Record<string, unknown>): Record<string, unknown> | undefined => {
  if (!props) return undefined;
  const picked: Record<string, unknown> = {};
  for (const key of RECENT_PROP_KEYS) {
    const value = props[key];
    if (typeof value === 'string' || typeof value === 'number') picked[key] = value;
  }
  return Object.keys(picked).length ? picked : undefined;
};

export const recentKey = (componentType: string, props?: Record<string, unknown>) => (
  `${componentType}|${JSON.stringify(pickRecentProps(props) ?? {})}`
);

/** Newest first, one entry per identity, at most RECENT_LIMIT. */
export const pushRecent = (list: RecentEntry[], entry: RecentEntry): RecentEntry[] => {
  const key = recentKey(entry.componentType, entry.props);
  const rest = list.filter((candidate) => recentKey(candidate.componentType, candidate.props) !== key);
  return [{ ...entry, props: pickRecentProps(entry.props) }, ...rest].slice(0, RECENT_LIMIT);
};

export const normalizeRecent = (stored: unknown): RecentEntry[] => {
  if (!Array.isArray(stored)) return [];
  const entries: RecentEntry[] = [];
  for (const candidate of stored) {
    if (!candidate || typeof candidate !== 'object') continue;
    const { componentType, title, iconType, props, openedAt } = candidate as Partial<RecentEntry>;
    if (typeof componentType !== 'string' || typeof title !== 'string') continue;
    entries.push({
      componentType,
      title,
      iconType: typeof iconType === 'string' ? iconType : undefined,
      props: pickRecentProps(props && typeof props === 'object' ? props as Record<string, unknown> : undefined),
      openedAt: typeof openedAt === 'number' ? openedAt : 0,
    });
  }
  return entries.slice(0, RECENT_LIMIT);
};

let entries: RecentEntry[] = [];
let hydrated = false;
let hydrating: Promise<void> | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((listener) => listener());

const hydrate = () => {
  if (hydrating) return hydrating;
  hydrating = getAppState<unknown>(RECENT_STORAGE_KEY)
    .then((stored) => {
      // Opens that happened before the read finished stay in front of the stored list.
      const fresh = entries;
      entries = fresh.reduceRight((list, entry) => pushRecent(list, entry), normalizeRecent(stored));
    })
    .catch((error) => console.warn('[Recent] Could not read recent items:', error))
    .finally(() => {
      hydrated = true;
      emit();
    });
  return hydrating;
};

const scheduleSave = () => {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    setAppState(RECENT_STORAGE_KEY, entries).catch((error) => console.warn('[Recent] Could not save recent items:', error));
  }, SAVE_DEBOUNCE_MS);
};

/** Called by the application launcher on every open. */
export const recordRecent = (entry: Omit<RecentEntry, 'openedAt'>) => {
  entries = pushRecent(entries, { ...entry, openedAt: Date.now() });
  emit();
  if (!hydrated) void hydrate();
  scheduleSave();
};

export const clearRecent = () => {
  entries = [];
  emit();
  scheduleSave();
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  if (!hydrated) void hydrate();
  return () => {
    listeners.delete(listener);
  };
};

const getSnapshot = () => entries;
const getServerSnapshot = (): RecentEntry[] => [];

export const useRecentApps = () => useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

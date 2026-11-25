import { afterAll, beforeAll, describe, expect, it, mock } from 'bun:test';
import { Glob } from 'bun';
import { createDebouncedWrite, flushOnPageHide } from '@/lib/debouncedWrite';

/**
 * Every delayed save goes through createDebouncedWrite, which flushes a
 * pending write when the window closes or the page goes away. A save held
 * back by a hand-written timer loses the last change on a quick reload.
 */
describe('delayed saves', () => {
  it('never write storage from a hand-written timer', async () => {
    const offenders: string[] = [];
    const storageWrite = /\b(setAppState|setAppStateOnUnload|setInStore|setCachedData)\s*\(|localStorage\.setItem\s*\(/;
    for await (const file of new Glob('src/**/*.{ts,tsx}').scan({ cwd: process.cwd() })) {
      if (file.endsWith('.test.ts') || file === 'src/lib/debouncedWrite.ts') continue;
      const lines = (await Bun.file(file).text()).split('\n');
      lines.forEach((line, index) => {
        if (!/\bsetTimeout\s*\(/.test(line)) return;
        // The timer's callback: the call itself and the lines that follow it.
        const body = lines.slice(index, index + 8).join('\n');
        if (storageWrite.test(body)) offenders.push(`${file}:${index + 1}: ${line.trim()}`);
      });
    }
    expect(offenders).toEqual([]);
  });
});

type Listener = () => void;

/** A page without a DOM: `pagehide` listeners and a synchronous localStorage. */
const stubPage = () => {
  const listeners = new Set<Listener>();
  const stored = new Map<string, string>();
  const page = {
    addEventListener: (type: string, listener: Listener) => { if (type === 'pagehide') listeners.add(listener); },
    removeEventListener: (type: string, listener: Listener) => { if (type === 'pagehide') listeners.delete(listener); },
  };
  const localStorage = {
    getItem: (key: string) => stored.get(key) ?? null,
    setItem: (key: string, value: string) => { stored.set(key, value); },
    removeItem: (key: string) => { stored.delete(key); },
  };
  return { page, localStorage, stored, listeners, hide: () => [...listeners].forEach((listener) => listener()) };
};

const stub = stubPage();
const globals = globalThis as Record<string, unknown>;
const saved = { window: globals.window, localStorage: globals.localStorage, error: console.error, warn: console.warn };

beforeAll(() => {
  globals.window = stub.page;
  globals.localStorage = stub.localStorage;
  // IndexedDB does not exist here; storage.ts reports the failed writes.
  console.error = () => undefined;
  console.warn = () => undefined;
});

afterAll(() => {
  globals.window = saved.window;
  globals.localStorage = saved.localStorage;
  console.error = saved.error;
  console.warn = saved.warn;
});

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('flushOnPageHide', () => {
  it('flushes with the unload write until it stops listening', () => {
    const unload: string[] = [];
    const writer = createDebouncedWrite<string>(async () => undefined, (key, value) => { unload.push(`${key}=${value}`); });
    const stop = flushOnPageHide(writer);

    writer.schedule('note', 'a', 1000);
    stub.hide();
    expect(unload).toEqual(['note=a']);

    stop();
    writer.schedule('note', 'b', 1000);
    stub.hide();
    expect(unload).toEqual(['note=a']);
    writer.flush();
  });

  it('a page-long writer listens from its first schedule', () => {
    const unload = mock((_key: string, _value: string) => undefined);
    const writer = createDebouncedWrite<string>(async () => undefined, unload, { flushOnPageHide: true });
    stub.hide();
    expect(unload).not.toHaveBeenCalled();

    writer.schedule('note', 'kept', 1000);
    stub.hide();
    expect(unload).toHaveBeenCalledWith('note', 'kept');
    expect(writer.hasPending()).toBeFalse();
  });
});

describe('a reload inside the debounce keeps', () => {
  it('the last settings change', async () => {
    const { scheduleUserSettingsSave } = await import('@/hooks/useUserSettings');
    scheduleUserSettingsSave({ wallpaper: 'tiles', desktop: { iconSize: 'l', showIcons: true, snapToGrid: true } });
    expect(stub.stored.has('lok.unsaved:userSettings')).toBeFalse();

    stub.hide();
    expect(JSON.parse(stub.stored.get('lok.unsaved:userSettings') ?? 'null')).toEqual({
      wallpaper: 'tiles',
      desktop: { iconSize: 'l', showIcons: true, snapToGrid: true },
    });
  });

  it('the last recent app', async () => {
    const { recordRecent, RECENT_STORAGE_KEY } = await import('@/lib/recentApps');
    recordRecent({ componentType: 'About', title: 'About', iconType: 'about' });
    // The stored list is read (and merged) before the save is scheduled.
    await settle();
    expect(stub.stored.has(`lok.unsaved:${RECENT_STORAGE_KEY}`)).toBeFalse();

    stub.hide();
    const kept = JSON.parse(stub.stored.get(`lok.unsaved:${RECENT_STORAGE_KEY}`) ?? '[]') as { componentType: string }[];
    expect(kept.map((entry) => entry.componentType)).toEqual(['About']);
  });
});

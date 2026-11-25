/**
 * One pending write at a time, held back by a debounce. A newer value for the
 * same key replaces the pending one; `flush` sends it now instead of dropping
 * it, so a window that closes, hides, or unloads mid-debounce keeps its edit.
 *
 * Every delayed save goes through here (`src/lib/delayedSaves.test.ts` checks),
 * so each one survives a reload made inside its debounce.
 */
export interface DebouncedWrite<T> {
  schedule: (key: string, value: T, delayMs: number) => void;
  /** Sends the pending write now; `onUnload` uses the write that survives the page going away. */
  flush: (onUnload?: boolean) => void;
  hasPending: () => boolean;
}

export interface DebouncedWriteOptions {
  /**
   * For a writer that lives as long as the page (a module, an app-wide
   * provider): flush with the unload write on `pagehide`. The listener is
   * added on the first `schedule` and never removed. A writer owned by a
   * component calls `flushOnPageHide` in an effect instead.
   */
  flushOnPageHide?: boolean;
}

const pageHideTarget = (): Pick<Window, 'addEventListener' | 'removeEventListener'> | null => (
  typeof window === 'undefined' ? null : window
);

/**
 * Flushes `writer` with its unload write when the page goes away and returns
 * the function that stops listening. Leaving the page inside a debounce (a
 * quick reload) would otherwise lose the pending value.
 */
export const flushOnPageHide = <T>(writer: DebouncedWrite<T>): (() => void) => {
  const target = pageHideTarget();
  if (!target) return () => undefined;
  const onPageHide = () => writer.flush(true);
  target.addEventListener('pagehide', onPageHide);
  return () => target.removeEventListener('pagehide', onPageHide);
};

export const createDebouncedWrite = <T>(
  write: (key: string, value: T) => Promise<void>,
  writeOnUnload: (key: string, value: T) => void = (key, value) => { void write(key, value); },
  { flushOnPageHide: listenForPageHide = false }: DebouncedWriteOptions = {},
): DebouncedWrite<T> => {
  let pending: { key: string; value: T; timer: ReturnType<typeof setTimeout> } | null = null;
  let listening = false;

  const send = (key: string, value: T) => {
    write(key, value).catch((error: unknown) => {
      console.error(`[Storage] Failed to save persisted state for "${key}":`, error);
    });
  };

  const flush = (onUnload = false) => {
    if (!pending) return;
    const { key, value, timer } = pending;
    pending = null;
    clearTimeout(timer);
    if (onUnload) writeOnUnload(key, value);
    else send(key, value);
  };

  const schedule = (key: string, value: T, delayMs: number) => {
    if (listenForPageHide && !listening && pageHideTarget()) {
      listening = true;
      flushOnPageHide(writer);
    }
    // A pending write for another key (the hook's key changed) still goes out.
    if (pending && pending.key !== key) flush();
    if (pending) clearTimeout(pending.timer);
    const timer = setTimeout(() => {
      pending = null;
      send(key, value);
    }, delayMs);
    pending = { key, value, timer };
  };

  const writer: DebouncedWrite<T> = { schedule, flush, hasPending: () => pending !== null };
  return writer;
};

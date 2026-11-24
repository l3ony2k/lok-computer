/**
 * One pending write at a time, held back by a debounce. A newer value for the
 * same key replaces the pending one; `flush` sends it now instead of dropping
 * it, so a window that closes, hides, or unloads mid-debounce keeps its edit.
 */
export interface DebouncedWrite<T> {
  schedule: (key: string, value: T, delayMs: number) => void;
  flush: () => void;
  hasPending: () => boolean;
}

export const createDebouncedWrite = <T>(
  write: (key: string, value: T) => Promise<void>,
): DebouncedWrite<T> => {
  let pending: { key: string; value: T; timer: ReturnType<typeof setTimeout> } | null = null;

  const send = (key: string, value: T) => {
    write(key, value).catch((error: unknown) => {
      console.error(`[Storage] Failed to save persisted state for "${key}":`, error);
    });
  };

  const flush = () => {
    if (!pending) return;
    const { key, value, timer } = pending;
    pending = null;
    clearTimeout(timer);
    send(key, value);
  };

  const schedule = (key: string, value: T, delayMs: number) => {
    // A pending write for another key (the hook's key changed) still goes out.
    if (pending && pending.key !== key) flush();
    if (pending) clearTimeout(pending.timer);
    const timer = setTimeout(() => {
      pending = null;
      send(key, value);
    }, delayMs);
    pending = { key, value, timer };
  };

  return { schedule, flush, hasPending: () => pending !== null };
};

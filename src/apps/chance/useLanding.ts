import { useCallback, useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from '@/lib/motion';

/**
 * "Animate, then land", shared by the Chance tables: while a roll, flip,
 * shake or spin plays, the table is busy (its button disabled), and `land`
 * runs when it ends. Under reduced motion it lands at once. Every timer is
 * cleared if the window closes first.
 */
export const useLanding = () => {
  const [busy, setBusy] = useState(false);
  const timers = useRef(new Set<number>());

  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach((timer) => window.clearTimeout(timer));
      pending.clear();
    };
  }, []);

  /** Runs `run` after `ms` unless the window closes first; returns a cancel. */
  const later = useCallback((ms: number, run: () => void) => {
    const timer = window.setTimeout(() => {
      timers.current.delete(timer);
      run();
    }, ms);
    timers.current.add(timer);
    return () => {
      window.clearTimeout(timer);
      timers.current.delete(timer);
    };
  }, []);

  /**
   * Lands now under reduced motion. Otherwise calls `start` (set the
   * animation going), goes busy, and lands after `ms`.
   */
  const run = useCallback((ms: number, land: () => void, start?: () => void) => {
    if (prefersReducedMotion()) {
      land();
      return;
    }
    start?.();
    setBusy(true);
    later(ms, () => {
      setBusy(false);
      land();
    });
  }, [later]);

  return { busy, setBusy, later, run };
};

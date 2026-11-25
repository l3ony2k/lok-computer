import { useEffect, useLayoutEffect, useRef, type DependencyList, type RefObject } from 'react';

type Observed = Element | null | undefined;

interface ResizeObserverOptions {
  /** More elements whose size should also trigger `onResize` (the tabs of a tab strip). */
  also?: () => readonly Observed[];
  /** Measure in a layout effect, before the browser paints. Keep it the same for the component's life. */
  layout?: boolean;
}

/**
 * Calls `onResize` with the element once it is there, then whenever it (or an element
 * from `also`) changes size, and again whenever `deps` change. Where the
 * browser has no ResizeObserver it still measures once. `onResize` is always
 * the latest one, so it may read current props and state. Use this instead of
 * a hand-written observer effect (sharedHelpers.test.ts checks).
 */
export const useResizeObserver = <T extends Element>(
  ref: RefObject<T | null>,
  onResize: (element: T) => void,
  deps: DependencyList = [],
  { also, layout = false }: ResizeObserverOptions = {},
) => {
  const onResizeRef = useRef(onResize);
  onResizeRef.current = onResize;
  const alsoRef = useRef(also);
  alsoRef.current = also;
  const useMeasureEffect = layout ? useLayoutEffect : useEffect;

  useMeasureEffect(() => {
    const element = ref.current;
    if (!element) return;
    const measure = () => onResizeRef.current(element);
    measure();
    if (typeof ResizeObserver !== 'function') return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    alsoRef.current?.().forEach((other) => other && observer.observe(other));
    return () => observer.disconnect();
    // `deps` are the caller's: when they change, measure again.
  }, [ref, ...deps]);
};

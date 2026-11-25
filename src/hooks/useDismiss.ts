import { type RefObject, useEffect, useLayoutEffect, useRef } from 'react';

export type DismissReason = 'outside' | 'escape';

export interface DismissOptions {
  /**
   * Elements a press inside keeps the popup open (the popup and the control
   * that opened it). Leave it out when a scrim already catches outside presses.
   */
  inside?: ReadonlyArray<RefObject<Element | null>>;
  /** The press that closes: `pointerdown` (default) or `mousedown`. */
  pressEvent?: 'pointerdown' | 'mousedown';
  /** Hear the press in the capture phase, before the target's own handlers. */
  capture?: boolean;
  /** Close on Escape (default true). */
  escape?: boolean;
}

/**
 * The one way popups close: a press outside them and Escape, while `open`.
 * Menus, the calendar flyout, the Select listbox and small pickers use it.
 */
export const useDismiss = (
  open: boolean,
  onDismiss: (reason: DismissReason) => void,
  { inside, pressEvent = 'pointerdown', capture = false, escape = true }: DismissOptions = {},
) => {
  // The refs are stable objects; a fresh array each render must not resubscribe.
  const insideRef = useRef(inside);
  useLayoutEffect(() => {
    insideRef.current = inside;
  });
  const watchPresses = Boolean(inside);

  useEffect(() => {
    if (!open) return;
    const onPress = (event: Event) => {
      const target = event.target as Node;
      if (insideRef.current?.some((ref) => ref.current?.contains(target))) return;
      onDismiss('outside');
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onDismiss('escape');
    };
    if (watchPresses) document.addEventListener(pressEvent, onPress, capture);
    if (escape) document.addEventListener('keydown', onKeyDown);
    return () => {
      if (watchPresses) document.removeEventListener(pressEvent, onPress, capture);
      if (escape) document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onDismiss, watchPresses, pressEvent, capture, escape]);
};

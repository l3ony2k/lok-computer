import { useLayoutEffect, type RefObject } from 'react';

/**
 * Dealing a card: it leaves the deck face down and travels to its place on
 * the table, scaled from the deck's size to its own. Shared by the playing
 * cards and the tarot.
 */

/** Where the deck lay when the cards were drawn, in viewport pixels. */
export interface DealOrigin {
  left: number;
  top: number;
  width: number;
}

export const DEAL_TRAVEL_MS = 620;

/** The deck's place, read just before the draw re-renders the table. */
export const dealOriginOf = (element: Element | null | undefined): DealOrigin | null => {
  const rect = element?.getBoundingClientRect();
  return rect && rect.width ? { left: rect.left, top: rect.top, width: rect.width } : null;
};

/**
 * Plays the travel on `ref` (from `origin` to where layout put it) before the
 * first paint, after `delay` ms, holding the card on the deck until it leaves.
 * The element's transform-origin must be its top-left corner.
 */
export const useDealTravel = (ref: RefObject<HTMLElement>, origin: DealOrigin | null | undefined, delay: number, enabled: boolean) => {
  useLayoutEffect(() => {
    const node = ref.current;
    if (!enabled || !origin || !node || typeof node.animate !== 'function') return;
    const target = node.getBoundingClientRect();
    if (!target.width) return;
    const travel = node.animate(
      [
        { transform: `translate(${origin.left - target.left}px, ${origin.top - target.top}px) scale(${origin.width / target.width})` },
        { transform: 'none' },
      ],
      { duration: DEAL_TRAVEL_MS, delay, easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)', fill: 'backwards' },
    );
    return () => travel.cancel();
  }, [ref, origin, delay, enabled]);
};

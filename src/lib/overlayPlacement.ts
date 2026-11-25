/**
 * Keeping popups on screen. Pure arithmetic in overlay coordinates (origin at
 * the top-left of `getOverlayBounds()`), so it is tested without a DOM.
 */

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

/**
 * Where a span of `size` starting at `start` must start to stay inside
 * `[margin, length - margin]`. When it cannot fit, its start edge wins.
 */
export const clampSpan = (start: number, size: number, length: number, margin = 0): number => (
  Math.max(margin, Math.min(start, length - margin - size))
);

/** The top-left corner that keeps a box of `size` at `point` inside `area`. */
export const clampToOverlay = (point: Point, size: Size, area: Size, margin = 0): Point => ({
  x: clampSpan(point.x, size.width, area.width, margin),
  y: clampSpan(point.y, size.height, area.height, margin),
});

export interface VerticalPlacement {
  side: 'above' | 'below';
  /** Room on the chosen side, after the gap. */
  space: number;
}

/**
 * A list that hangs off an anchor (a field, a button) opens below it, or above
 * it when the content does not fit below and there is more room above.
 * `anchor` is in overlay coordinates.
 */
export const chooseVerticalSide = (
  anchor: { top: number; bottom: number },
  contentHeight: number,
  areaHeight: number,
  gap = 0,
): VerticalPlacement => {
  const below = areaHeight - anchor.bottom - gap;
  const above = anchor.top - gap;
  return contentHeight > below && above > below
    ? { side: 'above', space: above }
    : { side: 'below', space: below };
};

/** The top of a box of `height` placed on `side` of the anchor. */
export const verticalOffset = (
  anchor: { top: number; bottom: number },
  height: number,
  side: VerticalPlacement['side'],
  gap = 0,
): number => (side === 'above' ? anchor.top - gap - height : anchor.bottom + gap);

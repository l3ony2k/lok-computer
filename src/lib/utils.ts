import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export interface WindowDimensions {
  x: number;
  y: number;
  width: number;
  height: number;
  minWidth: number;
  minHeight: number;
}

export interface ViewportDimensions {
  width: number;
  height: number;
}

export interface AdjustedWindow {
  x: number;
  y: number;
  width: number;
  height: number;
  changed: boolean;
}

export function adjustWindowToViewport(
  currentWindow: WindowDimensions,
  viewport: ViewportDimensions
): AdjustedWindow {
  let adjX = currentWindow.x;
  let adjY = currentWindow.y;
  let adjWidth = currentWindow.width;
  let adjHeight = currentWindow.height;
  const { minWidth, minHeight } = currentWindow;

  // Pass 1: Apply Minimum Dimensions
  if (adjWidth < minWidth) {
    adjWidth = minWidth;
  }
  if (adjHeight < minHeight) {
    adjHeight = minHeight;
  }

  // Pass 2: Horizontal Adjustments
  // Ensure adjX is not negative first
  if (adjX < 0) {
    adjX = 0;
  }

  // Handle Right Overflow (Try Move, then Shrink)
  if (adjX + adjWidth > viewport.width) {
    const overflowAmount = (adjX + adjWidth) - viewport.width;
    if (adjX - overflowAmount >= 0) { // Can we move left fully without crossing x=0?
      adjX -= overflowAmount;
    } else { // Cannot move left fully. Window is "pinned" or "squeezed" from the right.
      if (adjX > 0) { // Move adjX to 0 if it's not already there.
        adjX = 0;
      }
      // Now, adjX is 0. Shrink adjWidth to fit.
      const newProposedWidth = viewport.width; // Since adjX is 0
      if (newProposedWidth < adjWidth) { // Only shrink if it needs to
        adjWidth = Math.max(minWidth, newProposedWidth);
      }
    }
  }
  // After potential move/shrink, ensure width is not less than minWidth if viewport is too small
  if (adjWidth < minWidth) adjWidth = minWidth;
  // And ensure x is not negative (e.g. if viewport.width < minWidth, x could be forced negative by previous logic incorrectly)
  if (viewport.width - adjWidth < 0 && adjX + adjWidth > viewport.width) { // If window is wider than viewport and at x=0
      adjX = 0;
      adjWidth = Math.max(minWidth, viewport.width);
  } else if (adjX + adjWidth > viewport.width) { // Final check for right boundary if width was adjusted
      adjX = viewport.width - adjWidth;
  }
  if (adjX < 0) adjX = 0; // Final safety for x
  

  // Pass 3: Vertical Adjustments (Symmetrical to Pass 2)
  // Ensure adjY is not negative first
  if (adjY < 0) {
    adjY = 0;
  }

  // Handle Bottom Overflow (Try Move, then Shrink)
  if (adjY + adjHeight > viewport.height) {
    const overflowAmount = (adjY + adjHeight) - viewport.height;
    if (adjY - overflowAmount >= 0) { // Can we move up fully without crossing y=0?
      adjY -= overflowAmount;
    } else { // Cannot move up fully.
      if (adjY > 0) { // Move adjY to 0 if it's not already there.
        adjY = 0;
      }
      // Now, adjY is 0. Shrink adjHeight to fit.
      const newProposedHeight = viewport.height; // Since adjY is 0
      if (newProposedHeight < adjHeight) { // Only shrink if it needs to
        adjHeight = Math.max(minHeight, newProposedHeight);
      }
    }
  }
  // After potential move/shrink, ensure height is not less than minHeight if viewport is too small
  if (adjHeight < minHeight) adjHeight = minHeight;
  // And ensure y is not negative
  if (viewport.height - adjHeight < 0 && adjY + adjHeight > viewport.height) {
      adjY = 0;
      adjHeight = Math.max(minHeight, viewport.height);
  } else if (adjY + adjHeight > viewport.height) {
      adjY = viewport.height - adjHeight;
  }
  if (adjY < 0) adjY = 0; // Final safety for y

  const changed = 
    adjX !== currentWindow.x ||
    adjY !== currentWindow.y ||
    adjWidth !== currentWindow.width ||
    adjHeight !== currentWindow.height;

  return { x: adjX, y: adjY, width: adjWidth, height: adjHeight, changed };
}

type ScrollAlignment = 'start' | 'end' | 'nearest';

/** Nearest ancestor that actually scrolls on the given axis. */
const findScrollParent = (node: HTMLElement, axis: 'x' | 'y'): HTMLElement | null => {
  let parent = node.parentElement;
  while (parent) {
    const style = getComputedStyle(parent);
    const overflow = axis === 'y' ? style.overflowY : style.overflowX;
    const overflows = axis === 'y'
      ? parent.scrollHeight > parent.clientHeight
      : parent.scrollWidth > parent.clientWidth;
    if ((overflow === 'auto' || overflow === 'scroll') && overflows) return parent;
    parent = parent.parentElement;
  }
  return null;
};

const alignedOffset = (align: ScrollAlignment, start: number, end: number, current: number, size: number) => {
  if (align === 'start') return start;
  if (align === 'end') return end - size;
  if (start < current) return start;
  if (end > current + size) return end - size;
  return current;
};

/**
 * Scrolls only the nearest scroll container on each requested axis to bring
 * `node` into view. `element.scrollIntoView` walks every ancestor, hidden ones
 * included, so a window near the desktop's edge (or a viewport taller than the
 * visible area) makes it scroll the desktop itself and shift every window.
 * The desktop and body are `overflow: clip` as a backstop; app code should
 * still use this instead of `scrollIntoView` for anything inside a window.
 */
export const scrollIntoViewWithin = (
  node: HTMLElement | null | undefined,
  options: { block?: ScrollAlignment; inline?: ScrollAlignment } = { block: 'nearest' },
) => {
  if (!node) return;
  const nodeRect = node.getBoundingClientRect();
  if (options.block) {
    const scroller = findScrollParent(node, 'y');
    if (scroller) {
      const top = nodeRect.top - scroller.getBoundingClientRect().top + scroller.scrollTop;
      scroller.scrollTop = alignedOffset(options.block, top, top + nodeRect.height, scroller.scrollTop, scroller.clientHeight);
    }
  }
  if (options.inline) {
    const scroller = findScrollParent(node, 'x');
    if (scroller) {
      const left = nodeRect.left - scroller.getBoundingClientRect().left + scroller.scrollLeft;
      scroller.scrollLeft = alignedOffset(options.inline, left, left + nodeRect.width, scroller.scrollLeft, scroller.clientWidth);
    }
  }
};

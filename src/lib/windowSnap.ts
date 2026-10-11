/**
 * Window snapping. A drag with Alt (Option) held previews a half or quarter of
 * the desktop by where the pointer is; without the modifier, dragging the
 * pointer to the desktop's left or right edge does the same, because some
 * Linux window managers grab Alt+drag before the browser sees it. Pure
 * geometry lives here so it can be tested; DraggableWindow draws the preview
 * and applies the rectangle on drop.
 */

export type SnapZone = 'left' | 'right' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export interface SnapArea {
  width: number;
  height: number;
}

export interface SnapRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** A pointer this close to the desktop's edge (px) counts as touching it. */
export const SNAP_EDGE_PX = 12;

/** With the modifier held, the top and bottom thirds of a side choose a quarter. */
const QUARTER_BAND = 1 / 3;

/**
 * The zone a drag is pointing at, or null for an ordinary move. `pointer` is
 * relative to the desktop's top-left corner.
 */
export const resolveSnapZone = (
  pointer: { x: number; y: number },
  area: SnapArea,
  modifier: boolean,
): SnapZone | null => {
  const { width, height } = area;
  if (width <= 0 || height <= 0) return null;
  const { x, y } = pointer;

  if (modifier) {
    const side: 'left' | 'right' = x < width / 2 ? 'left' : 'right';
    if (y < height * QUARTER_BAND) return `top-${side}`;
    if (y > height * (1 - QUARTER_BAND)) return `bottom-${side}`;
    return side;
  }

  const atLeft = x <= SNAP_EDGE_PX;
  const atRight = x >= width - SNAP_EDGE_PX;
  if (!atLeft && !atRight) return null;
  const side: 'left' | 'right' = atLeft ? 'left' : 'right';
  if (y <= SNAP_EDGE_PX) return `top-${side}`;
  if (y >= height - SNAP_EDGE_PX) return `bottom-${side}`;
  return side;
};

/** The rectangle a zone occupies; the two halves of an odd size overlap by a pixel rather than leave a gap. */
export const snapZoneRect = (zone: SnapZone, area: SnapArea): SnapRect => {
  const halfWidth = Math.round(area.width / 2);
  const halfHeight = Math.round(area.height / 2);
  const x = zone.endsWith('right') ? area.width - halfWidth : 0;
  if (zone === 'left' || zone === 'right') {
    return { x, y: 0, width: halfWidth, height: area.height };
  }
  const y = zone.startsWith('top') ? 0 : area.height - halfHeight;
  return { x, y, width: halfWidth, height: halfHeight };
};

/** Reads the pointer out of the mouse or touch event react-draggable hands over. */
export const pointerFromDragEvent = (event: Event): { clientX: number; clientY: number } | null => {
  if ('clientX' in event && typeof (event as MouseEvent).clientX === 'number') {
    const mouse = event as MouseEvent;
    return { clientX: mouse.clientX, clientY: mouse.clientY };
  }
  const touch = (event as TouchEvent).touches?.[0] ?? (event as TouchEvent).changedTouches?.[0];
  return touch ? { clientX: touch.clientX, clientY: touch.clientY } : null;
};

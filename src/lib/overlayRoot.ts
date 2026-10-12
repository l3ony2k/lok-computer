/**
 * Where portaled overlays (menus, the calendar flyout, the launcher) go.
 *
 * Normally that is the body, and they position against the viewport. The
 * Palm theme on a large screen draws the desktop in a phone-sized frame and
 * marks `.desktop-root` as a contained overlay root (`contain: layout paint`
 * in its stylesheet makes it the containing block for fixed descendants), so
 * overlays portal into the frame and position against its box instead.
 */

export const OVERLAY_ROOT_ATTR = 'data-overlay-root';

export interface OverlayBounds {
  /** Viewport offset of the overlay coordinate space. */
  left: number;
  top: number;
  width: number;
  height: number;
}

export const getOverlayRoot = (): HTMLElement => (
  document.querySelector<HTMLElement>(`[${OVERLAY_ROOT_ATTR}="contained"]`) ?? document.body
);

/** The box fixed overlays position against: the viewport, or the frame's padding box. */
export const getOverlayBounds = (): OverlayBounds => {
  const root = getOverlayRoot();
  if (root === document.body) {
    return { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
  }
  const rect = root.getBoundingClientRect();
  return {
    left: rect.left + root.clientLeft,
    top: rect.top + root.clientTop,
    width: root.clientWidth,
    height: root.clientHeight,
  };
};

/** Converts a viewport point (a pointer event) into overlay coordinates. */
export const toOverlayPoint = (point: { x: number; y: number }, bounds: OverlayBounds = getOverlayBounds()) => ({
  x: point.x - bounds.left,
  y: point.y - bounds.top,
});

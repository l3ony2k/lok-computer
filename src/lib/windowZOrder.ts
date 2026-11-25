/**
 * Window stacking numbers. Windows live in their own band inside the desktop's
 * stacking context (`.desktop-container` isolates it): above the icons layer
 * (--z-desktop-icons), below the dragged icon and the snap preview
 * (--z-icon-ghost, --z-snap-preview). The rest of the page's scale is the
 * `--z-*` block at the top of src/index.css.
 */
export const FIRST_Z_INDEX = 1000;

/**
 * Renumbers windows from FIRST_Z_INDEX in their current back-to-front order,
 * so the numbers a session saves do not keep climbing from one visit to the
 * next. Ties keep their array order. The backmost window gets
 * FIRST_Z_INDEX + 1, as the first window opened in a fresh session would.
 * Returns the windows (in their original array order) and the highest number
 * handed out.
 */
export const renumberZIndexes = <T extends { zIndex: number }>(windows: readonly T[]): { windows: T[]; lastZIndex: number } => {
  const order = windows
    .map((window, index) => ({ window, index }))
    .sort((a, b) => a.window.zIndex - b.window.zIndex || a.index - b.index);
  const zIndexes = new Map<number, number>();
  order.forEach(({ index }, rank) => zIndexes.set(index, FIRST_Z_INDEX + 1 + rank));
  return {
    windows: windows.map((window, index) => ({ ...window, zIndex: zIndexes.get(index) ?? FIRST_Z_INDEX })),
    lastZIndex: FIRST_Z_INDEX + windows.length,
  };
};

/**
 * Sizing things on a table to the room they have, in both directions: for
 * `count` equal round or square items, try every number of rows and keep the
 * one that gives the largest item that fits both the width and the height.
 * Rows are then balanced (ten coins in two rows make two rows of five).
 */

export interface FitInput {
  count: number;
  /** Room for the items, in px. */
  width: number;
  height: number;
  /** Gap between items, as a share of the item size (both directions). */
  gapRatio: number;
  /** Fixed height every row adds below its items (a caption), in px. */
  extraPerRow: number;
  min: number;
  max: number;
}

export interface Fit {
  size: number;
  columns: number;
  rows: number;
}

export const fitGrid = ({ count, width, height, gapRatio, extraPerRow, min, max }: FitInput): Fit => {
  const n = Math.max(1, count);
  let best: Fit = { size: -Infinity, columns: n, rows: 1 };
  for (let columns = n; columns >= 1; columns -= 1) {
    const rows = Math.ceil(n / columns);
    const byWidth = width / (columns + gapRatio * (columns - 1));
    const byHeight = (height - extraPerRow * rows) / (rows + gapRatio * (rows - 1));
    const size = Math.min(byWidth, byHeight, max);
    // Strictly larger wins, so among equal sizes the fewest rows stays.
    if (size > best.size + 0.5) best = { size, columns, rows };
  }
  // Balance: the fewest columns that still need no more rows.
  const columns = Math.ceil(n / best.rows);
  return { size: Math.floor(Math.max(min, Math.min(max, best.size))), columns, rows: best.rows };
};

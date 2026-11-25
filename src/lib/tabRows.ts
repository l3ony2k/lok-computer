/**
 * Rows for a tab strip that has to wrap, laid out the way classic Windows
 * property sheets do: tabs fill rows left to right, then the rows rotate so
 * the one holding the selected tab sits at the bottom, against the page it
 * opens (the rows that came after it move to the top).
 */
export const tabRows = (widths: readonly number[], available: number, gap: number, selected: number): number[][] => {
  const rows: number[][] = [];
  let row: number[] = [];
  let used = 0;
  widths.forEach((width, index) => {
    const needed = row.length ? used + gap + width : width;
    if (row.length && needed > available) {
      rows.push(row);
      row = [index];
      used = width;
    } else {
      row.push(index);
      used = needed;
    }
  });
  if (row.length) rows.push(row);
  const at = rows.findIndex((indices) => indices.includes(selected));
  if (at < 0 || at === rows.length - 1) return rows;
  return [...rows.slice(at + 1), ...rows.slice(0, at + 1)];
};

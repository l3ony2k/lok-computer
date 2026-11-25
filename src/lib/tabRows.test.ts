import { describe, expect, test } from 'bun:test';
import { tabRows } from './tabRows';

describe('tabRows', () => {
  const widths = [60, 60, 60, 60, 60, 60, 60, 60];

  test('one row when everything fits', () => {
    expect(tabRows(widths, 1000, 3, 5)).toEqual([[0, 1, 2, 3, 4, 5, 6, 7]]);
  });

  test('wraps like flex-wrap, gaps included', () => {
    // 4 tabs need 4×60 + 3×3 = 249.
    expect(tabRows(widths, 249, 3, 7)).toEqual([[0, 1, 2, 3], [4, 5, 6, 7]]);
    expect(tabRows(widths, 248, 3, 6)).toEqual([[0, 1, 2], [3, 4, 5], [6, 7]]);
  });

  test("the selected tab's row goes to the bottom; the rows after it rotate to the top", () => {
    expect(tabRows(widths, 249, 3, 0)).toEqual([[4, 5, 6, 7], [0, 1, 2, 3]]);
    expect(tabRows(widths, 248, 3, 1)).toEqual([[3, 4, 5], [6, 7], [0, 1, 2]]);
    expect(tabRows(widths, 248, 3, 4)).toEqual([[6, 7], [0, 1, 2], [3, 4, 5]]);
  });
});

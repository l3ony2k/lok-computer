import { describe, expect, test } from 'bun:test';
import { FIRST_Z_INDEX, renumberZIndexes } from './windowZOrder';

describe('window z-order renumbering', () => {
  test('keeps the stacking order and restarts the numbers from the first z-index', () => {
    const { windows, lastZIndex } = renumberZIndexes([
      { id: 'a', zIndex: 48213 },
      { id: 'b', zIndex: 1003 },
      { id: 'c', zIndex: 90001 },
    ]);
    expect(windows.map((w) => [w.id, w.zIndex])).toEqual([
      ['a', FIRST_Z_INDEX + 2],
      ['b', FIRST_Z_INDEX + 1],
      ['c', FIRST_Z_INDEX + 3],
    ]);
    expect(lastZIndex).toBe(FIRST_Z_INDEX + 3);
  });

  test('the frontmost window stays frontmost', () => {
    const { windows } = renumberZIndexes([
      { id: 'front', zIndex: 5000 },
      { id: 'back', zIndex: 4000 },
    ]);
    const front = windows.reduce((top, w) => (w.zIndex > top.zIndex ? w : top));
    expect(front.id).toBe('front');
  });

  test('ties keep their array order and every number is distinct', () => {
    const { windows } = renumberZIndexes([
      { id: 'a', zIndex: 1200 },
      { id: 'b', zIndex: 1200 },
      { id: 'c', zIndex: 1100 },
    ]);
    expect(windows.map((w) => w.zIndex)).toEqual([FIRST_Z_INDEX + 2, FIRST_Z_INDEX + 3, FIRST_Z_INDEX + 1]);
  });

  test('keeps the other fields and handles an empty session', () => {
    expect(renumberZIndexes([{ id: 'a', zIndex: 7, minimized: true }]).windows)
      .toEqual([{ id: 'a', zIndex: FIRST_Z_INDEX + 1, minimized: true }]);
    expect(renumberZIndexes([])).toEqual({ windows: [], lastZIndex: FIRST_Z_INDEX });
  });
});

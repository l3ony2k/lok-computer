import { describe, expect, test } from 'bun:test';
import { ICON_CELLS, ICON_GAP, clampIconPosition, layoutIconSlots, normalizeIconPositions } from './desktopIconLayout';

const AREA = { width: 1000, height: 400 };
const CELL = ICON_CELLS.m;

describe('layoutIconSlots', () => {
  test('fills a column from the top-right corner, then starts the next column to the left', () => {
    const slots = layoutIconSlots(6, AREA, CELL);
    // (400 + 12) / (76 + 12) = 4.68 → four rows per column.
    expect(slots[0]).toEqual({ x: AREA.width - CELL.width, y: 0 });
    expect(slots[1].y).toBe(CELL.height + ICON_GAP);
    expect(slots[3].x).toBe(slots[0].x);
    expect(slots[4]).toEqual({ x: slots[0].x - CELL.width - ICON_GAP, y: 0 });
    expect(slots[5].y).toBe(slots[1].y);
  });

  test('matches the CSS flow for the 1280×800 desktop: eight rows, not seven', () => {
    // Desktop 730px tall minus the 12px inset on both sides.
    const slots = layoutIconSlots(14, { width: 1256, height: 706 }, CELL);
    expect(slots[7].x).toBe(slots[0].x);
    expect(slots[8].x).toBeLessThan(slots[0].x);
  });

  test('a tiny area still yields one row per column', () => {
    const slots = layoutIconSlots(2, { width: 300, height: 10 }, CELL);
    expect(slots[0].y).toBe(0);
    expect(slots[1].x).toBeLessThan(slots[0].x);
  });
});

describe('clampIconPosition', () => {
  test('keeps the cell inside the area and rounds to whole pixels', () => {
    expect(clampIconPosition({ x: -5, y: 390.6 }, AREA, CELL)).toEqual({ x: 0, y: AREA.height - CELL.height });
    expect(clampIconPosition({ x: 10.4, y: 20.5 }, AREA, CELL)).toEqual({ x: 10, y: 21 });
  });

  test('leaves the point alone before the area is measured', () => {
    expect(clampIconPosition({ x: 500, y: 500 }, { width: 0, height: 0 }, CELL)).toEqual({ x: 500, y: 500 });
  });
});

describe('normalizeIconPositions', () => {
  test('keeps finite coordinates for known apps only', () => {
    const stored = { About: { x: 1, y: 2 }, Gone: { x: 3, y: 4 }, Weather: { x: 'a', y: 1 }, Media: null, Links: { x: Infinity, y: 0 } };
    expect(normalizeIconPositions(stored, ['About', 'Weather', 'Media', 'Links'])).toEqual({ About: { x: 1, y: 2 } });
    expect(normalizeIconPositions([1, 2], ['About'])).toEqual({});
    expect(normalizeIconPositions(undefined, ['About'])).toEqual({});
  });
});

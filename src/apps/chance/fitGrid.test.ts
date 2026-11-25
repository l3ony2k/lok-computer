import { describe, expect, test } from 'bun:test';
import { fitGrid } from './fitGrid';

const base = { gapRatio: 0.18, extraPerRow: 24, min: 56, max: 240 };

describe('fitGrid', () => {
  test('one item takes the smaller of width and height, up to the cap', () => {
    expect(fitGrid({ ...base, count: 1, width: 900, height: 500 }).size).toBe(240);
    expect(fitGrid({ ...base, count: 1, width: 150, height: 500 }).size).toBe(150);
  });

  test('ten items in a wide, tall table go to two balanced rows of five', () => {
    const fit = fitGrid({ ...base, count: 10, width: 1200, height: 560 });
    expect(fit).toMatchObject({ rows: 2, columns: 5 });
    expect(fit.size).toBeGreaterThan(160);
  });

  test('a short table keeps one row', () => {
    expect(fitGrid({ ...base, count: 4, width: 1200, height: 200 }).rows).toBe(1);
  });

  test('a narrow, tall table stacks more rows', () => {
    const fit = fitGrid({ ...base, count: 6, width: 300, height: 900 });
    expect(fit.rows).toBeGreaterThanOrEqual(3);
    expect(fit.columns * fit.rows).toBeGreaterThanOrEqual(6);
  });

  test('never below the minimum', () => {
    expect(fitGrid({ ...base, count: 10, width: 100, height: 100 }).size).toBe(56);
  });
});

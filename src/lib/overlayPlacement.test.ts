import { describe, expect, it } from 'bun:test';
import { chooseVerticalSide, clampSpan, clampToOverlay, verticalOffset } from './overlayPlacement';

describe('clampSpan', () => {
  it('leaves a span that fits where it is', () => {
    expect(clampSpan(100, 50, 400)).toBe(100);
    expect(clampSpan(100, 50, 400, 8)).toBe(100);
  });

  it('pulls a span back from the far edge', () => {
    expect(clampSpan(380, 50, 400)).toBe(350);
    expect(clampSpan(380, 50, 400, 8)).toBe(342);
  });

  it('pushes a span off the near edge', () => {
    expect(clampSpan(-20, 50, 400)).toBe(0);
    expect(clampSpan(2, 50, 400, 8)).toBe(8);
  });

  it('keeps the start edge when the span is larger than the area', () => {
    expect(clampSpan(30, 500, 400)).toBe(0);
    expect(clampSpan(30, 500, 400, 8)).toBe(8);
  });
});

describe('clampToOverlay', () => {
  const area = { width: 800, height: 600 };
  const size = { width: 160, height: 200 };

  it('keeps a menu at the pointer when it fits', () => {
    expect(clampToOverlay({ x: 10, y: 20 }, size, area)).toEqual({ x: 10, y: 20 });
  });

  it('moves a menu near the bottom-right corner back inside', () => {
    expect(clampToOverlay({ x: 790, y: 590 }, size, area)).toEqual({ x: 640, y: 400 });
    expect(clampToOverlay({ x: 790, y: 590 }, size, area, 8)).toEqual({ x: 632, y: 392 });
  });
});

describe('chooseVerticalSide', () => {
  it('opens below when the content fits there', () => {
    expect(chooseVerticalSide({ top: 100, bottom: 120 }, 200, 600, 2)).toEqual({ side: 'below', space: 478 });
  });

  it('opens above near the bottom edge when there is more room above', () => {
    expect(chooseVerticalSide({ top: 500, bottom: 520 }, 200, 600, 2)).toEqual({ side: 'above', space: 498 });
  });

  it('stays below when it does not fit either way but below is roomier', () => {
    expect(chooseVerticalSide({ top: 50, bottom: 70 }, 900, 600, 2)).toEqual({ side: 'below', space: 528 });
  });
});

describe('verticalOffset', () => {
  const anchor = { top: 500, bottom: 520 };
  it('hangs below the anchor', () => expect(verticalOffset(anchor, 100, 'below', 2)).toBe(522));
  it('rises above the anchor', () => expect(verticalOffset(anchor, 100, 'above', 2)).toBe(398));
});

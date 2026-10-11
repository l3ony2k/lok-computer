import { describe, expect, test } from 'bun:test';
import { SNAP_EDGE_PX, resolveSnapZone, snapZoneRect } from './windowSnap';

const AREA = { width: 1200, height: 900 };

describe('resolveSnapZone', () => {
  test('with the modifier, the pointer side picks a half and the outer thirds pick quarters', () => {
    expect(resolveSnapZone({ x: 100, y: 450 }, AREA, true)).toBe('left');
    expect(resolveSnapZone({ x: 1100, y: 450 }, AREA, true)).toBe('right');
    expect(resolveSnapZone({ x: 100, y: 100 }, AREA, true)).toBe('top-left');
    expect(resolveSnapZone({ x: 1100, y: 100 }, AREA, true)).toBe('top-right');
    expect(resolveSnapZone({ x: 100, y: 850 }, AREA, true)).toBe('bottom-left');
    expect(resolveSnapZone({ x: 1100, y: 850 }, AREA, true)).toBe('bottom-right');
  });

  test('without the modifier, only the left and right edges snap', () => {
    expect(resolveSnapZone({ x: 600, y: 450 }, AREA, false)).toBeNull();
    expect(resolveSnapZone({ x: 600, y: 0 }, AREA, false)).toBeNull();
    expect(resolveSnapZone({ x: SNAP_EDGE_PX, y: 450 }, AREA, false)).toBe('left');
    expect(resolveSnapZone({ x: SNAP_EDGE_PX + 1, y: 450 }, AREA, false)).toBeNull();
    expect(resolveSnapZone({ x: 1199, y: 450 }, AREA, false)).toBe('right');
  });

  test('edge corners snap to quarters', () => {
    expect(resolveSnapZone({ x: 0, y: 0 }, AREA, false)).toBe('top-left');
    expect(resolveSnapZone({ x: 1200, y: 900 }, AREA, false)).toBe('bottom-right');
    expect(resolveSnapZone({ x: 0, y: 899 }, AREA, false)).toBe('bottom-left');
  });

  test('an empty area never snaps', () => {
    expect(resolveSnapZone({ x: 0, y: 0 }, { width: 0, height: 0 }, true)).toBeNull();
  });
});

describe('snapZoneRect', () => {
  test('halves and quarters tile the area', () => {
    expect(snapZoneRect('left', AREA)).toEqual({ x: 0, y: 0, width: 600, height: 900 });
    expect(snapZoneRect('right', AREA)).toEqual({ x: 600, y: 0, width: 600, height: 900 });
    expect(snapZoneRect('top-left', AREA)).toEqual({ x: 0, y: 0, width: 600, height: 450 });
    expect(snapZoneRect('bottom-right', AREA)).toEqual({ x: 600, y: 450, width: 600, height: 450 });
  });

  test('odd sizes overlap by a pixel instead of leaving a gap', () => {
    const odd = { width: 801, height: 601 };
    const left = snapZoneRect('left', odd);
    const right = snapZoneRect('right', odd);
    expect(left.x + left.width).toBeGreaterThanOrEqual(right.x);
    expect(right.x + right.width).toBe(odd.width);
    const bottom = snapZoneRect('bottom-left', odd);
    expect(bottom.y + bottom.height).toBe(odd.height);
  });
});

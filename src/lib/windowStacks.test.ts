import { describe, expect, test } from 'bun:test';
import { dissolveSingletons, leaveStack, parseStackMembers, stackOrder, stackTabOffset } from './windowStacks';

const windows = [
  { id: 'a', stack: 's1', stackedAt: 10 },
  { id: 'b', stack: 's1', stackedAt: 20 },
  { id: 'c', stack: 's1', stackedAt: 15, minimized: true },
  { id: 'd' },
  { id: 'e', stack: 's2', stackedAt: 5 },
];

describe('window stacks', () => {
  test('orders a strip by join time and leaves minimized tabs out', () => {
    expect(stackOrder(windows, 's1').map((w) => w.id)).toEqual(['a', 'b']);
    expect(stackOrder(windows, 'none')).toEqual([]);
  });

  test('a window leaving a two-member stack dissolves it', () => {
    const after = leaveStack([windows[0], windows[1], windows[3]], 'a');
    expect(after.map((w) => w.stack)).toEqual([undefined, undefined, undefined]);
  });

  test('a window leaving a larger stack leaves the others stacked', () => {
    const after = leaveStack(windows, 'a');
    expect(after.find((w) => w.id === 'a')?.stack).toBeUndefined();
    expect(after.find((w) => w.id === 'b')?.stack).toBe('s1');
    expect(after.find((w) => w.id === 'c')?.stack).toBe('s1');
  });

  test('singleton stacks dissolve, full ones stay', () => {
    const after = dissolveSingletons(windows);
    expect(after.find((w) => w.id === 'e')?.stack).toBeUndefined();
    expect(after.find((w) => w.id === 'a')?.stack).toBe('s1');
    expect(leaveStack(windows, 'd')).toEqual(windows);
  });

  test('a tab sits after the widths of the tabs before it', () => {
    const tabWidths = new Map([['a', 150], ['b', 120], ['c', 90]]);
    const members = parseStackMembers('a,b,c');
    expect(stackTabOffset(members, 'a', tabWidths)).toBe(0);
    expect(stackTabOffset(members, 'b', tabWidths)).toBe(150);
    expect(stackTabOffset(members, 'c', tabWidths)).toBe(270);
    expect(stackTabOffset(members, 'zz', tabWidths)).toBe(360);
    expect(parseStackMembers(null)).toEqual([]);
  });
});

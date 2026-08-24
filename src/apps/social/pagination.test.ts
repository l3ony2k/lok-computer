import { describe, expect, test } from 'bun:test';
import { getNextCursor } from './pagination';

describe('social feed pagination', () => {
  test('stops when a provider returns no cursor', () => {
    expect(getNextCursor('cursor-1', undefined)).toBeUndefined();
    expect(getNextCursor(undefined, '')).toBeUndefined();
  });

  test('stops when a provider repeats the current cursor', () => {
    expect(getNextCursor('cursor-1', 'cursor-1')).toBeUndefined();
  });

  test('accepts a new cursor', () => {
    expect(getNextCursor('cursor-1', 'cursor-2')).toBe('cursor-2');
    expect(getNextCursor(undefined, 'cursor-1')).toBe('cursor-1');
  });
});

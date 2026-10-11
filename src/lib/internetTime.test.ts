import { describe, expect, test } from 'bun:test';
import { swatchBeats } from './internetTime';

describe('swatchBeats', () => {
  test('counts from Biel midnight, one hour ahead of UTC', () => {
    expect(swatchBeats(new Date('2000-01-01T23:00:00.000Z'))).toBe('000.00');
    expect(swatchBeats(new Date('2000-01-01T00:00:00.000Z'))).toBe('041.66');
    expect(swatchBeats(new Date('2000-01-01T11:00:00.000Z'))).toBe('500.00');
  });

  test('keeps centibeats from the milliseconds', () => {
    expect(swatchBeats(new Date('2000-01-01T12:34:56.789Z'))).toBe('565.93');
    expect(swatchBeats(new Date('2000-01-01T22:59:59.999Z'))).toBe('999.99');
  });

  test('ignores the local zone of the date', () => {
    const utc = new Date('2026-10-11T08:53:00.000Z');
    expect(swatchBeats(utc)).toBe('411.80');
  });
});

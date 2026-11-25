import { describe, expect, test } from 'bun:test';
import type { Rng } from './random';
import {
  DEFAULT_WHEEL_STATE,
  MAX_OPTION_LENGTH,
  MAX_WHEEL_OPTIONS,
  MIN_WHEEL_OPTIONS,
  SPIN_MS,
  WHEEL_PRESETS,
  addOption,
  normalizeOptions,
  normalizeWheelState,
  planSpin,
  sliceAngle,
  sliceAtPointer,
  wheelOptions,
} from './wheel';

const seeded = (seed: number): Rng => () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};

describe('presets', () => {
  test('every preset can spin as it comes, within the cap, already normalised', () => {
    for (const preset of WHEEL_PRESETS) {
      expect(preset.options.length).toBeGreaterThanOrEqual(MIN_WHEEL_OPTIONS);
      expect(preset.options.length).toBeLessThanOrEqual(MAX_WHEEL_OPTIONS);
      expect(normalizeOptions(preset.options)).toEqual([...preset.options]);
    }
  });

  test('ids are unique', () => {
    expect(new Set(WHEEL_PRESETS.map((preset) => preset.id)).size).toBe(WHEEL_PRESETS.length);
  });
});

describe('option lists', () => {
  test('trims, collapses spaces, drops blanks, non-strings and repeats ignoring case', () => {
    expect(normalizeOptions(['  Ramen ', 'ramen', '', '   ', 3, null, 'Pho  bo', 'PHO BO', 'Sushi'])).toEqual(['Ramen', 'Pho bo', 'Sushi']);
  });

  test('caps the count and the length', () => {
    const many = Array.from({ length: 30 }, (_, index) => `Option ${index}`);
    expect(normalizeOptions(many)).toHaveLength(MAX_WHEEL_OPTIONS);
    expect(normalizeOptions(['x'.repeat(100)])[0]).toHaveLength(MAX_OPTION_LENGTH);
  });

  test('anything but an array is an empty list', () => {
    expect(normalizeOptions('Ramen')).toEqual([]);
    expect(normalizeOptions(undefined)).toEqual([]);
  });

  test('adding refuses blanks, repeats and a full wheel', () => {
    expect(addOption(['Ramen'], '  ')).toEqual({ ok: false, reason: 'empty' });
    expect(addOption(['Ramen'], ' RAMEN ')).toEqual({ ok: false, reason: 'duplicate' });
    const full = Array.from({ length: MAX_WHEEL_OPTIONS }, (_, index) => `${index}`);
    expect(addOption(full, 'One more')).toEqual({ ok: false, reason: 'full' });
    expect(addOption(['Ramen'], '  Pho ')).toEqual({ ok: true, options: ['Ramen', 'Pho'] });
  });
});

describe('saved state', () => {
  test('falls back to the default for anything unreadable', () => {
    expect(normalizeWheelState(null)).toEqual(DEFAULT_WHEEL_STATE);
    expect(normalizeWheelState('lunch')).toEqual(DEFAULT_WHEEL_STATE);
    expect(normalizeWheelState({ preset: 'yesno' }).preset).toBe(DEFAULT_WHEEL_STATE.preset);
  });

  test('keeps edited lists of known presets, normalised', () => {
    const state = normalizeWheelState({ preset: 'mine', lists: { mine: [' A ', 'a', 'B'], bogus: ['x'], lunch: 'nope' } });
    expect(state).toEqual({ preset: 'mine', lists: { mine: ['A', 'B'] } });
    expect(wheelOptions(state)).toEqual(['A', 'B']);
    expect(wheelOptions(state, 'lunch')).toEqual([...WHEEL_PRESETS[0].options]);
  });
});

describe('the spin', () => {
  test('the pointer reads the slice it sits in', () => {
    expect(sliceAtPointer(0, 4)).toBe(0);
    // Turning the wheel 10° clockwise brings the end of the last slice under the pointer.
    expect(sliceAtPointer(10, 4)).toBe(3);
    expect(sliceAtPointer(-10, 4)).toBe(0);
    expect(sliceAtPointer(-100, 4)).toBe(1);
    expect(sliceAtPointer(720 + 350, 4)).toBe(0);
  });

  test('lands the pointer inside the winner, away from its edges, for many seeds and counts', () => {
    for (let count = MIN_WHEEL_OPTIONS; count <= MAX_WHEEL_OPTIONS; count++) {
      for (let seed = 1; seed <= 200; seed++) {
        const rng = seeded(seed * 7919 + count);
        const from = (seed * 137.3) % 2000 - 500;
        const plan = planSpin(from, count, rng);
        expect(plan.winner).toBeGreaterThanOrEqual(0);
        expect(plan.winner).toBeLessThan(count);
        expect(sliceAtPointer(plan.to, count)).toBe(plan.winner);
        // Not on a line: the landing point is at least a tenth of a slice from either edge.
        const into = (((-plan.to % 360) + 360) % 360) / sliceAngle(count) - plan.winner;
        expect(into).toBeGreaterThan(0.1);
        expect(into).toBeLessThan(0.9);
        // Four to six whole turns ahead, plus less than one more.
        expect(plan.to - from).toBeGreaterThanOrEqual(4 * 360);
        expect(plan.to - from).toBeLessThan(7 * 360);
        expect(plan.turns).toBeGreaterThanOrEqual(4);
        expect(plan.turns).toBeLessThanOrEqual(6);
        expect(plan.durationMs).toBeGreaterThanOrEqual(SPIN_MS.min);
        expect(plan.durationMs).toBeLessThanOrEqual(SPIN_MS.max);
      }
    }
  });

  test('the winner is uniform', () => {
    const rng = seeded(42);
    const counts = [0, 0, 0, 0, 0];
    const spins = 20000;
    for (let index = 0; index < spins; index++) counts[planSpin(0, 5, rng).winner]++;
    for (const count of counts) expect(Math.abs(count / spins - 0.2)).toBeLessThan(0.02);
  });

  test('extreme random values stay in range', () => {
    expect(planSpin(0, 3, () => 0).winner).toBe(0);
    const high = planSpin(0, 3, () => 0.999999999);
    expect(high.winner).toBe(2);
    expect(sliceAtPointer(high.to, 3)).toBe(2);
  });
});

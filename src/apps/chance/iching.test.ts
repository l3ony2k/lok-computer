import { describe, expect, test } from 'bun:test';
import {
  HEXAGRAMS,
  hexagramOf,
  ichingQuestion,
  lineValueOf,
  listLines,
  readLines,
  throwLine,
  type LineValue,
} from './iching';
import type { Rng } from './random';

/** mulberry32: a small seeded generator, even enough for the odds test. */
const seeded = (seed: number): Rng => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const bits = (text: string) => [...text].map((bit) => bit === '1');

describe('hexagrams', () => {
  test('there are 64, numbered in King Wen order, each with its words', () => {
    expect(HEXAGRAMS).toHaveLength(64);
    HEXAGRAMS.forEach((hexagram, index) => {
      expect(hexagram.number).toBe(index + 1);
      expect(hexagram.chinese.length).toBeGreaterThan(0);
      expect(hexagram.pinyin.length).toBeGreaterThan(0);
      expect(hexagram.english.length).toBeGreaterThan(0);
      expect(hexagram.meaning.length).toBeGreaterThan(0);
    });
  });

  test('every number 1–64 comes from exactly one set of lines', () => {
    const seen = new Map<number, number>();
    for (let code = 0; code < 64; code += 1) {
      const lines = Array.from({ length: 6 }, (_, bit) => Boolean(code & (1 << bit)));
      const { number } = hexagramOf(lines);
      seen.set(number, (seen.get(number) ?? 0) + 1);
    }
    expect(seen.size).toBe(64);
    for (let number = 1; number <= 64; number += 1) expect(seen.get(number)).toBe(1);
  });

  test('known hexagrams, lines bottom to top', () => {
    expect(hexagramOf(bits('111111')).number).toBe(1);
    expect(hexagramOf(bits('000000')).number).toBe(2);
    expect(hexagramOf(bits('111000')).number).toBe(11);
    expect(hexagramOf(bits('000111')).number).toBe(12);
    expect(hexagramOf(bits('101010')).number).toBe(63);
    expect(hexagramOf(bits('010101')).number).toBe(64);
    expect(hexagramOf(bits('111000')).chinese).toBe('泰');
  });
});

describe('casting', () => {
  test('inscribed counts 2, back counts 3', () => {
    expect(lineValueOf(['heads', 'heads', 'heads'])).toBe(6);
    expect(lineValueOf(['heads', 'heads', 'tails'])).toBe(7);
    expect(lineValueOf(['heads', 'tails', 'tails'])).toBe(8);
    expect(lineValueOf(['tails', 'tails', 'tails'])).toBe(9);
  });

  test('a throw is three coins and its sum', () => {
    const rng = seeded(7);
    for (let i = 0; i < 50; i += 1) {
      const line = throwLine(rng);
      expect(line.coins).toHaveLength(3);
      expect(line.value).toBe(lineValueOf(line.coins));
    }
  });

  test('sums come up 1/8, 3/8, 3/8, 1/8', () => {
    const rng = seeded(2026);
    const throws = 80000;
    const counts: Record<LineValue, number> = { 6: 0, 7: 0, 8: 0, 9: 0 };
    for (let i = 0; i < throws; i += 1) counts[throwLine(rng).value] += 1;
    expect(counts[6] / throws).toBeCloseTo(1 / 8, 2);
    expect(counts[7] / throws).toBeCloseTo(3 / 8, 2);
    expect(counts[8] / throws).toBeCloseTo(3 / 8, 2);
    expect(counts[9] / throws).toBeCloseTo(1 / 8, 2);
  });

  test('changing lines turn: 11 with lines 2 and 5 changing becomes 63', () => {
    // 泰: yang yang yang yin yin yin; line 2 old yang, line 5 old yin.
    const reading = readLines([7, 9, 7, 8, 6, 8]);
    expect(reading.primary.number).toBe(11);
    expect(reading.changing).toEqual([2, 5]);
    expect(reading.resulting?.number).toBe(63);
  });

  test('no changing lines, no resulting hexagram', () => {
    const reading = readLines([7, 7, 7, 7, 7, 7]);
    expect(reading.primary.number).toBe(1);
    expect(reading.changing).toEqual([]);
    expect(reading.resulting).toBeNull();
  });
});

describe('words', () => {
  test('lists lines', () => {
    expect(listLines([3])).toBe('line 3');
    expect(listLines([2, 5])).toBe('lines 2 and 5');
    expect(listLines([1, 4, 6])).toBe('lines 1, 4 and 6');
  });

  test('the question names both hexagrams and the changing lines', () => {
    const question = ichingQuestion([7, 9, 7, 8, 6, 8]);
    expect(question).toContain('hexagram 11, 泰 Tài (Peace)');
    expect(question).toContain('Lines 2 and 5 change');
    expect(question).toContain('hexagram 63, 既濟 Jì Jì (After completion)');
    expect(ichingQuestion([8, 8, 8, 8, 8, 8])).toContain('no changing lines');
  });
});

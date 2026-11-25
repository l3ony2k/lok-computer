import { describe, expect, test } from 'bun:test';
import { CAP_HEIGHT, DIE, M8GIC_ANSWERS, drawM8gic, kindCounts, layoutDie, lineEms, triangleWidthAt } from './m8gic';
import type { Rng } from './random';

const seeded = (seed: number): Rng => () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};

describe('M8gic', () => {
  test('twenty answers: ten yes, five maybe, five no, all different', () => {
    expect(M8GIC_ANSWERS).toHaveLength(20);
    expect(kindCounts(M8GIC_ANSWERS.map((answer) => answer.kind))).toEqual({ yes: 10, maybe: 5, no: 5 });
    expect(new Set(M8GIC_ANSWERS.map((answer) => answer.text.toLowerCase())).size).toBe(20);
  });

  test('the triangle is centred in the window: its incircle centre is the window centre', () => {
    const height = DIE.baseY - DIE.apexY;
    expect(DIE.apexY + (2 / 3) * height).toBeCloseTo(DIE.cy, 6);
    expect(DIE.halfBase * 2).toBeCloseTo((2 / Math.sqrt(3)) * height, 6);
  });

  test('every answer fits the triangle in one to three lines, centred on the incircle', () => {
    for (const answer of M8GIC_ANSWERS) {
      const layout = layoutDie(answer.text);
      expect(layout).not.toBeNull();
      const { lines, size, baselines } = layout!;
      expect(lines.length).toBeGreaterThanOrEqual(1);
      expect(lines.length).toBeLessThanOrEqual(3);
      expect(lines.join(' ')).toBe(answer.text.toUpperCase());
      expect(size).toBeGreaterThanOrEqual(7.5);
      const cap = size * CAP_HEIGHT;
      // The block's capitals, top of the first to baseline of the last, centre on the incircle centre.
      expect((baselines[0] - cap + baselines[baselines.length - 1]) / 2).toBeCloseTo(DIE.cy, 1);
      lines.forEach((line, index) => {
        expect(lineEms(line) * size).toBeLessThan(triangleWidthAt(baselines[index] - cap));
      });
    }
  });

  test('a short answer stays on one line, a long word that cannot fit is refused', () => {
    expect(layoutDie('Nope')?.lines).toEqual(['NOPE']);
    expect(layoutDie('averyveryverylongwordindeed')).toBeNull();
  });

  test('the draw covers every answer and stays in range', () => {
    expect(drawM8gic(() => 0)).toBe(0);
    expect(drawM8gic(() => 0.999999)).toBe(19);
    expect(drawM8gic(() => 1)).toBe(19);
    const rng = seeded(7);
    const seen = new Array(M8GIC_ANSWERS.length).fill(0);
    for (let i = 0; i < 4000; i += 1) seen[drawM8gic(rng)] += 1;
    for (const count of seen) {
      expect(count).toBeGreaterThan(120);
      expect(count).toBeLessThan(280);
    }
  });
});

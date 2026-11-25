import { describe, expect, test } from 'bun:test';
import type { Rng } from './random';
import {
  SETTLE_STREAK,
  countAnswers,
  DEFAULT_MOON_MODE,
  MOON_MODES,
  NEW_QUESTION,
  isMoonMode,
  countQuestions,
  groupQuestions,
  nextQuestion,
  questionOf,
  planThrow,
  readBlocks,
  throwBlock,
  throwBlocks,
  throwLength,
  type BlockPair,
  type QuestionState,
  type MoonAnswer,
} from './moonBlocks';

/** A tiny deterministic generator for tests. */
const seeded = (seed: number): Rng => () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};

/** Hands out the given numbers in turn. */
const sequence = (...values: number[]): Rng => {
  let index = 0;
  return () => values[index++ % values.length];
};

describe('moon blocks', () => {
  test('each block lands on its own draw', () => {
    expect(throwBlock(() => 0.1)).toBe('flat');
    expect(throwBlock(() => 0.7)).toBe('round');
    expect(throwBlocks(sequence(0.1, 0.7))).toEqual(['flat', 'round']);
    expect(throwBlocks(sequence(0.7, 0.1))).toEqual(['round', 'flat']);
    expect(throwBlocks(sequence(0.2, 0.3))).toEqual(['flat', 'flat']);
    expect(throwBlocks(sequence(0.6, 0.9))).toEqual(['round', 'round']);
  });

  test('a throw uses exactly two draws, one per block', () => {
    let calls = 0;
    throwBlocks(() => { calls += 1; return 0.4; });
    expect(calls).toBe(2);
  });

  test('the pair is read as yes, laughing or no', () => {
    const cases: Array<[BlockPair, MoonAnswer]> = [
      [['flat', 'round'], 'yes'],
      [['round', 'flat'], 'yes'],
      [['flat', 'flat'], 'laughing'],
      [['round', 'round'], 'no'],
    ];
    cases.forEach(([pair, answer]) => expect(readBlocks(pair)).toBe(answer));
  });

  test('yes comes about half the time, laughing and no a quarter each', () => {
    const rng = seeded(42);
    const throws = 40000;
    const answers = Array.from({ length: throws }, () => readBlocks(throwBlocks(rng)));
    const counts = countAnswers(answers);
    expect(counts.yes / throws).toBeCloseTo(0.5, 1);
    expect(counts.laughing / throws).toBeCloseTo(0.25, 1);
    expect(counts.no / throws).toBeCloseTo(0.25, 1);
    expect(Math.abs(counts.yes / throws - 0.5)).toBeLessThan(0.02);
    expect(Math.abs(counts.laughing / throws - 0.25)).toBeLessThan(0.02);
  });

  test('each block is flat about half the time, whatever the other does', () => {
    const rng = seeded(7);
    const pairs = Array.from({ length: 20000 }, () => throwBlocks(rng));
    const firstFlat = pairs.filter(([first]) => first === 'flat');
    expect(firstFlat.length / pairs.length).toBeCloseTo(0.5, 1);
    expect(pairs.filter(([, second]) => second === 'flat').length / pairs.length).toBeCloseTo(0.5, 1);
    // Independence: the second block does not follow the first.
    expect(firstFlat.filter(([, second]) => second === 'flat').length / firstFlat.length).toBeCloseTo(0.5, 1);
  });

  const asking = (yeses: number): QuestionState => ({ status: 'asking', yeses });

  test('simple: one 聖筊 answers yes; 笑筊 just asks again', () => {
    expect(questionOf([], 'simple')).toEqual(asking(0));
    expect(questionOf(['yes'], 'simple')).toEqual({ status: 'confirmed', yeses: 1 });
    expect(questionOf(['laughing', 'laughing'], 'simple')).toEqual(asking(0));
    expect(questionOf(['laughing', 'yes'], 'simple').status).toBe('confirmed');
    expect(questionOf(['laughing', 'no'], 'simple').status).toBe('declined');
  });

  test('usual: three 聖筊 in total; 笑筊 loses nothing', () => {
    expect(questionOf(['yes', 'yes'], 'usual')).toEqual(asking(2));
    expect(questionOf(['yes', 'laughing'], 'usual')).toEqual(asking(1));
    expect(questionOf(['yes', 'laughing', 'yes', 'yes'], 'usual')).toEqual({ status: 'confirmed', yeses: 3 });
    expect(questionOf(['yes', 'yes', 'no'], 'usual').status).toBe('declined');
  });

  test('serious: three 聖筊 in a row; 笑筊 starts the count over', () => {
    expect(questionOf(['yes', 'yes'], 'serious')).toEqual(asking(2));
    expect(questionOf(['yes', 'yes', 'laughing'], 'serious')).toEqual(asking(0));
    expect(questionOf(['yes', 'laughing', 'yes', 'yes'], 'serious')).toEqual(asking(2));
    expect(questionOf(['laughing', 'yes', 'yes', 'yes'], 'serious')).toEqual({ status: 'confirmed', yeses: SETTLE_STREAK });
  });

  test('陰筊 ends the question in every mode, and 笑筊 never does', () => {
    (['simple', 'usual', 'serious'] as const).forEach((mode) => {
      expect(questionOf(['no'], mode).status).toBe('declined');
      expect(questionOf(['laughing', 'laughing', 'laughing', 'laughing'], mode).status).toBe('asking');
    });
  });

  test('the throw after a question ends starts a new one', () => {
    const confirmed = questionOf(['yes', 'yes', 'yes'], 'serious');
    expect(nextQuestion(confirmed, 'yes', 'serious')).toEqual(asking(1));
    expect(nextQuestion(confirmed, 'no', 'usual').status).toBe('declined');
    expect(nextQuestion({ status: 'declined', yeses: 0 }, 'laughing', 'usual')).toEqual(NEW_QUESTION);
    expect(nextQuestion(confirmed, 'yes', 'simple').status).toBe('confirmed');
  });

  test('modes', () => {
    expect(isMoonMode('usual')).toBe(true);
    expect(isMoonMode('casual')).toBe(false);
    expect(DEFAULT_MOON_MODE).toBe('usual');
    expect(MOON_MODES.map((mode) => mode.need)).toEqual([1, 3, 3]);
  });

  test('throws are grouped into questions', () => {
    const answers = ['yes', 'laughing', 'yes', 'yes', 'yes', 'no', 'yes', 'laughing'] as const;
    const groups = groupQuestions(answers.map((answer, index) => ({ index, answer })), 'serious');
    expect(groups.map((group) => group.throws.map((entry) => entry.index))).toEqual([[0, 1, 2, 3, 4], [5], [6, 7]]);
    expect(groups.map((group) => group.state.status)).toEqual(['confirmed', 'declined', 'asking']);
    expect(groups[2].state.yeses).toBe(0);
    expect(countQuestions(groups.map((group) => group.state))).toEqual({ total: 3, confirmed: 1, declined: 1, open: 1 });
    expect(groupQuestions([], 'usual')).toEqual([]);
    // The same throws, asked simply: every 聖筊 answers at once.
    expect(groupQuestions(answers.map((answer, index) => ({ index, answer })), 'simple').map((group) => group.throws.length)).toEqual([1, 2, 1, 1, 1, 1, 1]);
  });

  test('summary counts', () => {
    expect(countAnswers(['yes', 'no', 'yes', 'laughing'])).toEqual({ yes: 2, laughing: 1, no: 1 });
  });

  test('the two blocks never move in step and rest apart', () => {
    const rng = seeded(3);
    for (let round = 0; round < 500; round += 1) {
      const [first, second] = planThrow(['flat', 'round'], rng);
      expect(first.face).toBe('flat');
      expect(second.face).toBe('round');
      expect(Math.abs(first.motion.delay - second.motion.delay)).toBeGreaterThanOrEqual(70);
      expect(Math.abs(first.motion.duration - second.motion.duration)).toBeGreaterThanOrEqual(80);
      expect(first.motion.delay).toBeGreaterThanOrEqual(0);
      expect(second.motion.delay).toBeGreaterThanOrEqual(0);
      expect(second.pose.x - first.pose.x).toBeGreaterThanOrEqual(0.32);
      const turn = Math.abs(((((second.pose.angle - first.pose.angle) % 360) + 540) % 360) - 180);
      expect(turn).toBeGreaterThanOrEqual(30);
      expect(throwLength([first, second])).toBe(Math.max(first.motion.delay + first.motion.duration, second.motion.delay + second.motion.duration));
    }
  });

  test('throws land in a different pose each time', () => {
    const rng = seeded(11);
    const a = planThrow(['flat', 'flat'], rng);
    const b = planThrow(['flat', 'flat'], rng);
    expect(a[0].pose).not.toEqual(b[0].pose);
    expect(a[1].pose).not.toEqual(b[1].pose);
  });
});

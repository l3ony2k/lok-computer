import { describe, expect, it } from 'bun:test';
import { Glob } from 'bun';
import { HISTORY_LIMIT, pushHistory } from './history';
import { between } from './random';
import { plural } from '@/lib/plural';

const SELF = 'src/apps/chance/chanceShared.test.ts';

/** Lines in Chance's source matching `pattern`, outside the files allowed to have it. */
const offenders = async (pattern: RegExp, allowed: readonly string[]) => {
  const found: string[] = [];
  for await (const file of new Glob('src/apps/chance/*.{ts,tsx}').scan({ cwd: process.cwd() })) {
    if (file === SELF || allowed.includes(file)) continue;
    const lines = (await Bun.file(file).text()).split('\n');
    lines.forEach((line, index) => {
      if (pattern.test(line)) found.push(`${file}:${index + 1}: ${line.trim()}`);
    });
  }
  return found;
};

describe('pushHistory', () => {
  it('puts the entry first and keeps at most the cap', () => {
    expect(pushHistory([2, 3], 1)).toEqual([1, 2, 3]);
    const full = Array.from({ length: HISTORY_LIMIT }, (_, index) => index);
    expect(pushHistory(full, -1)).toHaveLength(HISTORY_LIMIT);
    expect(pushHistory(full, -1)[0]).toBe(-1);
    expect(pushHistory([1, 2, 3], 0, 2)).toEqual([0, 1]);
  });
});

describe('between and plural', () => {
  it('spans min up to max', () => {
    expect(between(() => 0, 2, 6)).toBe(2);
    expect(between(() => 0.5, 2, 6)).toBe(4);
  });

  it('says the count with the word that goes with it', () => {
    expect(plural(1, 'coin', 'coins')).toBe('1 coin');
    expect(plural(0, 'coin', 'coins')).toBe('0 coins');
    expect(plural(3, 'coin', 'coins')).toBe('3 coins');
  });
});

/**
 * The Chance tables share one history list, one landing hook, one coin and
 * one Ask AI line, so a table written by hand cannot drift from the others.
 */
describe('Chance tables', () => {
  it('draw history entries with ChanceTable (entries + renderEntry, or HistoryEntry)', async () => {
    expect(await offenders(/chance-history-entry/, ['src/apps/chance/ChanceTable.tsx'])).toEqual([]);
  });

  it('trim histories with pushHistory (history.ts)', async () => {
    expect(await offenders(/\]\.slice\(0,/, ['src/apps/chance/history.ts'])).toEqual([]);
  });

  it('time their landings with useLanding', async () => {
    // Tarot's cards time their own deal inside each card's effect.
    expect(await offenders(/setTimeout\(/, ['src/apps/chance/useLanding.ts', 'src/apps/chance/TarotCardView.tsx'])).toEqual([]);
  });

  it('draw coins with CoinView', async () => {
    expect(await offenders(/chance-coin-image/, ['src/apps/chance/CoinView.tsx'])).toEqual([]);
  });

  it('hand readings to Ask AI with AskLine', async () => {
    expect(await offenders(/chance-ask-line/, ['src/apps/chance/ChanceTable.tsx'])).toEqual([]);
  });

  it('pick numbers in a range with between (random.ts)', async () => {
    expect(await offenders(/\* \(max - min\)/, ['src/apps/chance/random.ts'])).toEqual([]);
  });
});

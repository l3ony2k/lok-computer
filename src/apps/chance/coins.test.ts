import { describe, expect, test } from 'bun:test';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { COIN_TYPES, DEFAULT_COIN, isCoinType } from './coins';

const ROOT = path.resolve(import.meta.dir, '../../..');

describe('coin types', () => {
  test('every type has both faces on disk', () => {
    for (const type of COIN_TYPES) {
      for (const side of ['heads', 'tails']) {
        expect(existsSync(path.join(ROOT, 'src/assets/coin', type.id, `${side}.webp`))).toBe(true);
      }
    }
  });

  test('ids are unique and the default is one of them', () => {
    expect(new Set(COIN_TYPES.map((type) => type.id)).size).toBe(COIN_TYPES.length);
    expect(isCoinType(DEFAULT_COIN)).toBe(true);
    expect(isCoinType('nope')).toBe(false);
  });
});

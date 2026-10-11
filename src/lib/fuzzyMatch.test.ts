import { describe, expect, test } from 'bun:test';
import { fuzzyMatch, rankFuzzy } from './fuzzyMatch';

const APPS = ['Are.na', 'Web', 'Bsky', 'Fedi', 'Ask AI', 'Media', 'Weather', 'Console', 'Links', 'About', 'Config', 'Guestbook', 'Shelf', 'Images'];

describe('fuzzyMatch', () => {
  test('requires every character in order', () => {
    expect(fuzzyMatch('cfg', 'Config')).not.toBeNull();
    expect(fuzzyMatch('gfc', 'Config')).toBeNull();
    expect(fuzzyMatch('', 'Anything')).toEqual({ score: 0, indices: [] });
  });

  test('prefers prefixes, then word starts', () => {
    const ranked = rankFuzzy('we', APPS, (app) => app).map((entry) => entry.item);
    expect(ranked[0]).toBe('Web');
    expect(ranked).toContain('Weather');
    expect(rankFuzzy('ai', APPS, (app) => app)[0].item).toBe('Ask AI');
  });

  test('reports the matched indices for highlighting', () => {
    expect(fuzzyMatch('ab', 'About')?.indices).toEqual([0, 1]);
    expect(fuzzyMatch('ca', 'Chance')?.indices).toEqual([0, 2]);
  });
});

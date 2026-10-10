import { describe, expect, test } from 'bun:test';
import { moveIcon, normalizeIconOrder } from './desktopIconOrder';

const CATALOG = ['About', 'Arena', 'Weather', 'Media'];

describe('normalizeIconOrder', () => {
  test('keeps the stored order and appends apps the store does not know', () => {
    expect(normalizeIconOrder(['Weather', 'About'], CATALOG)).toEqual(['Weather', 'About', 'Arena', 'Media']);
  });

  test('drops apps that no longer exist, duplicates, and junk', () => {
    expect(normalizeIconOrder(['Gone', 'Media', 7, 'Media', null], CATALOG)).toEqual(['Media', 'About', 'Arena', 'Weather']);
  });

  test('falls back to the catalog order for anything that is not a list', () => {
    expect(normalizeIconOrder(undefined, CATALOG)).toEqual(CATALOG);
    expect(normalizeIconOrder('About', CATALOG)).toEqual(CATALOG);
  });
});

describe('moveIcon', () => {
  test('dropping on a later icon lands after it', () => {
    expect(moveIcon(CATALOG, 'About', 'Weather')).toEqual(['Arena', 'Weather', 'About', 'Media']);
  });

  test('dropping on an earlier icon lands before it', () => {
    expect(moveIcon(CATALOG, 'Media', 'Arena')).toEqual(['About', 'Media', 'Arena', 'Weather']);
  });

  test('a drop on itself or an unknown id changes nothing', () => {
    expect(moveIcon(CATALOG, 'About', 'About')).toBe(CATALOG);
    expect(moveIcon(CATALOG, 'About', 'Nope')).toBe(CATALOG);
  });
});

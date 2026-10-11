import { describe, expect, test } from 'bun:test';
import {
  DEFAULT_DICE,
  MAX_CARDS,
  MAX_DICE,
  buildDeck,
  drawCards,
  drawTarot,
  flipCoin,
  normalizeChanceState,
  rollDice,
  rollDie,
  shuffle,
  tarotQuestion,
  type Rng,
} from './random';
import { TAROT_DECK } from './tarot';

/** A tiny deterministic generator for tests. */
const seeded = (seed: number): Rng => () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};

describe('dice and coins', () => {
  test('a roll stays within the die', () => {
    const rng = seeded(1);
    for (let i = 0; i < 500; i += 1) {
      const value = rollDie(20, rng);
      expect(value).toBeGreaterThanOrEqual(1);
      expect(value).toBeLessThanOrEqual(20);
    }
    expect(rollDie(6, () => 0)).toBe(1);
    expect(rollDie(6, () => 0.999999)).toBe(6);
    expect(rollDice([4, 6, 8], () => 0.5)).toEqual([3, 4, 5]);
  });

  test('a coin lands on both sides', () => {
    expect(flipCoin(() => 0.2)).toBe('heads');
    expect(flipCoin(() => 0.7)).toBe('tails');
  });
});

describe('cards', () => {
  test('the deck has 52 distinct cards and a shuffle keeps them all', () => {
    const deck = buildDeck();
    expect(deck).toHaveLength(52);
    expect(new Set(deck.map((card) => card.id)).size).toBe(52);
    const shuffled = shuffle(deck, seeded(7));
    expect(shuffled).toHaveLength(52);
    expect(new Set(shuffled.map((card) => card.id)).size).toBe(52);
    expect(shuffled).not.toEqual(deck);
    expect(deck[0].id).toBe('A♠');
  });

  test('drawing takes from the top, never more than the cap or what is left', () => {
    const deck = buildDeck();
    const { drawn, rest } = drawCards(deck, 5);
    expect(drawn).toEqual(deck.slice(0, 5));
    expect(rest).toHaveLength(47);
    expect(drawCards(deck, 99).drawn).toHaveLength(MAX_CARDS);
    expect(drawCards(deck.slice(0, 3), 5).drawn).toHaveLength(3);
  });
});

describe('tarot', () => {
  test('the deck is complete', () => {
    expect(TAROT_DECK).toHaveLength(78);
    expect(TAROT_DECK.filter((card) => card.arcana === 'major')).toHaveLength(22);
    expect(new Set(TAROT_DECK.map((card) => card.id)).size).toBe(78);
  });

  test('a spread draws distinct cards and phrases the question for Ask AI', () => {
    const draws = drawTarot(3, seeded(3));
    expect(new Set(draws.map((draw) => draw.card.id)).size).toBe(3);
    const question = tarotQuestion(draws);
    expect(question).toContain('three-card tarot spread');
    expect(question).toContain('past:');
    expect(tarotQuestion([{ card: TAROT_DECK[0], reversed: true }])).toBe('I drew The Fool (reversed) in a one-card tarot reading. What does it mean?');
  });
});

describe('normalizeChanceState', () => {
  test('keeps known tabs and dice, falls back otherwise', () => {
    expect(normalizeChanceState({ tab: 'tarot', dice: [6, 20, 7, 100] })).toEqual({ tab: 'tarot', dice: [6, 20, 100] });
    expect(normalizeChanceState({ tab: 'nope', dice: [] })).toEqual({ tab: 'dice', dice: DEFAULT_DICE });
    expect(normalizeChanceState(null).dice).toEqual(DEFAULT_DICE);
    expect(normalizeChanceState({ dice: Array(20).fill(6) }).dice).toHaveLength(MAX_DICE);
  });
});

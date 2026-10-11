/**
 * Chance's pure helpers. Every draw takes an `rng` so tests can be
 * deterministic; the app passes Math.random, which is why the footer says the
 * randomness is an illusion and never to use it for keys.
 */
import { TAROT_DECK, type TarotCard } from './tarot';

export type Rng = () => number;

export const defaultRng: Rng = () => Math.random();

export const DIE_SIDES = [4, 6, 8, 10, 12, 20, 100] as const;
export type DieSides = (typeof DIE_SIDES)[number];
export const MAX_DICE = 12;
export const MAX_CARDS = 12;
export const DEFAULT_DICE: DieSides[] = [6, 6];

export type ChanceTab = 'dice' | 'coin' | 'cards' | 'tarot';
export const CHANCE_TABS: ReadonlyArray<{ id: ChanceTab; label: string }> = [
  { id: 'dice', label: 'Dice' },
  { id: 'coin', label: 'Coin' },
  { id: 'cards', label: 'Cards' },
  { id: 'tarot', label: 'Tarot' },
];

export const isChanceTab = (value: unknown): value is ChanceTab => CHANCE_TABS.some((tab) => tab.id === value);
export const isDieSides = (value: unknown): value is DieSides => (DIE_SIDES as readonly number[]).includes(value as number);

export interface ChanceState {
  tab: ChanceTab;
  dice: DieSides[];
}

export const DEFAULT_CHANCE_STATE: ChanceState = { tab: 'dice', dice: DEFAULT_DICE };

export const normalizeChanceState = (stored: unknown): ChanceState => {
  if (!stored || typeof stored !== 'object') return DEFAULT_CHANCE_STATE;
  const candidate = stored as Partial<ChanceState>;
  const dice = Array.isArray(candidate.dice) ? candidate.dice.filter(isDieSides).slice(0, MAX_DICE) : [];
  return {
    tab: isChanceTab(candidate.tab) ? candidate.tab : 'dice',
    dice: dice.length ? dice : DEFAULT_DICE,
  };
};

export const rollDie = (sides: number, rng: Rng = defaultRng) => 1 + Math.floor(rng() * sides);

export const rollDice = (dice: readonly number[], rng: Rng = defaultRng) => dice.map((sides) => rollDie(sides, rng));

export type CoinSide = 'heads' | 'tails';

export const flipCoin = (rng: Rng = defaultRng): CoinSide => (rng() < 0.5 ? 'heads' : 'tails');

/** Fisher–Yates; returns a new array. */
export const shuffle = <T>(items: readonly T[], rng: Rng = defaultRng): T[] => {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(rng() * (index + 1));
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
};

export type SuitId = 'spades' | 'hearts' | 'diamonds' | 'clubs';

export interface PlayingCard {
  id: string;
  rank: string;
  suit: SuitId;
  symbol: string;
  red: boolean;
}

const CARD_SUITS: Array<{ id: SuitId; symbol: string; red: boolean }> = [
  { id: 'spades', symbol: '♠', red: false },
  { id: 'hearts', symbol: '♥', red: true },
  { id: 'diamonds', symbol: '♦', red: true },
  { id: 'clubs', symbol: '♣', red: false },
];

const CARD_RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

export const buildDeck = (): PlayingCard[] => CARD_SUITS.flatMap((suit) => CARD_RANKS.map((rank) => ({
  id: `${rank}${suit.symbol}`,
  rank,
  suit: suit.id,
  symbol: suit.symbol,
  red: suit.red,
})));

/** Takes `count` cards off the top; fewer when the deck runs short. */
export const drawCards = (deck: readonly PlayingCard[], count: number) => {
  const taken = Math.max(0, Math.min(count, deck.length, MAX_CARDS));
  return { drawn: deck.slice(0, taken), rest: deck.slice(taken) };
};

export interface TarotDraw {
  card: TarotCard;
  reversed: boolean;
}

export const SPREAD_POSITIONS = ['Past', 'Present', 'Future'] as const;

export const drawTarot = (count: 1 | 3, rng: Rng = defaultRng): TarotDraw[] => (
  shuffle(TAROT_DECK, rng).slice(0, count).map((card) => ({ card, reversed: rng() < 0.5 }))
);

const describeDraw = ({ card, reversed }: TarotDraw) => `${card.name} (${reversed ? 'reversed' : 'upright'})`;

/** The question handed to Ask AI for a reading. */
export const tarotQuestion = (draws: readonly TarotDraw[]): string => {
  if (draws.length === 1) {
    return `I drew ${describeDraw(draws[0])} in a one-card tarot reading. What does it mean?`;
  }
  const spread = draws.map((draw, index) => `${SPREAD_POSITIONS[index]?.toLowerCase() ?? `card ${index + 1}`}: ${describeDraw(draw)}`).join(', ');
  return `I drew a three-card tarot spread, ${spread}. What does it mean?`;
};

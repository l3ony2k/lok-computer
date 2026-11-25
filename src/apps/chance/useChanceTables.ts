import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { createId } from '@/lib/id';
import { prefersReducedMotion } from '@/lib/motion';
import {
  MAX_CARDS,
  MAX_DICE,
  buildDeck,
  drawCards,
  drawTarot,
  flipCoins,
  isDieSides,
  rollDice,
  rollDie,
  shuffle,
  type ChanceState,
  type CoinSide,
  type DieSides,
  type PlayingCard,
  type TarotDraw,
} from './random';
import { DEFAULT_COIN, MAX_COINS, isCoinType } from './coins';
import { LAND_AT, THROW_MS, THROW_STAGGER_MS, throwDice } from './dieThrow';
import { dealOriginOf, type DealOrigin } from './deal';

/**
 * The state and actions behind each Chance tab. ChanceApp calls all four, so
 * a tab's table and history survive switching to another tab and back.
 */

type SetChanceState = Dispatch<SetStateAction<ChanceState>>;

/** Entries kept in each history, newest first. */
const HISTORY = 30;
const ROLL_TICK_MS = 60;
const FLIP_MS = 500;

// ---------- Dice ----------

export interface DiceRoll { id: string; dice: { sides: number; value: number }[] }

export const QUICK_SETS: ReadonlyArray<{ label: string; dice: DieSides[] }> = [
  { label: 'd20', dice: [20] },
  { label: '2d6', dice: [6, 6] },
  { label: '3d6', dice: [6, 6, 6] },
  { label: '4d6', dice: [6, 6, 6, 6] },
  { label: 'd100', dice: [100] },
];

export const useDiceTable = (dice: DieSides[], setState: SetChanceState) => {
  const [faces, setFaces] = useState<number[] | null>(null);
  const [rolling, setRolling] = useState(false);
  const [rolls, setRolls] = useState<DiceRoll[]>([]);
  // The die whose picker is open.
  const [picked, setPicked] = useState<number | null>(null);
  const rollTimer = useRef<number | null>(null);
  const rollButtonRef = useRef<HTMLButtonElement>(null);
  const diceRef = useRef<HTMLDivElement>(null);

  useEffect(() => () => {
    if (rollTimer.current) window.clearTimeout(rollTimer.current);
  }, []);

  const setDice = (update: (prev: DieSides[]) => DieSides[]) => {
    setState((prev) => ({ ...prev, dice: update(prev.dice) }));
    setFaces(null);
  };

  const roll = () => {
    if (rolling) return;
    setPicked(null);
    const final = rollDice(dice);
    const record = () => setRolls((prev) => [{ id: createId(), dice: dice.map((sides, index) => ({ sides, value: final[index] })) }, ...prev].slice(0, HISTORY));
    const container = diceRef.current;
    const from = rollButtonRef.current?.getBoundingClientRect();
    if (prefersReducedMotion() || !container || !from) {
      setFaces(final);
      record();
      return;
    }
    setRolling(true);
    // Each die's number flickers while it tumbles and stops where it lands.
    const started = performance.now();
    const landsAt = dice.map((_, index) => index * THROW_STAGGER_MS + THROW_MS * LAND_AT);
    const tick = () => {
      const elapsed = performance.now() - started;
      setFaces(dice.map((sides, index) => (sides === 6 || sides === 4 || elapsed >= landsAt[index] ? final[index] : rollDie(sides))));
      if (elapsed < landsAt[landsAt.length - 1]) rollTimer.current = window.setTimeout(tick, ROLL_TICK_MS);
    };
    tick();
    void throwDice(container, from, dice, final).then(() => {
      if (rollTimer.current) window.clearTimeout(rollTimer.current);
      rollTimer.current = null;
      setFaces(final);
      setRolling(false);
      record();
    });
  };

  return {
    dice,
    faces,
    rolling,
    rolls,
    picked,
    setPicked,
    rollButtonRef,
    diceRef,
    roll,
    setDie: (index: number, sides: number) => {
      if (!isDieSides(sides)) return;
      setDice((prev) => prev.map((current, position) => (position === index ? sides : current)));
      setPicked(null);
    },
    addDie: () => setDice((prev) => (prev.length >= MAX_DICE ? prev : [...prev, prev[prev.length - 1] ?? 6])),
    removeDie: (index: number) => {
      setDice((prev) => (prev.length <= 1 ? prev : prev.filter((_, position) => position !== index)));
      setPicked(null);
    },
    applySet: (set: DieSides[]) => {
      setDice(() => [...set]);
      setPicked(null);
    },
    clear: () => {
      setRolls([]);
      setFaces(null);
    },
  };
};

// ---------- Coins ----------

export interface CoinFlip { id: string; coins: { type: string; side: CoinSide }[] }

export const useCoinTable = (coins: string[], setState: SetChanceState) => {
  const [flips, setFlips] = useState<CoinFlip[]>([]);
  // The faces showing now (null before the first flip, or after the table changes).
  const [sides, setSides] = useState<CoinSide[] | null>(null);
  const [flipping, setFlipping] = useState(false);
  // Per coin, the face showing when a flip starts; a coin turns edge-on twice
  // and shows the other face in between.
  const [flipFrom, setFlipFrom] = useState<CoinSide[]>([]);
  const [picked, setPicked] = useState<number | null>(null);
  const flipTimer = useRef<number | null>(null);

  useEffect(() => () => {
    if (flipTimer.current) window.clearTimeout(flipTimer.current);
  }, []);

  const setCoins = (update: (prev: string[]) => string[], keepFaces = false) => {
    setState((prev) => ({ ...prev, coins: update(prev.coins) }));
    if (!keepFaces) setSides(null);
  };

  const flip = () => {
    if (flipping) return;
    setPicked(null);
    const landed = flipCoins(coins.length);
    const land = () => {
      setSides(landed);
      setFlips((prev) => [{ id: createId(), coins: coins.map((type, index) => ({ type, side: landed[index] })) }, ...prev].slice(0, HISTORY));
      setFlipping(false);
      flipTimer.current = null;
    };
    if (prefersReducedMotion()) {
      land();
      return;
    }
    setFlipFrom(coins.map((_, index) => sides?.[index] ?? 'heads'));
    setSides(landed);
    setFlipping(true);
    flipTimer.current = window.setTimeout(land, FLIP_MS);
  };

  return {
    coins,
    sides,
    flipping,
    flipFrom,
    flips,
    picked,
    setPicked,
    flip,
    // Changing a coin's type keeps the face it shows.
    setCoin: (index: number, type: string) => {
      if (!isCoinType(type)) return;
      setCoins((prev) => prev.map((current, position) => (position === index ? type : current)), true);
      setPicked(null);
    },
    addCoin: () => setCoins((prev) => (prev.length >= MAX_COINS ? prev : [...prev, prev[prev.length - 1] ?? DEFAULT_COIN])),
    removeCoin: (index: number) => {
      setCoins((prev) => (prev.length <= 1 ? prev : prev.filter((_, position) => position !== index)));
      setPicked(null);
    },
    clear: () => {
      setFlips([]);
      setSides(null);
    },
  };
};

// ---------- Cards ----------

export const useCardTable = (jokers: boolean, setState: SetChanceState, active: boolean) => {
  const [deck, setDeck] = useState<PlayingCard[]>(() => shuffle(buildDeck(jokers)));
  // Every draw, newest first; the first is the hand on the table.
  const [draws, setDraws] = useState<PlayingCard[][]>([]);
  const [drawCount, setDrawCount] = useState(1);
  // The latest draw is dealt from the deck; set per draw, cleared on leaving the tab.
  const [deal, setDeal] = useState<{ id: string; origin: DealOrigin } | null>(null);
  const deckRef = useRef<HTMLDivElement>(null);
  const hand = draws[0] ?? [];

  useEffect(() => {
    if (!active) setDeal(null);
  }, [active]);

  return {
    deck,
    draws,
    hand,
    drawCount,
    deckSize: jokers ? 54 : 52,
    jokers,
    deal,
    deckRef,
    // The hand keeps a slot for every card of the next draw (or of the hand, if more).
    slotCount: Math.max(hand.length, Math.min(drawCount, deck.length), 1),
    fewer: () => setDrawCount((count) => Math.max(1, count - 1)),
    more: () => setDrawCount((count) => Math.min(MAX_CARDS, count + 1)),
    draw: () => {
      const { drawn, rest } = drawCards(deck, drawCount);
      if (!drawn.length) return;
      const origin = prefersReducedMotion() ? null : dealOriginOf(deckRef.current);
      setDeal(origin ? { id: drawn[0].id, origin } : null);
      setDraws((prev) => [drawn, ...prev].slice(0, HISTORY));
      setDeck(rest);
    },
    shuffleDeck: () => {
      setDeck(shuffle(buildDeck(jokers)));
      setDraws((prev) => (prev.length ? [[], ...prev.filter((cards) => cards.length)] : prev));
    },
    // Jokers change the deck itself, so switching them deals a fresh one.
    setJokers: (next: boolean) => {
      setState((prev) => ({ ...prev, jokers: next }));
      setDeck(shuffle(buildDeck(next)));
      setDraws((prev) => (prev.length ? [[], ...prev.filter((cards) => cards.length)] : prev));
    },
    clear: () => setDraws([]),
  };
};

// ---------- Tarot ----------

export interface TarotReading { id: string; draws: TarotDraw[] }

export const useTarotTable = (active: boolean) => {
  const [spread, setSpread] = useState<1 | 3>(1);
  const [readings, setReadings] = useState<TarotReading[]>([]);
  // Where the deck lay when the cards were drawn: they are dealt from there.
  const [dealOrigin, setDealOrigin] = useState<DealOrigin | null>(null);
  // Whether the latest reading plays its deal; a reading already watched does not.
  const [dealing, setDealing] = useState(false);
  const [revealedCount, setRevealedCount] = useState(0);
  // The Ask AI line fades in a beat after a deal ends, not on every visit.
  const [askFresh, setAskFresh] = useState(false);
  const paneRef = useRef<HTMLElement>(null);
  const reading = readings[0];

  // Leaving the tab mid-deal finishes it: the cards come back as they ended.
  useEffect(() => {
    if (active) return;
    setDealing(false);
    setAskFresh(false);
  }, [active]);

  const readingDone = Boolean(reading) && (!dealing || revealedCount >= reading.draws.length);

  // Once every card has turned and typed, coming back to the tab shows the
  // reading as it ended instead of dealing it again.
  useEffect(() => {
    if (dealing && readingDone) {
      setDealing(false);
      setAskFresh(true);
    }
  }, [dealing, readingDone]);

  return {
    spread,
    setSpread,
    reading,
    readings,
    dealOrigin,
    dealing,
    readingDone,
    askFresh,
    paneRef,
    cardRevealed: useCallback(() => setRevealedCount((count) => count + 1), []),
    draw: () => {
      // The deck: the face-down card before the first draw, else the middle
      // card of the reading on the table.
      const pane = paneRef.current;
      const arts = pane ? Array.from(pane.querySelectorAll<HTMLElement>('.chance-tarot-art')) : [];
      const deck = pane?.querySelector<HTMLElement>('.chance-tarot-empty-back') ?? arts[Math.floor(arts.length / 2)];
      setDealOrigin(dealOriginOf(deck));
      setDealing(!prefersReducedMotion());
      setRevealedCount(0);
      setAskFresh(false);
      setReadings((prev) => [{ id: createId(), draws: drawTarot(spread) }, ...prev].slice(0, HISTORY));
    },
    clear: () => {
      setReadings([]);
      setDealing(false);
      setAskFresh(false);
    },
  };
};

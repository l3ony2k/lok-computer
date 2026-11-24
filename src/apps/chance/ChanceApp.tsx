import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { WindowLayout } from '@/components/window/WindowLayout';
import { RetroButton } from '@/components/ui/RetroButton';
import { Select } from '@/components/ui/Select';
import { usePersistedState } from '@/hooks/useStorage';
import { useApplicationLauncher } from '@/hooks/useApplicationLauncher';
import {
  CHANCE_TABS,
  DEFAULT_CHANCE_STATE,
  DIE_SIDES,
  MAX_CARDS,
  MAX_DICE,
  SPREAD_POSITIONS,
  buildDeck,
  drawCards,
  drawTarot,
  flipCoins,
  isChanceTab,
  isDieSides,
  normalizeChanceState,
  rollDice,
  rollDie,
  shuffle,
  tarotQuestion,
  type ChanceState,
  type ChanceTab,
  type CoinSide,
  type PlayingCard,
  type TarotDraw,
} from './random';
import { TAROT_IMAGE_SIZE } from './tarot';
import { TAROT_BACK } from './tarotImages';
import { TarotCardView } from './TarotCardView';
import { DieView } from './DieView';
import { LAND_AT, THROW_MS, THROW_STAGGER_MS, throwDice } from './dieThrow';
import { dealOriginOf, useDealTravel, type DealOrigin } from './deal';
import { COIN_IMAGE_SIZE, COIN_TYPES, DEFAULT_COIN, MAX_COINS, coinType, isCoinType } from './coins';
import { coinFace } from './coinImages';
import './chance.css';

export interface ChanceAppProps {
  /** Tab to open; the share link carries it as `?tab=`. */
  initialTab?: string;
  onPropsChange?: (props: Record<string, unknown>) => void;
}

const STORAGE_KEY = 'app:chance';
/** Earlier rolls kept on the table, newest first. */
const ROLL_HISTORY = 24;
const ROLL_TICK_MS = 60;
const FLIP_MS = 500;
/** Earlier flips kept on the table, newest first. */
const COIN_HISTORY = 24;
const COIN_OPTIONS = COIN_TYPES.map((type) => ({ value: type.id, label: type.label }));
const DIE_OPTIONS = DIE_SIDES.map((sides) => ({ value: String(sides), label: `d${sides}` }));
/** Catalog identity of Ask AI (predates its rename). */
const ASK_AI_TYPE = 'AI Talk';

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** A playing card: ivory face, black or red ink in every theme (a card is a card). */
const PlayingCardView = ({ card, small }: { card: PlayingCard; small?: boolean }) => (
  <div
    className="chance-card"
    data-red={card.red || undefined}
    data-small={small || undefined}
    data-joker={card.joker || undefined}
    role="img"
    aria-label={card.joker ? `${card.red ? 'Red' : 'Black'} joker` : `${card.rank} of ${card.suit}`}
  >
    <span className="chance-card-corner" aria-hidden="true">{card.joker ? card.symbol : <>{card.rank}<br />{card.symbol}</>}</span>
    {card.joker ? (
      // A joker's face is the word itself, large, in its ink: red or black.
      <span className="chance-card-joker" aria-hidden="true">JOKER</span>
    ) : (
      <span className="chance-card-pip" aria-hidden="true">{card.symbol}</span>
    )}
    {!small && <span className="chance-card-corner chance-card-corner-bottom" aria-hidden="true">{card.joker ? card.symbol : <>{card.rank}<br />{card.symbol}</>}</span>}
  </div>
);

/**
 * A card from the latest draw, dealt: it leaves the deck face down, travels
 * to its place while turning over (CSS, on data-face-up), staggered by its
 * place in the hand. Without `origin` it simply lies face up.
 */
const DEAL_STAGGER_MS = 90;

const DealtCard = ({ card, index, origin }: { card: PlayingCard; index: number; origin: DealOrigin | null }) => {
  const ref = useRef<HTMLDivElement>(null);
  const animate = origin !== null;
  const delay = index * DEAL_STAGGER_MS;
  const [faceUp, setFaceUp] = useState(!animate);
  useDealTravel(ref, origin, delay, animate);
  // Turn over a frame after mounting face down, so the turn always animates.
  useEffect(() => {
    if (faceUp) return;
    let frame = requestAnimationFrame(() => { frame = requestAnimationFrame(() => setFaceUp(true)); });
    return () => cancelAnimationFrame(frame);
  }, [faceUp]);
  return (
    <div
      ref={ref}
      className="chance-dealt"
      data-face-up={faceUp || undefined}
      style={{ '--chance-deal-delay': `${animate ? delay : 0}ms` } as React.CSSProperties}
    >
      <div className="chance-card chance-card-back chance-dealt-back" aria-hidden="true" />
      <PlayingCardView card={card} />
    </div>
  );
};

/** The deck, face down, as a stack that thins as it is dealt (one layer per ~9 cards). */
const deckStackShadow = (remaining: number) => {
  const layers = Math.min(6, Math.ceil(remaining / 9) - 1);
  const shadows: string[] = [];
  for (let layer = 1; layer <= layers; layer++) {
    const offset = `${-layer}px ${layer * 2}px`;
    shadows.push(`${offset} 0 -1px #fbf9f2`, `${offset} 0 0 #2a2a2a`);
  }
  return shadows.length ? shadows.join(', ') : undefined;
};

/** One roll of every die on the table. */
interface DiceRoll { id: string; dice: { sides: number; value: number }[] }

/** One flip of every coin on the table. */
interface CoinFlip { id: string; coins: { type: string; side: CoinSide }[] }

const createId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/**
 * Dice, a coin, playing cards and tarot. Everything comes from Math.random,
 * which the footer says out loud: fine for games, never for secrets.
 */
export const ChanceApp: React.FC<ChanceAppProps> = ({ initialTab, onPropsChange }) => {
  const openApplication = useApplicationLauncher();
  const [state, setState] = usePersistedState<ChanceState>({
    key: STORAGE_KEY,
    defaultValue: isChanceTab(initialTab) ? { ...DEFAULT_CHANCE_STATE, tab: initialTab } : DEFAULT_CHANCE_STATE,
    normalize: (stored) => {
      const normalized = normalizeChanceState(stored);
      // A deep link's tab wins over the remembered one.
      return isChanceTab(initialTab) ? { ...normalized, tab: initialTab } : normalized;
    },
    debounceMs: 200,
  });

  useEffect(() => {
    onPropsChange?.({ initialTab: state.tab });
  }, [onPropsChange, state.tab]);

  const setTab = (tab: ChanceTab) => setState((prev) => ({ ...prev, tab }));

  // Dice
  const [faces, setFaces] = useState<number[] | null>(null);
  const [rolling, setRolling] = useState(false);
  // Every roll stays on the table: the latest large, earlier ones below.
  const [rolls, setRolls] = useState<DiceRoll[]>([]);
  const rollTimer = useRef<number | null>(null);
  const rollButtonRef = useRef<HTMLButtonElement>(null);
  const diceRef = useRef<HTMLDivElement>(null);

  useEffect(() => () => {
    if (rollTimer.current) window.clearTimeout(rollTimer.current);
  }, []);

  const roll = () => {
    if (rolling) return;
    const dice = state.dice;
    const final = rollDice(dice);
    const record = () => setRolls((prev) => [{ id: createId(), dice: dice.map((sides, index) => ({ sides, value: final[index] })) }, ...prev].slice(0, ROLL_HISTORY + 1));
    const container = diceRef.current;
    const from = rollButtonRef.current?.getBoundingClientRect();
    if (reducedMotion() || !container || !from) {
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
      setFaces(dice.map((sides, index) => (sides === 6 || elapsed >= landsAt[index] ? final[index] : rollDie(sides))));
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

  const clearRolls = () => {
    setRolls([]);
    setFaces(null);
  };
  const earlierRolls = rolls.slice(1);

  const setDie = (index: number, sides: number) => {
    if (!isDieSides(sides)) return;
    setState((prev) => ({ ...prev, dice: prev.dice.map((current, position) => (position === index ? sides : current)) }));
    setFaces(null);
  };

  const addDie = () => {
    setState((prev) => (prev.dice.length >= MAX_DICE ? prev : { ...prev, dice: [...prev.dice, prev.dice[prev.dice.length - 1] ?? 6] }));
    setFaces(null);
  };

  const removeDie = (index: number) => {
    setState((prev) => (prev.dice.length <= 1 ? prev : { ...prev, dice: prev.dice.filter((_, position) => position !== index) }));
    setFaces(null);
  };

  // Coins: every coin on the table flips at once. The latest flip lies large;
  // earlier ones stay below in rows of small coins, like the cards.
  const [coinFlips, setCoinFlips] = useState<CoinFlip[]>([]);
  // The faces showing now (null before the first flip, or after the table changes).
  const [coinSides, setCoinSides] = useState<CoinSide[] | null>(null);
  const [flipping, setFlipping] = useState(false);
  // Per coin, the face showing when a flip starts and the one it lands on; a
  // coin turns edge-on twice and shows the other face in between.
  const [flipFrom, setFlipFrom] = useState<CoinSide[]>([]);
  const flipTimer = useRef<number | null>(null);

  useEffect(() => () => {
    if (flipTimer.current) window.clearTimeout(flipTimer.current);
  }, []);

  const flip = () => {
    if (flipping) return;
    const coins = state.coins;
    const sides = flipCoins(coins.length);
    const land = () => {
      setCoinSides(sides);
      setCoinFlips((prev) => [{ id: createId(), coins: coins.map((type, index) => ({ type, side: sides[index] })) }, ...prev].slice(0, COIN_HISTORY + 1));
      setFlipping(false);
      flipTimer.current = null;
    };
    if (reducedMotion()) {
      land();
      return;
    }
    setFlipFrom(coins.map((_, index) => coinSides?.[index] ?? 'heads'));
    setCoinSides(sides);
    setFlipping(true);
    flipTimer.current = window.setTimeout(land, FLIP_MS);
  };

  const setCoin = (index: number, type: string) => {
    if (!isCoinType(type)) return;
    setState((prev) => ({ ...prev, coins: prev.coins.map((current, position) => (position === index ? type : current)) }));
  };

  const addCoin = () => {
    setState((prev) => (prev.coins.length >= MAX_COINS ? prev : { ...prev, coins: [...prev.coins, prev.coins[prev.coins.length - 1] ?? DEFAULT_COIN] }));
    setCoinSides(null);
  };

  const removeCoin = (index: number) => {
    setState((prev) => (prev.coins.length <= 1 ? prev : { ...prev, coins: prev.coins.filter((_, position) => position !== index) }));
    setCoinSides(null);
  };

  const clearCoins = () => {
    setCoinFlips([]);
    setCoinSides(null);
  };

  const earlierFlips = coinFlips.slice(1);
  const allFlipped = coinFlips.flatMap((entry) => entry.coins);
  const headsSoFar = allFlipped.filter((coin) => coin.side === 'heads').length;
  const shownHeads = coinSides?.filter((side) => side === 'heads').length ?? 0;

  // Cards: every draw stays on the table, the latest one large and the earlier
  // ones in a strip below it, until Clear or a fresh deck.
  const [deck, setDeck] = useState<PlayingCard[]>(() => shuffle(buildDeck(state.jokers)));
  const [draws, setDraws] = useState<PlayingCard[][]>([]);
  const [drawCount, setDrawCount] = useState(1);
  const hand = draws[0] ?? [];
  const earlier = draws.slice(1);
  const deckSize = state.jokers ? 54 : 52;
  const deckRef = useRef<HTMLDivElement>(null);
  const slotCount = Math.max(hand.length, Math.min(drawCount, deck.length), 1);
  const tableRef = useRef<HTMLDivElement>(null);
  // How many cards fit in a row beside the deck, so deck and hand stay one
  // centred group in any window instead of a full-width hand.
  const [fitCols, setFitCols] = useState(6);
  useEffect(() => {
    const table = tableRef.current;
    const pane = table?.parentElement;
    if (!table || !pane || typeof ResizeObserver !== 'function') return;
    const measure = () => {
      const card = deckRef.current?.getBoundingClientRect().width ?? 0;
      if (!card) return;
      const style = getComputedStyle(table);
      const stacked = style.flexDirection === 'column';
      const paneStyle = getComputedStyle(pane);
      const inner = pane.clientWidth - parseFloat(paneStyle.paddingLeft) - parseFloat(paneStyle.paddingRight);
      const room = inner - (stacked ? 0 : card + parseFloat(style.columnGap || '0'));
      const gap = card * 0.14;
      setFitCols(Math.max(1, Math.min(6, Math.floor((room + gap) / (card + gap)))));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(pane);
    return () => observer.disconnect();
  }, [state.tab]);
  // The latest draw is dealt from the deck; set per draw, cleared on leaving the tab.
  const [cardDeal, setCardDeal] = useState<{ id: string; origin: DealOrigin } | null>(null);

  // Jokers change the deck itself, so toggling them deals a fresh one.
  const setJokers = (jokers: boolean) => {
    setState((prev) => ({ ...prev, jokers }));
    setDeck(shuffle(buildDeck(jokers)));
    setDraws([]);
  };

  const draw = () => {
    const { drawn, rest } = drawCards(deck, drawCount);
    if (!drawn.length) return;
    const origin = reducedMotion() ? null : dealOriginOf(deckRef.current);
    setCardDeal(origin ? { id: drawn[0].id, origin } : null);
    setDraws((prev) => [drawn, ...prev]);
    setDeck(rest);
  };

  const clearTable = () => setDraws([]);

  const reshuffle = () => {
    setDeck(shuffle(buildDeck(state.jokers)));
    setDraws([]);
  };

  // Tarot
  const [reading, setReading] = useState<TarotDraw[]>([]);
  // Keys each reading's cards, so drawing again deals fresh cards face down.
  const [readingId, setReadingId] = useState(0);
  // Where the deck lay when the cards were drawn: they are dealt from there.
  const [dealOrigin, setDealOrigin] = useState<DealOrigin | null>(null);
  // Whether this reading plays its deal; a reading already watched does not.
  const [dealing, setDealing] = useState(false);
  const [revealedCount, setRevealedCount] = useState(0);
  // The Ask AI line fades in a beat after a deal ends, not on every visit.
  const [askFresh, setAskFresh] = useState(false);
  const tarotPaneRef = useRef<HTMLElement>(null);

  const drawReading = (count: 1 | 3) => {
    // The deck: the face-down card before the first draw, else the middle
    // card of the reading on the table.
    const pane = tarotPaneRef.current;
    const arts = pane ? Array.from(pane.querySelectorAll<HTMLElement>('.chance-tarot-art')) : [];
    const deck = pane?.querySelector<HTMLElement>('.chance-tarot-empty-back') ?? arts[Math.floor(arts.length / 2)];
    setDealOrigin(dealOriginOf(deck));
    setDealing(!reducedMotion());
    setRevealedCount(0);
    setAskFresh(false);
    setReading(drawTarot(count));
    setReadingId((id) => id + 1);
  };

  // Leaving the tab mid-deal finishes it: the cards come back as they ended.
  useEffect(() => {
    if (state.tab !== 'tarot') {
      setDealing(false);
      setAskFresh(false);
    }
    if (state.tab !== 'cards') setCardDeal(null);
  }, [state.tab]);

  const cardRevealed = useCallback(() => setRevealedCount((count) => count + 1), []);
  const readingDone = reading.length > 0 && (!dealing || revealedCount >= reading.length);

  // Once every card has turned and typed, coming back to the tab shows the
  // reading as it ended instead of dealing it again.
  useEffect(() => {
    if (dealing && readingDone) {
      setDealing(false);
      setAskFresh(true);
    }
  }, [dealing, readingDone]);

  const askAi = useCallback(() => {
    if (!reading.length) return;
    openApplication(ASK_AI_TYPE, { props: { ask: { id: createId(), question: tarotQuestion(reading) } } });
  }, [openApplication, reading]);


  return (
    <WindowLayout
      className="chance-window"
      hasPadding={false}
      toolbar={
        <div className="app-toolbar-row app-tab-bar sticky top-0" role="tablist" aria-label="Chance">
          {CHANCE_TABS.map((tab) => (
            <RetroButton
              key={tab.id}
              size="sm"
              role="tab"
              aria-selected={state.tab === tab.id}
              active={state.tab === tab.id}
              onClick={() => setTab(tab.id)}
            >
              {tab.label}
            </RetroButton>
          ))}
        </div>
      }
      footer={
        <div className="app-footer-row chance-footer">
          <span>Chance is an illusion: these results come from the browser's pseudo-random generator. Fine for games, never for keys or secrets.</span>
        </div>
      }
    >
      {state.tab === 'dice' && (
        <section className="chance-pane chance-pane-cards" aria-label="Dice">
          <div className="chance-actions">
            <RetroButton ref={rollButtonRef} variant="primary" onClick={roll} disabled={rolling}>Roll</RetroButton>
            {state.dice.map((sides, index) => (
              <div className="chance-die-config app-joined-control" key={index}>
                <Select
                  className="search-input chance-die-select"
                  value={String(sides)}
                  aria-label={`Die ${index + 1}`}
                  onValueChange={(next) => setDie(index, Number(next))}
                  items={DIE_OPTIONS}
                />
                <RetroButton size="icon" aria-label={`Remove die ${index + 1}`} disabled={state.dice.length <= 1} onClick={() => removeDie(index)}>
                  <Minus className="w-3 h-3" />
                </RetroButton>
              </div>
            ))}
            <RetroButton size="sm" onClick={addDie} disabled={state.dice.length >= MAX_DICE} title={`Up to ${MAX_DICE} dice`}>
              <Plus className="w-3 h-3" />Add die
            </RetroButton>
            <RetroButton size="sm" onClick={clearRolls} disabled={rolls.length === 0}>Clear</RetroButton>
          </div>

          <div ref={diceRef} className="chance-dice-results" data-idle={faces ? undefined : ''} aria-busy={rolling}>
            {state.dice.map((sides, index) => (
              <DieView sides={sides} value={faces?.[index] ?? null} rolling={rolling} key={index} />
            ))}
          </div>

          <p className="chance-readout" aria-live="polite">
            {rolling ? 'Rolling…' : faces ? (
              <>
                <span>{faces.length === 1 ? 'Rolled' : 'Total'}</span>
                <strong className="chance-readout-value">{faces.reduce((sum, value) => sum + value, 0)}</strong>
              </>
            ) : 'Choose your dice, then roll.'}
          </p>

          {earlierRolls.length > 0 && (
            <div className="chance-history" aria-label="Earlier rolls">
              <span className="chance-history-label">Earlier rolls</span>
              <div className="chance-history-draws">
                {earlierRolls.map((entry) => (
                  <div className="chance-history-draw chance-roll-marks" key={entry.id}>
                    {entry.dice.map((die, index) => (
                      <span className="chance-roll-mark" data-sides={die.sides} title={`d${die.sides}`} key={index}>{die.value}</span>
                    ))}
                    {entry.dice.length > 1 && (
                      <span className="chance-roll-total">= {entry.dice.reduce((sum, die) => sum + die.value, 0)}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {state.tab === 'coin' && (
        <section className="chance-pane chance-pane-cards" aria-label="Coins">
          <div className="chance-actions">
            <RetroButton variant="primary" onClick={flip} disabled={flipping}>Flip</RetroButton>
            {state.coins.map((type, index) => (
              <div className="chance-die-config app-joined-control" key={index}>
                <Select
                  className="search-input chance-coin-select"
                  value={type}
                  aria-label={`Coin ${index + 1}`}
                  onValueChange={(next) => setCoin(index, next)}
                  items={COIN_OPTIONS}
                />
                <RetroButton size="icon" aria-label={`Remove coin ${index + 1}`} disabled={state.coins.length <= 1} onClick={() => removeCoin(index)}>
                  <Minus className="w-3 h-3" />
                </RetroButton>
              </div>
            ))}
            <RetroButton size="sm" onClick={addCoin} disabled={state.coins.length >= MAX_COINS} title={`Up to ${MAX_COINS} coins`}>
              <Plus className="w-3 h-3" />Add coin
            </RetroButton>
            <RetroButton size="sm" onClick={clearCoins} disabled={coinFlips.length === 0}>Clear</RetroButton>
          </div>

          <div className="chance-coins" data-count={state.coins.length > 4 ? 'many' : state.coins.length > 1 ? 'few' : 'one'} aria-hidden="true">
            {state.coins.map((type, index) => {
              const face = coinSides?.[index] ?? 'heads';
              const from = flipFrom[index] ?? 'heads';
              return (
                <div
                  className="chance-coin"
                  data-face={face}
                  data-flipping={flipping || undefined}
                  data-turns={flipping ? (from === face ? 'twice' : 'once') : undefined}
                  key={index}
                >
                  {(['heads', 'tails'] as const).map((side) => (
                    <img
                      key={side}
                      className="chance-coin-image"
                      src={coinFace(type, side)}
                      alt=""
                      width={COIN_IMAGE_SIZE}
                      height={COIN_IMAGE_SIZE}
                      draggable={false}
                      data-side={side}
                      data-start={flipping && from === side ? '' : undefined}
                    />
                  ))}
                </div>
              );
            })}
          </div>

          <p className="chance-readout" aria-live="polite">
            {flipping ? 'Flipping…' : coinSides ? (
              coinSides.length === 1 ? (
                <strong className="chance-readout-value">{coinSides[0] === 'heads' ? 'Heads' : 'Tails'}</strong>
              ) : (
                <strong className="chance-readout-value">
                  {shownHeads} {shownHeads === 1 ? 'head' : 'heads'} · {coinSides.length - shownHeads} {coinSides.length - shownHeads === 1 ? 'tail' : 'tails'}
                </strong>
              )
            ) : state.coins.length === 1 ? 'Heads or tails?' : `${state.coins.length} coins. Flip them all at once.`}
          </p>

          {earlierFlips.length > 0 && (
            <div className="chance-history" aria-label="Earlier flips">
              <span className="chance-history-label">Earlier flips · {headsSoFar} heads and {allFlipped.length - headsSoFar} tails in all</span>
              <div className="chance-history-draws">
                {earlierFlips.map((entry) => (
                  <ol className="chance-history-draw chance-coin-marks" key={entry.id}>
                    {entry.coins.map((coin, index) => (
                      <li key={index} data-side={coin.side} title={coinType(coin.type).label}>
                        {coin.side === 'heads' ? 'H' : 'T'}
                      </li>
                    ))}
                  </ol>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {state.tab === 'cards' && (
        <section className="chance-pane chance-pane-cards" aria-label="Cards">
          <div className="chance-actions">
            <div className="app-joined-control chance-count">
              <RetroButton size="icon" aria-label="Draw fewer cards" onClick={() => setDrawCount((count) => Math.max(1, count - 1))} disabled={drawCount <= 1}>
                <Minus className="w-3 h-3" />
              </RetroButton>
              <span className="chance-count-value" aria-live="polite">{drawCount}</span>
              <RetroButton size="icon" aria-label="Draw more cards" onClick={() => setDrawCount((count) => Math.min(MAX_CARDS, count + 1))} disabled={drawCount >= MAX_CARDS}>
                <Plus className="w-3 h-3" />
              </RetroButton>
            </div>
            <RetroButton variant="primary" onClick={draw} disabled={deck.length === 0}>
              Draw {drawCount === 1 ? 'a card' : `${drawCount} cards`}
            </RetroButton>
            <RetroButton size="sm" onClick={reshuffle}>Shuffle</RetroButton>
            <RetroButton size="sm" onClick={clearTable} disabled={draws.length === 0}>Clear</RetroButton>
            <label className="chance-toggle">
              <input type="checkbox" checked={state.jokers} onChange={(event) => setJokers(event.target.checked)} />
              <span>Jokers</span>
            </label>
          </div>

          <div ref={tableRef} className="chance-table">
            <div
              ref={deckRef}
              className="chance-card chance-card-back chance-deck"
              data-empty={deck.length === 0 || undefined}
              style={{ boxShadow: deckStackShadow(deck.length) }}
              aria-hidden="true"
            />
            {/*
              The hand is a row of dashed slots, as many as the next draw needs
              (or the cards on the table, if more): dealt cards land on them,
              the rest stay outlined, and the deck never shifts as it deals.
            */}
            <div
              className="chance-hand"
              aria-live="polite"
              aria-label={hand.length ? 'Latest draw' : undefined}
              style={{ '--hand-cols': Math.min(fitCols, slotCount) } as React.CSSProperties}
            >
              {Array.from({ length: slotCount }, (_, index) => (
                <div className="chance-card-slot" key={index}>
                  {hand[index] && (
                    <DealtCard
                      card={hand[index]}
                      index={index}
                      origin={cardDeal?.id === hand[0].id ? cardDeal.origin : null}
                      key={hand[index].id}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          <p className="chance-readout">
            {deck.length === 0
              ? 'The deck is empty. Shuffle for a fresh one.'
              : draws.length === 0 && deck.length === deckSize
                ? `${deckSize} cards, shuffled. Draw to deal from the top.`
                : draws.length === 0
                  ? `The table is clear, ${deck.length} left. Draw again, or shuffle for a fresh deck.`
                  : `${deck.length} of ${deckSize} left`}
          </p>

          {earlier.length > 0 && (
            <div className="chance-history" aria-label="Earlier draws">
              <span className="chance-history-label">Earlier draws</span>
              <div className="chance-history-draws">
                {earlier.map((cards) => (
                  <div className="chance-history-draw" key={cards[0].id}>
                    {cards.map((card) => <PlayingCardView card={card} small key={card.id} />)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {state.tab === 'tarot' && (
        <section ref={tarotPaneRef} className="chance-pane" aria-label="Tarot">
          <div className="chance-actions">
            <RetroButton variant="primary" onClick={() => drawReading(1)}>Draw one card</RetroButton>
            <RetroButton onClick={() => drawReading(3)}>Draw three</RetroButton>
          </div>

          {reading.length === 0 && (
            <div className="chance-tarot-empty">
              {TAROT_BACK && (
                <img className="chance-tarot-empty-back" src={TAROT_BACK} alt="" decoding="async" draggable={false} {...TAROT_IMAGE_SIZE} />
              )}
              <p className="chance-hint">Draw one card for a quick answer, or three to read past, present and future.</p>
            </div>
          )}

          {reading.length > 0 && (
            <div className="chance-reading" data-spread={reading.length} aria-live="polite" aria-busy={!readingDone || undefined}>
              {reading.map((draw, index) => (
                <TarotCardView
                  key={`${readingId}-${draw.card.id}`}
                  draw={draw}
                  index={index}
                  position={reading.length === 3 ? SPREAD_POSITIONS[index] : undefined}
                  animate={dealing}
                  origin={dealOrigin}
                  onRevealed={cardRevealed}
                />
              ))}
            </div>
          )}

          {readingDone && (
            <p className="chance-ask-line" data-fresh={askFresh || undefined}>
              Not sure what it means?{' '}
              <button type="button" className="chance-ask-link" onClick={askAi}>
                <span className="chance-ask-link-text">Ask AI to read it</span> →
              </button>
            </p>
          )}
        </section>
      )}
    </WindowLayout>
  );
};

export default ChanceApp;

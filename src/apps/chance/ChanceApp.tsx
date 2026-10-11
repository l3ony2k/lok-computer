import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Minus, Plus, Sparkles } from 'lucide-react';
import { WindowLayout } from '@/components/window/WindowLayout';
import { RetroButton } from '@/components/ui/RetroButton';
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
  flipCoin,
  isChanceTab,
  isDieSides,
  normalizeChanceState,
  rollDice,
  shuffle,
  tarotQuestion,
  type ChanceState,
  type ChanceTab,
  type CoinSide,
  type PlayingCard,
  type TarotDraw,
} from './random';
import { arcanaLabel } from './tarot';
import './chance.css';

export interface ChanceAppProps {
  /** Tab to open; the share link carries it as `?tab=`. */
  initialTab?: string;
  onPropsChange?: (props: Record<string, unknown>) => void;
}

const STORAGE_KEY = 'app:chance';
const ROLL_MS = 450;
const ROLL_TICK_MS = 60;
const FLIP_MS = 500;
const COIN_HISTORY = 12;
/** Catalog identity of Ask AI (predates its rename). */
const ASK_AI_TYPE = 'AI Talk';

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
  const rollTimer = useRef<number | null>(null);

  useEffect(() => () => {
    if (rollTimer.current) window.clearTimeout(rollTimer.current);
  }, []);

  const roll = () => {
    if (rolling) return;
    const final = rollDice(state.dice);
    if (reducedMotion()) {
      setFaces(final);
      return;
    }
    setRolling(true);
    const started = performance.now();
    const tick = () => {
      if (performance.now() - started >= ROLL_MS) {
        setFaces(final);
        setRolling(false);
        rollTimer.current = null;
        return;
      }
      setFaces(rollDice(state.dice));
      rollTimer.current = window.setTimeout(tick, ROLL_TICK_MS);
    };
    tick();
  };

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

  // Coin
  const [coin, setCoin] = useState<CoinSide | null>(null);
  const [flipping, setFlipping] = useState(false);
  const [coinHistory, setCoinHistory] = useState<CoinSide[]>([]);
  const flipTimer = useRef<number | null>(null);

  useEffect(() => () => {
    if (flipTimer.current) window.clearTimeout(flipTimer.current);
  }, []);

  const flip = () => {
    if (flipping) return;
    const side = flipCoin();
    const land = () => {
      setCoin(side);
      setCoinHistory((history) => [side, ...history].slice(0, COIN_HISTORY));
      setFlipping(false);
      flipTimer.current = null;
    };
    if (reducedMotion()) {
      land();
      return;
    }
    setFlipping(true);
    flipTimer.current = window.setTimeout(land, FLIP_MS);
  };

  // Cards
  const [deck, setDeck] = useState<PlayingCard[]>(() => shuffle(buildDeck()));
  const [hand, setHand] = useState<PlayingCard[]>([]);
  const [drawCount, setDrawCount] = useState(1);

  const draw = () => {
    const { drawn, rest } = drawCards(deck, drawCount);
    setHand(drawn);
    setDeck(rest);
  };

  const reshuffle = () => {
    setDeck(shuffle(buildDeck()));
    setHand([]);
  };

  // Tarot
  const [reading, setReading] = useState<TarotDraw[]>([]);

  const askAi = useCallback(() => {
    if (!reading.length) return;
    openApplication(ASK_AI_TYPE, { props: { ask: { id: createId(), question: tarotQuestion(reading) } } });
  }, [openApplication, reading]);

  const heads = coinHistory.filter((side) => side === 'heads').length;

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
        <section className="chance-pane" aria-label="Dice">
          <div className="chance-dice-config">
            {state.dice.map((sides, index) => (
              <div className="chance-die-config app-joined-control" key={index}>
                <select
                  className="search-input chance-die-select"
                  value={sides}
                  aria-label={`Die ${index + 1}`}
                  onChange={(event) => setDie(index, Number(event.target.value))}
                >
                  {DIE_SIDES.map((option) => <option key={option} value={option}>d{option}</option>)}
                </select>
                <RetroButton size="icon" aria-label={`Remove die ${index + 1}`} disabled={state.dice.length <= 1} onClick={() => removeDie(index)}>
                  <Minus className="w-3 h-3" />
                </RetroButton>
              </div>
            ))}
            <RetroButton size="sm" onClick={addDie} disabled={state.dice.length >= MAX_DICE} title={`Up to ${MAX_DICE} dice`}>
              <Plus className="w-3 h-3" /> Add die
            </RetroButton>
          </div>

          <div className="chance-dice-results" aria-live="polite" aria-busy={rolling}>
            {(faces ?? state.dice.map(() => null)).map((value, index) => (
              <div className="chance-die" data-rolling={rolling || undefined} data-sides={state.dice[index]} key={index}>
                <span className="chance-die-value">{value ?? '·'}</span>
                <span className="chance-die-sides">d{state.dice[index]}</span>
              </div>
            ))}
          </div>

          <div className="chance-actions">
            <RetroButton variant="primary" onClick={roll} disabled={rolling}>Roll</RetroButton>
            {faces && !rolling && (
              <span className="chance-total">Total <strong>{faces.reduce((sum, value) => sum + value, 0)}</strong></span>
            )}
          </div>
        </section>
      )}

      {state.tab === 'coin' && (
        <section className="chance-pane" aria-label="Coin">
          <div className="chance-coin" data-side={coin ?? undefined} data-flipping={flipping || undefined} aria-live="polite">
            <span className="chance-coin-face">{flipping ? '' : coin === 'heads' ? 'H' : coin === 'tails' ? 'T' : '?'}</span>
            <span className="chance-coin-label">{flipping ? 'Flipping…' : coin === 'heads' ? 'Heads' : coin === 'tails' ? 'Tails' : 'Flip the coin'}</span>
          </div>
          <div className="chance-actions">
            <RetroButton variant="primary" onClick={flip} disabled={flipping}>Flip</RetroButton>
            {coinHistory.length > 0 && (
              <span className="chance-total">{heads} heads · {coinHistory.length - heads} tails</span>
            )}
          </div>
          {coinHistory.length > 0 && (
            <ol className="chance-coin-history" aria-label="Recent flips">
              {coinHistory.map((side, index) => (
                <li key={`${index}-${side}`} data-side={side}>{side === 'heads' ? 'H' : 'T'}</li>
              ))}
            </ol>
          )}
        </section>
      )}

      {state.tab === 'cards' && (
        <section className="chance-pane" aria-label="Cards">
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
            <span className="chance-total">{deck.length} left</span>
          </div>

          {hand.length > 0 && (
            <div className="chance-hand" aria-live="polite">
              {hand.map((card) => (
                <div className="chance-card" data-red={card.red || undefined} key={card.id} aria-label={`${card.rank} of ${card.suit}`}>
                  <span className="chance-card-corner">{card.rank}<br />{card.symbol}</span>
                  <span className="chance-card-pip" aria-hidden="true">{card.symbol}</span>
                  <span className="chance-card-corner chance-card-corner-bottom" aria-hidden="true">{card.rank}<br />{card.symbol}</span>
                </div>
              ))}
            </div>
          )}
          {hand.length === 0 && deck.length < 52 && (
            <p className="chance-hint">The hand is empty. Draw again, or shuffle to start over.</p>
          )}
        </section>
      )}

      {state.tab === 'tarot' && (
        <section className="chance-pane" aria-label="Tarot">
          <div className="chance-actions">
            <RetroButton variant="primary" onClick={() => setReading(drawTarot(1))}>Draw one card</RetroButton>
            <RetroButton onClick={() => setReading(drawTarot(3))}>Draw three</RetroButton>
          </div>

          {reading.length > 0 && (
            <div className="chance-reading" data-spread={reading.length} aria-live="polite">
              {reading.map(({ card, reversed }, index) => (
                <article className="chance-tarot" data-reversed={reversed || undefined} key={card.id}>
                  {reading.length === 3 && <span className="chance-tarot-position">{SPREAD_POSITIONS[index]}</span>}
                  <span className="chance-tarot-arcana">{card.label} · {arcanaLabel(card.arcana)}</span>
                  <h3 className="chance-tarot-name">{card.name}</h3>
                  <span className="chance-tarot-orientation">{reversed ? '↓ Reversed' : '↑ Upright'}</span>
                  <p className="chance-tarot-meaning">{reversed ? card.reversed : card.upright}</p>
                </article>
              ))}
            </div>
          )}

          {reading.length > 0 && (
            <div className="chance-ask">
              <span>Don't know what this means?</span>
              <RetroButton size="sm" onClick={askAi}>
                <Sparkles className="w-3 h-3" /> Ask AI
              </RetroButton>
            </div>
          )}
        </section>
      )}
    </WindowLayout>
  );
};

export default ChanceApp;

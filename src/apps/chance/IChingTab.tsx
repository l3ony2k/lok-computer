import { useEffect, useRef, useState } from 'react';
import { ChanceTable } from './ChanceTable';
import { COIN_IMAGE_SIZE, isCoinType } from './coins';
import { coinFace } from './coinImages';
import {
  LINE_NAMES,
  describeThrow,
  ichingQuestion,
  isChanging,
  isYang,
  listLines,
  readLines,
  throwLine,
  type Hexagram,
  type LineValue,
} from './iching';
import type { CoinSide } from './random';
import './iching.css';

/**
 * I Ching: six throws of three Kangxi Tongbao coins build a hexagram from the
 * bottom line up (iching.ts has the counting and the 64 hexagrams). Each
 * throw flips the coins like the Coin tab, then the new line draws in.
 */

const COIN = 'kangxi-tongbao';
const FLIP_MS = 500;
const HISTORY = 30;
const LINES = 6;

const createId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export interface IChingCast { id: string; lines: LineValue[] }

// eslint-disable-next-line react-refresh/only-export-components
export const useIChingTable = (active: boolean) => {
  // The cast so far, bottom line first.
  const [lines, setLines] = useState<LineValue[]>([]);
  // The coins of the last throw (null before the first throw of a cast).
  const [coins, setCoins] = useState<CoinSide[] | null>(null);
  const [throwing, setThrowing] = useState(false);
  // Per coin, the face showing when a throw starts (see the Coin tab).
  const [flipFrom, setFlipFrom] = useState<CoinSide[]>([]);
  const [casts, setCasts] = useState<IChingCast[]>([]);
  // The line that just landed draws in; the Ask AI line fades in once.
  const [freshLine, setFreshLine] = useState<number | null>(null);
  const [askFresh, setAskFresh] = useState(false);
  const timer = useRef<number | null>(null);
  // The button is disabled mid-throw, which drops its focus; it gets it back
  // on landing so Space keeps throwing.
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current);
  }, []);

  // Coming back to the tab shows the cast as it stands, without replaying it.
  useEffect(() => {
    if (active) return;
    setFreshLine(null);
    setAskFresh(false);
  }, [active]);

  const toss = () => {
    if (throwing) return;
    // A finished cast starts over: "Cast again" clears it and throws line 1.
    const before = lines.length >= LINES ? [] : lines;
    const thrown = throwLine();
    const hadFocus = document.activeElement === buttonRef.current;
    const land = () => {
      const next = [...before, thrown.value];
      setLines(next);
      setFreshLine(next.length - 1);
      setThrowing(false);
      timer.current = null;
      if (hadFocus) window.requestAnimationFrame(() => buttonRef.current?.focus({ preventScroll: true }));
      if (next.length === LINES) {
        setCasts((prev) => [{ id: createId(), lines: next }, ...prev].slice(0, HISTORY));
        setAskFresh(true);
      }
    };
    setAskFresh(false);
    if (before !== lines) setLines([]);
    if (reducedMotion()) {
      setCoins(thrown.coins);
      land();
      return;
    }
    setFlipFrom(thrown.coins.map((_, index) => coins?.[index] ?? 'heads'));
    setCoins(thrown.coins);
    setFreshLine(null);
    setThrowing(true);
    timer.current = window.setTimeout(land, FLIP_MS);
  };

  return {
    lines,
    coins,
    throwing,
    flipFrom,
    casts,
    freshLine,
    askFresh,
    buttonRef,
    toss,
    clear: () => setCasts([]),
  };
};

// ---------- Drawing ----------

/** One line of a hexagram: solid for yang, broken for yin. */
const Bar = ({ value }: { value: LineValue | undefined }) => (
  <span className="iching-bar" data-yang={value !== undefined && isYang(value) ? '' : undefined}>
    <span className="iching-bar-half" />
    <span className="iching-bar-half" />
  </span>
);

const changeMark = (value: LineValue | undefined) => (value === 9 ? '○' : value === 6 ? '×' : '');

/** The tiny hexagram in the history: six bars, top line first. */
const MiniHexagram = ({ lines }: { lines: readonly LineValue[] }) => (
  <span className="iching-mini" aria-hidden="true">
    {[...lines].reverse().map((value, index) => <Bar value={value} key={index} />)}
  </span>
);

const HexagramName = ({ hexagram }: { hexagram: Hexagram }) => (
  <>
    <span className="iching-chinese" lang="zh-Hant">{hexagram.chinese}</span>
    <span className="iching-pinyin">{hexagram.pinyin}</span>
  </>
);

/** A Kangxi Tongbao, both faces stacked like the Coin tab's coins. */
const IChingCoin = ({ side, from, flipping }: { side: CoinSide; from: CoinSide; flipping: boolean }) => {
  const photographed = isCoinType(COIN);
  return (
    <span
      className="chance-coin iching-coin"
      data-face={side}
      data-flipping={flipping || undefined}
      data-turns={flipping ? (from === side ? 'twice' : 'once') : undefined}
      role="img"
      aria-label={side === 'heads' ? 'Inscribed side (字)' : 'Back (背)'}
    >
      {(['heads', 'tails'] as const).map((face) => (
        photographed && coinFace(COIN, face) ? (
          <img
            key={face}
            className="chance-coin-image"
            src={coinFace(COIN, face)}
            alt=""
            width={COIN_IMAGE_SIZE}
            height={COIN_IMAGE_SIZE}
            draggable={false}
            data-side={face}
            data-start={flipping && from === face ? '' : undefined}
          />
        ) : (
          // Until the photos exist: a plain brass coin with its square hole.
          <span
            key={face}
            className="chance-coin-image iching-coin-stand-in"
            data-side={face}
            data-start={flipping && from === face ? '' : undefined}
          >
            <span lang="zh-Hant">{face === 'heads' ? '字' : '背'}</span>
          </span>
        )
      ))}
    </span>
  );
};

// ---------- The tab ----------

export const IChingTab = ({ table, onAsk }: { table: ReturnType<typeof useIChingTable>; onAsk: (question: string) => void }) => {
  const { lines, coins, throwing, flipFrom, casts, freshLine, askFresh } = table;
  const complete = lines.length === LINES;
  const reading = complete ? readLines(lines) : null;
  const last = lines[lines.length - 1];
  const nextLine = complete ? 1 : lines.length + 1;
  const label = throwing ? 'Throwing…' : complete ? 'Cast again' : `Throw line ${nextLine} of ${LINES}`;

  return (
    <ChanceTable
      label="I Ching"
      action={{ label, onClick: table.toss, disabled: throwing, buttonRef: table.buttonRef }}
      history={{
        title: 'Readings',
        count: casts.length,
        empty: 'Readings show up here.',
        onClear: table.clear,
        children: casts.map((cast, index) => {
          const { primary, resulting } = readLines(cast.lines);
          return (
            <li className="chance-history-entry chance-history-reading iching-history-entry" data-latest={index === 0 || undefined} key={cast.id}>
              <MiniHexagram lines={cast.lines} />
              <span className="chance-history-lines">
                <span>{primary.number} <span lang="zh-Hant">{primary.chinese}</span> {primary.english}</span>
                {resulting && (
                  <span className="chance-history-position">→ {resulting.number} <span lang="zh-Hant">{resulting.chinese}</span> {resulting.english}</span>
                )}
              </span>
            </li>
          );
        }),
      }}
    >
      <div className="iching-table">
        <div
          className="iching-hexagram"
          role="img"
          aria-label={lines.length
            ? `Lines so far, bottom up: ${lines.map((value) => LINE_NAMES[value]).join(', ')}`
            : 'No lines yet'}
        >
          {Array.from({ length: LINES }, (_, slot) => LINES - 1 - slot).map((index) => {
            const value = lines[index];
            return (
              <div
                className="iching-line"
                data-empty={value === undefined || undefined}
                data-fresh={(index === freshLine) || undefined}
                data-next={(!throwing && !complete && index === lines.length) || undefined}
                key={index}
              >
                <span className="iching-line-label">line {index + 1}</span>
                <Bar value={value} />
                <span
                  className="iching-line-mark"
                  data-mark={value === 9 ? 'circle' : value === 6 ? 'cross' : undefined}
                  title={value !== undefined && isChanging(value) ? `${LINE_NAMES[value]} (${changeMark(value)}), changing` : undefined}
                />
              </div>
            );
          })}
        </div>

        <div className="iching-side">
          <div className="iching-info" aria-live="polite">
            {reading ? (
              <>
                <span className="iching-number">Hexagram {reading.primary.number}</span>
                <span className="iching-name"><HexagramName hexagram={reading.primary} /></span>
                <span className="iching-english">{reading.primary.english}</span>
                <span className="iching-meaning">{reading.primary.meaning}</span>
                {reading.resulting && (
                  <span className="iching-change">
                    {listLines(reading.changing).replace(/^l/, 'L')} {reading.changing.length === 1 ? 'changes' : 'change'} →{' '}
                    <span className="iching-change-to">
                      {reading.resulting.number} <span lang="zh-Hant">{reading.resulting.chinese}</span> {reading.resulting.pinyin}, {reading.resulting.english}
                    </span>
                  </span>
                )}
              </>
            ) : (
              <>
                <span className="iching-number">{lines.length ? `${lines.length} of ${LINES} lines` : 'Three coins, six throws'}</span>
                <span className="iching-english">Throw six times, from the bottom up.</span>
                <span className="iching-meaning">Each throw makes one line. 字 counts 2 and 背 counts 3, so three coins sum to 6, 7, 8 or 9.</span>
                <span className="iching-change">7 and 9 are yang, 6 and 8 yin; 6 and 9 are changing lines.</span>
              </>
            )}
          </div>

          <div className="iching-throw">
            <div className="iching-coins">
              {[0, 1, 2].map((index) => (
                <IChingCoin
                  key={index}
                  side={coins?.[index] ?? (index === 1 ? 'tails' : 'heads')}
                  from={flipFrom[index] ?? 'heads'}
                  flipping={throwing}
                />
              ))}
            </div>
            <span className="iching-throw-note">
              {throwing ? 'Throwing…'
                : coins && last !== undefined ? <>{describeThrow(coins)}<br />→ {LINE_NAMES[last]} ({last})</>
                  : <>The coins show each throw<br />and what it adds up to.</>}
            </span>
          </div>
        </div>
      </div>

      {/* Laid out from the start (hidden until the cast is complete), so the table never shifts when it appears. */}
      <p className="chance-ask-line iching-ask-line" data-waiting={!complete || undefined} data-fresh={(complete && askFresh) || undefined} aria-hidden={!complete || undefined}>
        Not sure what it means?{' '}
        <button type="button" className="chance-ask-link" tabIndex={complete ? undefined : -1} onClick={() => { if (complete) onAsk(ichingQuestion(lines)); }}>
          <span className="chance-ask-link-text">Ask AI to read it</span> →
        </button>
      </p>
    </ChanceTable>
  );
};

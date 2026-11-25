import { useEffect, useState } from 'react';
import { createId } from '@/lib/id';
import { AskLine, ChanceTable } from './ChanceTable';
import { CoinView, FLIP_MS } from './CoinView';
import { pushHistory } from './history';
import { useLanding } from './useLanding';
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
const LINES = 6;

export interface IChingCast { id: string; lines: LineValue[] }

// eslint-disable-next-line react-refresh/only-export-components
export const useIChingTable = (active: boolean) => {
  // The cast so far, bottom line first.
  const [lines, setLines] = useState<LineValue[]>([]);
  // The coins of the last throw (null before the first throw of a cast).
  const [coins, setCoins] = useState<CoinSide[] | null>(null);
  const { busy: throwing, run } = useLanding();
  // Per coin, the face showing when a throw starts (see the Coin tab).
  const [flipFrom, setFlipFrom] = useState<CoinSide[]>([]);
  const [casts, setCasts] = useState<IChingCast[]>([]);
  // The line that just landed draws in; the Ask AI line fades in once.
  const [freshLine, setFreshLine] = useState<number | null>(null);
  const [askFresh, setAskFresh] = useState(false);

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
    setAskFresh(false);
    if (before !== lines) setLines([]);
    setCoins(thrown.coins);
    run(FLIP_MS, () => {
      const next = [...before, thrown.value];
      setLines(next);
      setFreshLine(next.length - 1);
      if (next.length === LINES) {
        setCasts((prev) => pushHistory(prev, { id: createId(), lines: next }));
        setAskFresh(true);
      }
    }, () => {
      setFlipFrom(thrown.coins.map((_, index) => coins?.[index] ?? 'heads'));
      setFreshLine(null);
    });
  };

  return {
    lines,
    coins,
    throwing,
    flipFrom,
    casts,
    freshLine,
    askFresh,
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

/** A Kangxi Tongbao, like the Coin tab's coins. */
const IChingCoin = ({ side, from, flipping }: { side: CoinSide; from: CoinSide; flipping: boolean }) => (
  <CoinView
    type={COIN}
    side={side}
    from={from}
    flipping={flipping}
    className="iching-coin"
    label={side === 'heads' ? 'Inscribed side (字)' : 'Back (背)'}
  />
);

const HexagramName = ({ hexagram }: { hexagram: Hexagram }) => (
  <>
    <span className="iching-chinese" lang="zh-Hant">{hexagram.chinese}</span>
    <span className="iching-pinyin">{hexagram.pinyin}</span>
  </>
);

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
      action={{ label, onClick: table.toss, disabled: throwing }}
      history={{
        title: 'Readings',
        empty: 'Readings show up here.',
        onClear: table.clear,
        entries: casts,
        entryClassName: 'chance-history-reading iching-history-entry',
        renderEntry: (cast) => {
          const { primary, resulting } = readLines(cast.lines);
          return (
            <>
              <MiniHexagram lines={cast.lines} />
              <span className="chance-history-lines">
                <span>{primary.number} <span lang="zh-Hant">{primary.chinese}</span> {primary.english}</span>
                {resulting && (
                  <span className="chance-history-position">→ {resulting.number} <span lang="zh-Hant">{resulting.chinese}</span> {resulting.english}</span>
                )}
              </span>
            </>
          );
        },
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

      <AskLine className="iching-ask-line" waiting={!complete} fresh={complete && askFresh} onAsk={() => onAsk(ichingQuestion(lines))} />
    </ChanceTable>
  );
};

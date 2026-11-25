import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Minus, Plus } from 'lucide-react';
import { RetroButton } from '@/components/ui/RetroButton';
import { ChanceTable, TableItem } from './ChanceTable';
import { DieView } from './DieView';
import { DealtCard, DeckView, PlayingCardView } from './PlayingCards';
import { TarotCardView } from './TarotCardView';
import { COIN_IMAGE_SIZE, COIN_TYPES, MAX_COINS, coinType } from './coins';
import { coinFace } from './coinImages';
import { TAROT_IMAGE_SIZE } from './tarot';
import { useTableFit } from './useTableFit';
import { TAROT_BACK, tarotImage } from './tarotImages';
import { DIE_SIDES, MAX_CARDS, MAX_DICE, PIP_LAYOUT, SPREAD_POSITIONS, isRedFace, type CoinSide } from './random';
import { QUICK_SETS, type useCardTable, type useCoinTable, type useDiceTable, type useTarotTable } from './useChanceTables';

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

// ---------- Dice ----------

/** A die in the history: a d6 with its pips, any other die its number. */
const MiniDie = ({ sides, value }: { sides: number; value: number }) => (
  sides === 6 ? (
    <span className="chance-mini-die" data-sides="6" role="img" aria-label={`d6: ${value}`}>
      {Array.from({ length: 9 }, (_, cell) => (
        <span key={cell} className="chance-mini-pip" data-on={PIP_LAYOUT[value].includes(cell) || undefined} data-red={isRedFace(value) || undefined} />
      ))}
    </span>
  ) : (
    <span className="chance-mini-die" role="img" aria-label={`d${sides}: ${value}`} title={`d${sides}`}>{value}</span>
  )
);

export const DiceTab = ({ table }: { table: ReturnType<typeof useDiceTable> }) => {
  const { dice, faces, rolling, rolls, picked, setPicked } = table;
  const total = faces?.reduce((sum, value) => sum + value, 0) ?? 0;
  return (
    <ChanceTable
      label="Dice"
      setup={
        <div className="chance-chips" role="group" aria-label="Quick sets">
          <span className="chance-setup-label">Quick sets</span>
          {QUICK_SETS.map((set) => (
            <button
              type="button"
              className="chance-chip"
              key={set.label}
              aria-pressed={set.dice.length === dice.length && set.dice.every((sides, index) => sides === dice[index])}
              onClick={() => table.applySet(set.dice)}
            >
              {set.label}
            </button>
          ))}
        </div>
      }
      result={
        rolling ? <span className="chance-result-note">Rolling…</span>
          : faces ? (
            <>
              {faces.length > 1 && <span className="chance-result-note">{faces.join(' + ')}</span>}
              <strong className="chance-readout-value">{total}</strong>
            </>
          ) : <span className="chance-result-note">Click a die to change it.</span>
      }
      action={{ label: rolling ? 'Rolling…' : `Roll ${dice.length === 1 ? 'the die' : `${dice.length} dice`}`, onClick: table.roll, disabled: rolling, buttonRef: table.rollButtonRef }}
      add={{ label: dice.length < MAX_DICE ? 'Add a die' : `Up to ${MAX_DICE} dice`, onClick: table.addDie, disabled: rolling || dice.length >= MAX_DICE }}
      history={{
        title: 'History',
        count: rolls.length,
        empty: 'Rolls show up here.',
        onClear: table.clear,
        children: rolls.map((entry, index) => (
          <li className="chance-history-entry" data-latest={index === 0 || undefined} key={entry.id}>
            <span className="chance-history-items">
              {entry.dice.map((die, position) => <MiniDie sides={die.sides} value={die.value} key={position} />)}
            </span>
            <span className="chance-history-total">{entry.dice.reduce((sum, die) => sum + die.value, 0)}</span>
          </li>
        )),
      }}
    >
      <div ref={table.diceRef} className="chance-row chance-dice-results" data-idle={faces ? undefined : ''} aria-busy={rolling}>
        {dice.map((sides, index) => (
          <TableItem
            key={index}
            label={`d${sides}${faces ? `, showing ${faces[index]}` : ''}. Change it`}
            caption={`d${sides}`}
            open={picked === index}
            onToggle={() => setPicked(picked === index ? null : index)}
            onClose={() => setPicked(null)}
            onRemove={dice.length > 1 && !rolling ? () => table.removeDie(index) : undefined}
            removeLabel={`Remove die ${index + 1}`}
            pickerLabel={`Sides of die ${index + 1}`}
            picker={
              <div className="chance-picker-grid">
                {DIE_SIDES.map((option) => (
                  <button type="button" className="chance-chip" aria-pressed={option === sides} key={option} onClick={() => table.setDie(index, option)}>
                    d{option}
                  </button>
                ))}
              </div>
            }
          >
            <DieView sides={sides} value={faces?.[index] ?? null} rolling={rolling} />
          </TableItem>
        ))}
      </div>
    </ChanceTable>
  );
};

// ---------- Coins ----------

const sideLabel = (side: CoinSide) => (side === 'heads' ? 'heads' : 'tails');

export const CoinTab = ({ table }: { table: ReturnType<typeof useCoinTable> }) => {
  const { coins, sides, flipping, flipFrom, flips, picked, setPicked } = table;
  const heads = sides?.filter((side) => side === 'heads').length ?? 0;
  const allFlipped = flips.flatMap((entry) => entry.coins);
  const headsSoFar = allFlipped.filter((coin) => coin.side === 'heads').length;
  const coinRowRef = useRef<HTMLDivElement>(null);
  // Coins as large as the table allows, in as many rows as that takes.
  const coinFit = useTableFit(coinRowRef, coins.length, { variable: '--coin', gapRatio: 0.18, extraPerRow: 26, min: 56, max: 240 });
  return (
    <ChanceTable
      label="Coins"
      result={
        flipping ? <span className="chance-result-note">Flipping…</span>
          : sides ? (
            <strong className="chance-readout-value">
              {sides.length === 1 ? (sides[0] === 'heads' ? 'Heads' : 'Tails') : `${plural(heads, 'head', 'heads')} · ${plural(sides.length - heads, 'tail', 'tails')}`}
            </strong>
          ) : <span className="chance-result-note">Click a coin to change it.</span>
      }
      action={{ label: flipping ? 'Flipping…' : `Flip ${coins.length === 1 ? 'the coin' : `${coins.length} coins`}`, onClick: table.flip, disabled: flipping }}
      add={{ label: coins.length < MAX_COINS ? 'Add a coin' : `Up to ${MAX_COINS} coins`, onClick: table.addCoin, disabled: flipping || coins.length >= MAX_COINS }}
      history={{
        title: 'History',
        count: flips.length,
        empty: 'Flips show up here.',
        summary: `${plural(headsSoFar, 'head', 'heads')}, ${plural(allFlipped.length - headsSoFar, 'tail', 'tails')}`,
        onClear: table.clear,
        children: flips.map((entry, index) => (
          <li className="chance-history-entry" data-latest={index === 0 || undefined} key={entry.id}>
            <span className="chance-history-items chance-coin-marks">
              {entry.coins.map((coin, position) => (
                <span className="chance-coin-mark" data-side={coin.side} title={`${coinType(coin.type).label}, ${sideLabel(coin.side)}`} key={position}>
                  {coin.side === 'heads' ? 'H' : 'T'}
                </span>
              ))}
            </span>
          </li>
        )),
      }}
    >
      <div ref={coinRowRef} className="chance-row chance-coins" style={coinFit}>
        {coins.map((type, index) => {
          const face = sides?.[index] ?? 'heads';
          const from = flipFrom[index] ?? 'heads';
          return (
            <TableItem
              key={index}
              shape="round"
              label={`${coinType(type).label}${sides ? `, ${sideLabel(face)}` : ''}. Change it`}
              caption={coinType(type).label}
              open={picked === index}
              onToggle={() => setPicked(picked === index ? null : index)}
              onClose={() => setPicked(null)}
              onRemove={coins.length > 1 && !flipping ? () => table.removeCoin(index) : undefined}
              removeLabel={`Remove the ${coinType(type).label}`}
              pickerLabel={`Coin ${index + 1}`}
              picker={
                <div className="chance-picker-list">
                  {COIN_TYPES.map((option) => (
                    <button type="button" className="chance-picker-option" aria-pressed={option.id === type} key={option.id} onClick={() => table.setCoin(index, option.id)}>
                      <img src={coinFace(option.id, 'heads')} alt="" width={COIN_IMAGE_SIZE} height={COIN_IMAGE_SIZE} draggable={false} />
                      <span>{option.label}</span>
                    </button>
                  ))}
                </div>
              }
            >
              <span
                className="chance-coin"
                data-face={face}
                data-flipping={flipping || undefined}
                data-turns={flipping ? (from === face ? 'twice' : 'once') : undefined}
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
              </span>
            </TableItem>
          );
        })}
      </div>
    </ChanceTable>
  );
};

// ---------- Cards ----------

export const CardsTab = ({ table }: { table: ReturnType<typeof useCardTable> }) => {
  const { deck, draws, hand, drawCount, deal, slotCount } = table;
  const stageRef = useRef<HTMLDivElement>(null);
  const deckColumnRef = useRef<HTMLDivElement>(null);
  // How many cards fit in a row beside the deck, so deck and hand stay one
  // centred group at any width instead of a full-width hand.
  const [fitCols, setFitCols] = useState(6);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver !== 'function') return;
    const measure = () => {
      const card = table.deckRef.current?.getBoundingClientRect().width ?? 0;
      const row = stage.firstElementChild as HTMLElement | null;
      if (!card || !row) return;
      const style = getComputedStyle(row);
      const stacked = style.flexDirection === 'column';
      const deckWidth = deckColumnRef.current?.getBoundingClientRect().width ?? card;
      const room = stage.clientWidth - (stacked ? 0 : deckWidth + parseFloat(style.columnGap || '0'));
      const gap = card * 0.14;
      setFitCols(Math.max(1, Math.min(6, Math.floor((room + gap) / (card + gap)))));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    return () => observer.disconnect();
  }, [table.deckRef]);

  const shown = draws.filter((cards) => cards.length);
  return (
    <ChanceTable
      label="Cards"
      result={deck.length === 0 ? <span className="chance-result-note">The deck is empty. Shuffle for a fresh one.</span> : undefined}
      actionLead={
        <div className="app-joined-control chance-count" role="group" aria-label="Cards per draw">
          <RetroButton size="icon" aria-label="Draw fewer cards" onClick={table.fewer} disabled={drawCount <= 1}>
            <Minus className="w-3 h-3" />
          </RetroButton>
          <span className="chance-count-value" aria-live="polite">{drawCount}</span>
          <RetroButton size="icon" aria-label="Draw more cards" onClick={table.more} disabled={drawCount >= MAX_CARDS}>
            <Plus className="w-3 h-3" />
          </RetroButton>
        </div>
      }
      action={{ label: `Draw ${drawCount === 1 ? 'a card' : `${drawCount} cards`}`, onClick: table.draw, disabled: deck.length === 0 }}
      history={{
        title: 'History',
        count: shown.length,
        empty: 'Draws show up here.',
        onClear: table.clear,
        children: shown.map((cards, index) => (
          <li className="chance-history-entry" data-latest={(index === 0 && cards === hand) || undefined} key={cards[0].id}>
            <span className="chance-history-items">
              {cards.map((card) => <PlayingCardView card={card} small key={card.id} />)}
            </span>
          </li>
        )),
      }}
    >
      <div ref={stageRef} className="chance-table-wrap">
        <div className="chance-table">
          <div ref={deckColumnRef} className="chance-deck-column">
            <DeckView ref={table.deckRef} remaining={deck.length} />
            <span className="chance-deck-count">{deck.length} left</span>
            <RetroButton size="sm" className="chance-deck-control" onClick={table.shuffleDeck}>Shuffle</RetroButton>
            <label className="chance-toggle chance-deck-control">
              <input type="checkbox" checked={table.jokers} onChange={(event) => table.setJokers(event.target.checked)} />
              <span>Jokers</span>
            </label>
          </div>
          {/* Dashed slots, as many as the next draw needs: dealt cards land on them and the deck never shifts. */}
          <div
            className="chance-hand"
            aria-label={hand.length ? 'Latest draw' : undefined}
            style={{ '--hand-cols': Math.min(fitCols, slotCount) } as CSSProperties}
          >
            {Array.from({ length: slotCount }, (_, index) => (
              <div className="chance-card-slot" key={index}>
                {hand[index] && (
                  <DealtCard card={hand[index]} index={index} origin={deal?.id === hand[0].id ? deal.origin : null} key={hand[index].id} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </ChanceTable>
  );
};

// ---------- Tarot ----------

const orientation = (reversed: boolean) => (reversed ? '↓' : '↑');

export const TarotTab = ({ table, onAsk }: { table: ReturnType<typeof useTarotTable>; onAsk: () => void }) => {
  const { reading, readings, spread, dealing, readingDone } = table;
  return (
    <ChanceTable
      label="Tarot"
      paneRef={table.paneRef}
      setup={
        <div className="chance-segmented" role="radiogroup" aria-label="Spread">
          {([[1, 'One card'], [3, 'Past · Present · Future']] as const).map(([count, label]) => (
            <button type="button" role="radio" aria-checked={spread === count} key={count} onClick={() => table.setSpread(count)}>
              {label}
            </button>
          ))}
        </div>
      }
      action={{ label: spread === 1 ? 'Draw a card' : 'Draw three cards', onClick: table.draw }}
      history={{
        title: 'Readings',
        count: readings.length,
        empty: 'Readings show up here.',
        onClear: table.clear,
        children: readings.map((entry, index) => (
          <li className="chance-history-entry chance-history-reading" data-latest={index === 0 || undefined} key={entry.id}>
            {entry.draws.length === 1 && tarotImage(entry.draws[0].card) && (
              <img className="chance-history-tarot" src={tarotImage(entry.draws[0].card)} alt="" width={TAROT_IMAGE_SIZE.width} height={TAROT_IMAGE_SIZE.height} />
            )}
            <span className="chance-history-lines">
              {entry.draws.map((draw, position) => (
                <span key={position}>
                  {entry.draws.length === 3 && <span className="chance-history-position">{SPREAD_POSITIONS[position]} · </span>}
                  {draw.card.name} {orientation(draw.reversed)}
                </span>
              ))}
            </span>
          </li>
        )),
      }}
    >
      {!reading && (
        <div className="chance-tarot-empty">
          {TAROT_BACK && <img className="chance-tarot-empty-back" src={TAROT_BACK} alt="" decoding="async" draggable={false} {...TAROT_IMAGE_SIZE} />}
          <p className="chance-hint">One card for a quick answer, three for past, present and future.</p>
        </div>
      )}
      {reading && (
        <div className="chance-reading" data-spread={reading.draws.length} aria-live="polite" aria-busy={!readingDone || undefined}>
          {reading.draws.map((draw, index) => (
            <TarotCardView
              key={`${reading.id}-${draw.card.id}`}
              draw={draw}
              index={index}
              position={reading.draws.length === 3 ? SPREAD_POSITIONS[index] : undefined}
              animate={dealing}
              origin={table.dealOrigin}
              onRevealed={table.cardRevealed}
            />
          ))}
        </div>
      )}
      {/* Laid out from the start (hidden until the reading is done), so the cards never shift when it appears. */}
      {reading && (
        <p className="chance-ask-line" data-waiting={!readingDone || undefined} data-fresh={table.askFresh || undefined} aria-hidden={!readingDone || undefined}>
          Not sure what it means?{' '}
          <button type="button" className="chance-ask-link" onClick={onAsk}>
            <span className="chance-ask-link-text">Ask AI to read it</span> →
          </button>
        </p>
      )}
    </ChanceTable>
  );
};

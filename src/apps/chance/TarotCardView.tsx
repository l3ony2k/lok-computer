import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useTypo } from '../ask-ai/useTypo';
import { TAROT_IMAGE_SIZE, arcanaLabel } from './tarot';
import { TAROT_BACK, tarotImage } from './tarotImages';
import type { TarotDraw } from './random';
import { DEAL_TRAVEL_MS, useDealTravel, type DealOrigin } from './deal';

type ArtState = 'loading' | 'shown' | 'failed';

interface TarotCardViewProps {
  draw: TarotDraw;
  /** Shown above the name in a spread ("Past", "Present", "Future"). */
  position?: string;
  /** Place in the spread, which staggers the deal. */
  index: number;
  /**
   * Play the deal: the card travels face down from `origin` to its place,
   * turns over, and its reading types out. False shows the finished card
   * (reduced motion, or a reading already watched).
   */
  animate: boolean;
  origin?: DealOrigin | null;
  /** Called once the card has turned over and its reading is fully typed. */
  onRevealed?: () => void;
}

const STAGGER_MS = 140;
/** The flip runs 520 ms after its stagger; past this the reading starts anyway. */
const FLIP_FALLBACK_MS = 900;
const TYPO = { speed: 13, jitter: 6, typoChance: 2 } as const;

/** Length of the stretch `typed` shares with `full` from the start. */
const sharedPrefix = (typed: string, full: string) => {
  let index = 0;
  while (index < typed.length && typed[index] === full[index]) index++;
  return index;
};

/**
 * A line as typed so far. The untyped rest of the final text follows it
 * invisibly, so the line takes its final size from the start and the reading
 * never reflows while it types.
 */
const Typed = ({ full, typed, caret }: { full: string; typed: string; caret: boolean }) => (
  <>
    {typed}
    {caret && <span className="chance-typed-caret" aria-hidden="true" />}
    <span className="chance-typed-rest" aria-hidden="true">{full.slice(sharedPrefix(typed, full))}</span>
  </>
);

/**
 * One drawn tarot card: the art (upside down when reversed) and its reading.
 * The card is dealt face down, turns over once its scan has loaded, and only
 * then types its reading; a scan that fails, or is missing, leaves a framed
 * card with the name. Mount a new instance per draw (key it by draw).
 */
export const TarotCardView = ({ draw: { card, reversed }, position, index, animate, origin, onRevealed }: TarotCardViewProps) => {
  const src = tarotImage(card);
  const [art, setArt] = useState<ArtState>(src ? 'loading' : 'failed');
  // Face up: set a frame after the scan is ready, so the turn always animates.
  const [faceUp, setFaceUp] = useState(!animate);
  const [turned, setTurned] = useState(!animate);
  const artRef = useRef<HTMLDivElement>(null);
  const delay = index * STAGGER_MS;

  // A cached scan can finish before React attaches onLoad; catch it here.
  const faceRef = useCallback((img: HTMLImageElement | null) => {
    if (img?.complete && img.naturalWidth > 0) setArt('shown');
  }, []);

  // Deal: from the deck's place to this card's, scaled, before the first paint.
  useDealTravel(artRef, origin, delay, animate);

  // Turn over once the scan is ready; a card with no art is "turned" at once.
  useEffect(() => {
    if (faceUp || art === 'loading') return;
    if (art === 'failed') {
      const timer = window.setTimeout(() => { setFaceUp(true); setTurned(true); }, delay + DEAL_TRAVEL_MS);
      return () => window.clearTimeout(timer);
    }
    let frame = requestAnimationFrame(() => { frame = requestAnimationFrame(() => setFaceUp(true)); });
    return () => cancelAnimationFrame(frame);
  }, [art, faceUp, delay]);

  // The reading waits for the turn to finish (transitionend, with a fallback).
  useEffect(() => {
    if (!faceUp || turned) return;
    const timer = window.setTimeout(() => setTurned(true), delay + FLIP_FALLBACK_MS);
    return () => window.clearTimeout(timer);
  }, [faceUp, turned, delay]);

  const orientation = reversed ? 'reversed' : 'upright';
  const lines = [
    position ?? '',
    card.suit ? card.suit.name : card.label,
    card.suit ? ` · ${card.suit.sphere}` : ` · ${arcanaLabel(card.arcana)}`,
    card.name,
    reversed ? '↓ Reversed' : '↑ Upright',
    reversed ? card.reversed : card.upright,
  ];
  const full = lines.join('\n');
  const { displayText, isTyping } = useTypo(full, animate && turned, TYPO);
  const typedLines = (animate ? (turned ? displayText : '') : full).split('\n');
  const revealed = !animate || (turned && !isTyping && displayText === full);

  const reported = useRef(false);
  useEffect(() => {
    if (!revealed || reported.current) return;
    reported.current = true;
    onRevealed?.();
  }, [revealed, onRevealed]);

  // The caret sits at the end of the line being typed.
  const activeLine = typedLines.length - 1;
  const line = (n: number): ReactNode => (
    <Typed full={lines[n]} typed={typedLines[n] ?? ''} caret={animate && turned && !revealed && n === activeLine} />
  );

  return (
    <article className="chance-tarot" data-reversed={reversed || undefined}>
      <div
        ref={artRef}
        className="chance-tarot-art"
        data-art={art}
        data-face-up={faceUp || undefined}
        data-back={TAROT_BACK ? '' : undefined}
        style={{ '--chance-tarot-delay': `${animate ? delay : 0}ms`, aspectRatio: `${TAROT_IMAGE_SIZE.width} / ${TAROT_IMAGE_SIZE.height}` } as CSSProperties}
      >
        {TAROT_BACK && <img className="chance-tarot-back" src={TAROT_BACK} alt="" aria-hidden="true" decoding="async" {...TAROT_IMAGE_SIZE} />}
        {art === 'failed' ? (
          <div className="chance-tarot-missing" role="img" aria-label={`${card.name}, ${orientation}`}>
            <span>{card.name}</span>
            <span>{arcanaLabel(card.arcana)}</span>
          </div>
        ) : (
          <img
            ref={faceRef}
            className="chance-tarot-face"
            src={src}
            alt={`${card.name}, ${orientation}`}
            decoding="async"
            draggable={false}
            {...TAROT_IMAGE_SIZE}
            onLoad={() => setArt('shown')}
            onError={() => setArt('failed')}
            onTransitionEnd={(event) => {
              if (event.target === event.currentTarget && faceUp) setTurned(true);
            }}
          />
        )}
      </div>
      {/* Screen readers get the reading once it is complete (aria-busy on the spread). */}
      <div className="chance-tarot-text">
        {position && <span className="chance-tarot-position">{line(0)}</span>}
        <span className="chance-tarot-arcana">
          {card.suit ? <strong className="chance-tarot-suit">{line(1)}</strong> : line(1)}
          {line(2)}
        </span>
        <h3 className="chance-tarot-name">{line(3)}</h3>
        <span className="chance-tarot-orientation">{line(4)}</span>
        <p className="chance-tarot-meaning">{line(5)}</p>
      </div>
    </article>
  );
};

import { forwardRef, useEffect, useRef, useState, type CSSProperties } from 'react';
import { useDealTravel, type DealOrigin } from './deal';
import type { PlayingCard } from './random';

/** A playing card: ivory face, black or red ink in every theme (a card is a card). */
export const PlayingCardView = ({ card, small }: { card: PlayingCard; small?: boolean }) => (
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

const DEAL_STAGGER_MS = 90;

/**
 * A card from the latest draw, dealt: it leaves the deck face down, travels
 * to its place while turning over (CSS, on data-face-up), staggered by its
 * place in the hand. Without `origin` it simply lies face up.
 */
export const DealtCard = ({ card, index, origin }: { card: PlayingCard; index: number; origin: DealOrigin | null }) => {
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
      style={{ '--chance-deal-delay': `${animate ? delay : 0}ms` } as CSSProperties}
    >
      <div className="chance-card chance-card-back chance-dealt-back" aria-hidden="true" />
      <PlayingCardView card={card} />
    </div>
  );
};

/** The deck, face down, as a stack that thins as it is dealt (one layer per ~9 cards). */
const stackShadow = (remaining: number) => {
  const layers = Math.min(6, Math.ceil(remaining / 9) - 1);
  const shadows: string[] = [];
  for (let layer = 1; layer <= layers; layer++) {
    const offset = `${-layer}px ${layer * 2}px`;
    shadows.push(`${offset} 0 -1px #fbf9f2`, `${offset} 0 0 #2a2a2a`);
  }
  return shadows.length ? shadows.join(', ') : undefined;
};

export const DeckView = forwardRef<HTMLDivElement, { remaining: number }>(({ remaining }, ref) => (
  <div
    ref={ref}
    className="chance-card chance-card-back chance-deck"
    data-empty={remaining === 0 || undefined}
    style={{ boxShadow: stackShadow(remaining) }}
    role="img"
    aria-label={remaining ? `The deck, ${remaining} cards` : 'The deck is empty'}
  />
));
DeckView.displayName = 'DeckView';

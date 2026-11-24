import { useCallback, useState, type CSSProperties } from 'react';
import { TAROT_IMAGE_SIZE, arcanaLabel } from './tarot';
import { TAROT_BACK, tarotImage } from './tarotImages';
import type { TarotDraw } from './random';

type ArtState = 'loading' | 'shown' | 'failed';

interface TarotCardViewProps {
  draw: TarotDraw;
  /** Shown above the name in a spread ("Past", "Present", "Future"). */
  position?: string;
  /** Place in the spread, which staggers the reveal. */
  index: number;
}

/**
 * One drawn tarot card: the art (upside down when reversed) and its reading.
 * The card lies face down until its scan has loaded, then turns over; a scan
 * that fails, or is missing, leaves a framed card with the name instead.
 * Mount a new instance per draw (key it by draw) so the reveal replays.
 */
export const TarotCardView = ({ draw: { card, reversed }, position, index }: TarotCardViewProps) => {
  const src = tarotImage(card);
  const [art, setArt] = useState<ArtState>(src ? 'loading' : 'failed');

  // A cached scan can finish before React attaches onLoad; catch it here.
  const faceRef = useCallback((img: HTMLImageElement | null) => {
    if (img?.complete && img.naturalWidth > 0) setArt('shown');
  }, []);

  const orientation = reversed ? 'reversed' : 'upright';

  return (
    <article className="chance-tarot" data-reversed={reversed || undefined}>
      <div
        className="chance-tarot-art"
        data-art={art}
        data-back={TAROT_BACK ? '' : undefined}
        style={{ '--chance-tarot-delay': `${index * 140}ms`, aspectRatio: `${TAROT_IMAGE_SIZE.width} / ${TAROT_IMAGE_SIZE.height}` } as CSSProperties}
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
          />
        )}
      </div>
      <div className="chance-tarot-text">
        {position && <span className="chance-tarot-position">{position}</span>}
        <span className="chance-tarot-arcana">
          {card.suit ? (
            <><strong className="chance-tarot-suit">{card.suit.name}</strong> · {card.suit.sphere}</>
          ) : (
            <>{card.label} · {arcanaLabel(card.arcana)}</>
          )}
        </span>
        <h3 className="chance-tarot-name">{card.name}</h3>
        <span className="chance-tarot-orientation">{reversed ? '↓ Reversed' : '↑ Upright'}</span>
        <p className="chance-tarot-meaning">{reversed ? card.reversed : card.upright}</p>
      </div>
    </article>
  );
};

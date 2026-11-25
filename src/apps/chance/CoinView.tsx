import type { CSSProperties } from 'react';
import { COIN_IMAGE_SIZE } from './coins';
import { coinFace } from './coinImages';
import type { CoinSide } from './random';

/**
 * How long a coin flip takes. The tables land after it, and the coin's
 * stylesheet animations read it as `--chance-flip` (set on each coin below).
 */
export const FLIP_MS = 500;

const FLIP_STYLE = { '--chance-flip': `${FLIP_MS}ms` } as CSSProperties;

interface CoinViewProps {
  type: string;
  /** The face it shows, or lands on while flipping. */
  side: CoinSide;
  /** The face showing when the flip started. */
  from: CoinSide;
  flipping: boolean;
  className?: string;
  /** Its accessible name, when the coin is not inside a labelled button. */
  label?: string;
}

/**
 * A coin: both faces stacked, the one showing opaque. A flip turns it edge-on
 * twice and swaps faces at each edge (chance.css), so landing on the other
 * face swaps once and landing on the same face swaps twice.
 */
export const CoinView = ({ type, side, from, flipping, className, label }: CoinViewProps) => (
  <span
    className={className ? `chance-coin ${className}` : 'chance-coin'}
    style={FLIP_STYLE}
    data-face={side}
    data-flipping={flipping || undefined}
    data-turns={flipping ? (from === side ? 'twice' : 'once') : undefined}
    role={label ? 'img' : undefined}
    aria-label={label}
  >
    {(['heads', 'tails'] as const).map((face) => (
      <img
        key={face}
        className="chance-coin-image"
        src={coinFace(type, face)}
        alt=""
        width={COIN_IMAGE_SIZE}
        height={COIN_IMAGE_SIZE}
        draggable={false}
        data-side={face}
        data-start={flipping && from === face ? '' : undefined}
      />
    ))}
  </span>
);

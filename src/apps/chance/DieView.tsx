import { PIP_LAYOUT, isRedFace } from './random';
import { cubeTransform } from './dieThrow';

/**
 * A die on the table. A d6 is a real cube (six faces in CSS 3D, opposite
 * faces summing to seven) turned so the rolled face looks up at the viewer;
 * any other die is a two-sided tile showing its number. throwDice()
 * (dieThrow.ts) animates both: thrown from a point, tumbling, bouncing once
 * and settling.
 */

const Pips = ({ value }: { value: number }) => (
  <span className="chance-die-pips" data-red={isRedFace(value) || undefined}>
    {Array.from({ length: 9 }, (_, cell) => (
      <span key={cell} className="chance-pip" data-on={PIP_LAYOUT[value].includes(cell) || undefined} />
    ))}
  </span>
);

/** Face order matches the placement classes: front 1, top 2, right 3, left 4, bottom 5, back 6. */
const CUBE_FACES = [
  { value: 1, side: 'front' },
  { value: 2, side: 'top' },
  { value: 3, side: 'right' },
  { value: 4, side: 'left' },
  { value: 5, side: 'bottom' },
  { value: 6, side: 'back' },
] as const;

export const DieView = ({ sides, value, rolling }: { sides: number; value: number | null; rolling: boolean }) => {
  const label = value === null ? `d${sides}, not rolled` : rolling ? `d${sides}, rolling` : `d${sides}: ${value}`;
  return (
    <div className="chance-die-slot" role="img" aria-label={label}>
      <span className="chance-die-shadow" aria-hidden="true" />
      <div className="chance-die-throw" aria-hidden="true">
        {sides === 6 ? (
          <div className="chance-cube" style={{ transform: cubeTransform(value) }}>
            {CUBE_FACES.map((face) => (
              <div className="chance-die chance-die-face" data-sides="6" data-side={face.side} key={face.side}>
                {value === null && face.side === 'front' && !rolling
                  ? <span className="chance-die-value">?</span>
                  : <Pips value={face.value} />}
              </div>
            ))}
          </div>
        ) : (
          <div className="chance-tile">
            {(['front', 'back'] as const).map((side) => (
              <div className="chance-die chance-die-face" data-sides={sides} data-side={side} key={side}>
                <span className="chance-die-value">{value ?? '?'}</span>
                <span className="chance-die-sides">d{sides}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

import { useRef, useState, type Ref } from 'react';
import { createId } from '@/lib/id';
import { prefersReducedMotion } from '@/lib/motion';
import { flushSync } from 'react-dom';
import { ChanceTable } from './ChanceTable';
import { pushHistory } from './history';
import { useLanding } from './useLanding';
import { useTableFit } from './useTableFit';
import { DIE, M8GIC_ANSWERS, TRIANGLE_POINTS, drawM8gic, kindCounts, layoutDie, type M8gicKind } from './m8gic';
import './m8gic.css';

/**
 * M8gic: think of a yes-or-no question and shake the ball. The ball wobbles,
 * the die sinks into the liquid, and the answer floats back up into the
 * window. The hook lives in ChanceApp, so the answer and the history survive
 * switching tabs.
 */

/** The ball shakes this long; the old answer sinks during the first part. */
const SHAKE_MS = 600;
const SINK_MS = 260;
/** The new answer rising into the window and settling. */
const RISE_MS = 900;

export interface M8gicEntry { id: string; answer: number }

const SHAKE_FRAMES: Keyframe[] = [
  { transform: 'translate(0, 0) rotate(0deg)' },
  { transform: 'translate(-7%, 2%) rotate(-9deg)', offset: 0.12 },
  { transform: 'translate(6%, -3%) rotate(8deg)', offset: 0.28 },
  { transform: 'translate(-5%, 3%) rotate(-6deg)', offset: 0.44 },
  { transform: 'translate(4%, -2%) rotate(5deg)', offset: 0.6 },
  { transform: 'translate(-2%, 1%) rotate(-3deg)', offset: 0.76 },
  { transform: 'translate(1%, 0) rotate(1deg)', offset: 0.9 },
  { transform: 'translate(0, 0) rotate(0deg)' },
];

const SINK_FRAMES: Keyframe[] = [
  { transform: 'translateY(0) scale(1) rotate(0deg)', opacity: 1, filter: 'blur(0)' },
  { transform: 'translateY(14%) scale(0.82) rotate(8deg)', opacity: 0, filter: 'blur(1.5px)' },
];

const RISE_FRAMES: Keyframe[] = [
  { transform: 'translateY(16%) scale(0.8) rotate(-14deg)', opacity: 0, filter: 'blur(2px)' },
  { transform: 'translateY(4%) scale(0.94) rotate(-4deg)', opacity: 0.55, filter: 'blur(1px)', offset: 0.45 },
  { transform: 'translateY(-1%) scale(1.01) rotate(2.5deg)', opacity: 0.95, filter: 'blur(0)', offset: 0.75 },
  // Ends exactly at rest; the effect is dropped once it finishes, so the die
  // is plain vector again, with no transform or filter left on it.
  { transform: 'translateY(0) scale(1) rotate(0deg)', opacity: 1, filter: 'blur(0)' },
];

// eslint-disable-next-line react-refresh/only-export-components
export const useM8gicTable = () => {
  // The answer in the window: null before the first shake (or after Clear).
  const [shown, setShown] = useState<number | null>(null);
  // Two steps (the shake, then the rise), so the busy flag is set by hand.
  const { busy: shaking, setBusy: setShaking, later } = useLanding();
  const [history, setHistory] = useState<M8gicEntry[]>([]);
  const ballRef = useRef<HTMLDivElement>(null);
  const dieRef = useRef<SVGGElement>(null);
  const sink = useRef<Animation | null>(null);

  const record = (answer: number) => {
    setHistory((prev) => pushHistory(prev, { id: createId(), answer }));
  };

  const shake = () => {
    if (shaking) return;
    const next = drawM8gic();
    const ball = ballRef.current;
    if (prefersReducedMotion() || !ball || typeof ball.animate !== 'function') {
      setShown(next);
      record(next);
      return;
    }
    setShaking(true);
    ball.animate(SHAKE_FRAMES, { duration: SHAKE_MS, easing: 'ease-in-out' });
    sink.current = dieRef.current?.animate(SINK_FRAMES, { duration: SINK_MS, easing: 'ease-in', fill: 'forwards' }) ?? null;
    later(SHAKE_MS, () => {
      // Put the new answer on the die while it is hidden, then let it rise.
      flushSync(() => setShown(next));
      sink.current?.cancel();
      sink.current = null;
      dieRef.current?.animate(RISE_FRAMES, { duration: RISE_MS, easing: 'cubic-bezier(0.2, 0.7, 0.3, 1)', fill: 'backwards' });
      later(RISE_MS, () => {
        setShaking(false);
        record(next);
      });
    });
  };

  return {
    shown,
    shaking,
    history,
    ballRef,
    dieRef,
    shake,
    clear: () => {
      if (shaking) return;
      setHistory([]);
      setShown(null);
    },
  };
};

const KIND_LABEL: Record<M8gicKind, string> = { yes: 'yes', maybe: 'maybe', no: 'no' };

const Die = ({ answer, dieRef }: { answer: number | null; dieRef: Ref<SVGGElement> }) => {
  const layout = answer === null ? null : layoutDie(M8GIC_ANSWERS[answer].text);
  return (
    <svg className="m8gic-die" viewBox="0 0 100 100" aria-hidden="true" shapeRendering="geometricPrecision" textRendering="geometricPrecision">
      <g ref={dieRef} className="m8gic-die-face" data-idle={answer === null || undefined}>
        <polygon className="m8gic-triangle" points={TRIANGLE_POINTS} />
        {layout?.lines.map((line, index) => (
          <text key={index} className="m8gic-die-text" x={DIE.cx} y={layout.baselines[index]} textAnchor="middle" fontSize={layout.size}>
            {line}
          </text>
        ))}
      </g>
    </svg>
  );
};

export const M8gicTab = ({ table }: { table: ReturnType<typeof useM8gicTable> }) => {
  const { shown, shaking, history } = table;
  const counts = kindCounts(history.map((entry) => M8GIC_ANSWERS[entry.answer].kind));
  const current = shown === null ? null : M8GIC_ANSWERS[shown];
  const stageRef = useRef<HTMLDivElement>(null);
  // The ball as large as the table allows, in both directions.
  const fit = useTableFit(stageRef, 1, { variable: '--m8gic-fit', gapRatio: 0, extraPerRow: 0, min: 160, max: 300 });
  return (
    <ChanceTable
      label="M8gic"
      setup={<p className="chance-hint">Think of a yes-or-no question, then shake.</p>}
      result={
        shaking ? <span className="chance-result-note">Shaking…</span>
          : current ? (
            <>
              <strong className="chance-readout-value">{current.text}</strong>
              <span className="chance-result-note">{KIND_LABEL[current.kind]}</span>
            </>
          ) : <span className="chance-result-note">The answer floats up in the window.</span>
      }
      action={{ label: shaking ? 'Shaking…' : 'Shake', onClick: table.shake, disabled: shaking }}
      history={{
        title: 'History',
        empty: 'Answers show up here.',
        summary: `${counts.yes} yes · ${counts.maybe} maybe · ${counts.no} no`,
        onClear: table.clear,
        entries: history,
        renderEntry: (entry) => {
          const answer = M8GIC_ANSWERS[entry.answer];
          return (
            <>
              <span className="m8gic-mark" data-kind={answer.kind} title={KIND_LABEL[answer.kind]} />
              <span className="chance-history-lines">
                {answer.text}
                <span className="sr-only">, {KIND_LABEL[answer.kind]}</span>
              </span>
            </>
          );
        },
      }}
    >
      <div ref={stageRef} className="m8gic-stage" style={fit}>
        <div ref={table.ballRef} className="m8gic-ball" role="img" aria-label={current ? `The ball says: ${current.text}` : 'The ball, waiting for a question'}>
          <div className="m8gic-window">
            <Die answer={shown} dieRef={table.dieRef} />
          </div>
        </div>
      </div>
    </ChanceTable>
  );
};

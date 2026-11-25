import { useCallback, useEffect, useLayoutEffect, useRef, useState, type FormEvent } from 'react';
import { createId } from '@/lib/id';
import { prefersReducedMotion } from '@/lib/motion';
import { Plus } from 'lucide-react';
import { RetroButton } from '@/components/ui/RetroButton';
import { usePersistedState } from '@/hooks/useStorage';
import { ChanceTable } from './ChanceTable';
import {
  DEFAULT_WHEEL_STATE,
  MAX_WHEEL_OPTIONS,
  MIN_WHEEL_OPTIONS,
  WHEEL_PRESETS,
  addOption,
  normalizeWheelState,
  planSpin,
  sameOptions,
  sliceAngle,
  wheelOptions,
  wheelPreset,
  type WheelPresetId,
} from './wheel';
import './wheel.css';

/**
 * Wheel: a decision wheel. Pick a preset (or make your own list), spin, and
 * the pointer at the top lands on the answer. The winner is drawn first; the
 * spin only shows it.
 */

const HISTORY = 30;
const SPIN_EASING = 'cubic-bezier(0.16, 0.84, 0.24, 1)';

export interface WheelSpin { id: string; preset: string; result: string }

interface ActiveSpin { id: string; from: number; to: number; durationMs: number; startedAt: number }

type AddNote = 'duplicate' | 'full' | null;

// eslint-disable-next-line react-refresh/only-export-components
export const useWheelTable = () => {
  const [state, setState] = usePersistedState({ key: 'app:chance-wheel', defaultValue: DEFAULT_WHEEL_STATE, normalize: normalizeWheelState });
  // The wheel's resting angle; a spin starts from here and ends a few turns on.
  const [angle, setAngle] = useState(0);
  const [spin, setSpin] = useState<ActiveSpin | null>(null);
  // The slice that won the last spin, cleared when the list changes.
  const [winner, setWinner] = useState<number | null>(null);
  const [spins, setSpins] = useState<WheelSpin[]>([]);
  const [draft, setDraft] = useState('');
  const [addNote, setAddNote] = useState<AddNote>(null);
  const spinTimer = useRef<number | null>(null);

  useEffect(() => () => {
    if (spinTimer.current) window.clearTimeout(spinTimer.current);
  }, []);

  const preset = wheelPreset(state.preset);
  const options = wheelOptions(state);
  const edited = !sameOptions(options, preset.options);
  const spinning = spin !== null;

  const setOptions = (next: string[]) => {
    setState((prev) => {
      const lists = { ...prev.lists };
      if (sameOptions(next, wheelPreset(prev.preset).options)) delete lists[prev.preset];
      else lists[prev.preset] = next;
      return { ...prev, lists };
    });
    setWinner(null);
  };

  const spinWheel = () => {
    if (spinning || options.length < MIN_WHEEL_OPTIONS) return;
    const plan = planSpin(angle, options.length);
    const result = options[plan.winner];
    const label = preset.label;
    const land = () => {
      spinTimer.current = null;
      setSpin(null);
      setAngle(plan.to % 360);
      setWinner(plan.winner);
      setSpins((prev) => [{ id: createId(), preset: label, result }, ...prev].slice(0, HISTORY));
    };
    setWinner(null);
    setAddNote(null);
    if (prefersReducedMotion()) {
      land();
      return;
    }
    setSpin({ id: createId(), from: angle, to: plan.to, durationMs: plan.durationMs, startedAt: performance.now() });
    spinTimer.current = window.setTimeout(land, plan.durationMs);
  };

  return {
    preset,
    options,
    edited,
    angle,
    spin,
    spinning,
    winner,
    spins,
    draft,
    addNote,
    spinWheel,
    setDraft: (text: string) => {
      setDraft(text);
      setAddNote(null);
    },
    choosePreset: (id: WheelPresetId) => {
      if (spinning) return;
      setState((prev) => ({ ...prev, preset: id }));
      setWinner(null);
      setAddNote(null);
    },
    /** Adds the draft; returns whether it went on the wheel. */
    add: () => {
      if (spinning) return false;
      const outcome = addOption(options, draft);
      if (!outcome.ok) {
        setAddNote(outcome.reason === 'empty' ? null : outcome.reason);
        return false;
      }
      setOptions(outcome.options);
      setDraft('');
      setAddNote(null);
      return true;
    },
    remove: (index: number) => {
      if (spinning) return;
      setOptions(options.filter((_, position) => position !== index));
      setAddNote(null);
    },
    reset: () => {
      if (spinning) return;
      setOptions([...preset.options]);
      setAddNote(null);
    },
    clear: () => setSpins([]),
  };
};

// ---------- The wheel ----------

const SIZE = 200;
const CENTRE = SIZE / 2;
const RADIUS = 97;

const point = (degrees: number, radius: number) => {
  const radians = (degrees * Math.PI) / 180;
  return `${(CENTRE + radius * Math.sin(radians)).toFixed(3)} ${(CENTRE - radius * Math.cos(radians)).toFixed(3)}`;
};

const slicePath = (index: number, count: number) => {
  const step = sliceAngle(count);
  const start = index * step;
  return `M ${CENTRE} ${CENTRE} L ${point(start, RADIUS)} A ${RADIUS} ${RADIUS} 0 ${step > 180 ? 1 : 0} 1 ${point(start + step, RADIUS)} Z`;
};

/** Labels shrink as slices narrow, and long ones are cut to fit between the hub and the rim (monospace faces are the widest). */
const labelStyle = (count: number) => (count <= 6 ? { size: 9, chars: 11 } : count <= 10 ? { size: 8, chars: 13 } : { size: 7, chars: 15 });

const shorten = (text: string, chars: number) => (text.length > chars ? `${text.slice(0, chars - 1).trimEnd()}…` : text);

/**
 * A label reads along its slice's radius. One that will come to rest pointing
 * left would read upside down, so it is turned half round and reads from the
 * rim inwards instead; `rest` is the angle the wheel will stop at (known when
 * a spin starts), so every label is upright when the wheel stops.
 */
const WheelFace = ({ options, winner, rest }: { options: string[]; winner: number | null; rest: number }) => {
  const count = options.length;
  const { size, chars } = labelStyle(count);
  if (count < 2) {
    return (
      <svg className="chance-wheel-face" viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true">
        <circle className="chance-wheel-slice" data-tone="0" cx={CENTRE} cy={CENTRE} r={RADIUS} />
        {count === 1 && (
          <text className="chance-wheel-label" x={CENTRE} y={CENTRE - 34} textAnchor="middle" dominantBaseline="central" fontSize={size}>
            {shorten(options[0], chars)}
          </text>
        )}
      </svg>
    );
  }
  const step = sliceAngle(count);
  return (
    <svg className="chance-wheel-face" viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true">
      {options.map((option, index) => (
        <path
          key={`slice-${index}`}
          className="chance-wheel-slice"
          // An odd count would put two alike slices side by side at the join: the last takes a third tone.
          data-tone={count % 2 === 1 && index === count - 1 ? 2 : index % 2}
          data-winner={winner === index || undefined}
          data-index={index}
          d={slicePath(index, count)}
        />
      ))}
      {options.map((option, index) => {
        const along = (index + 0.5) * step - 90;
        const flipped = Math.cos(((along + rest) * Math.PI) / 180) < -0.0001;
        return (
          // Along the radius, ending just inside the rim (or starting there, turned).
          <text
            key={`label-${index}`}
            className="chance-wheel-label"
            data-winner={winner === index || undefined}
            transform={`rotate(${flipped ? along + 180 : along} ${CENTRE} ${CENTRE})`}
            x={flipped ? CENTRE - RADIUS + 17 : CENTRE + RADIUS - 17}
            y={CENTRE}
            textAnchor={flipped ? 'start' : 'end'}
            dominantBaseline="central"
            fontSize={size}
          >
            {shorten(option, chars)}
          </text>
        );
      })}
    </svg>
  );
};

/** The rim, the hub and the pointer: they stay still while the face turns. */
const WheelFrame = () => (
  <svg className="chance-wheel-frame" viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true">
    <circle className="chance-wheel-rim" cx={CENTRE} cy={CENTRE} r={RADIUS} />
    <circle className="chance-wheel-hub" cx={CENTRE} cy={CENTRE} r={12} />
    <circle className="chance-wheel-hub-dot" cx={CENTRE} cy={CENTRE} r={3} />
    <path className="chance-wheel-pointer" d={`M ${CENTRE - 9} -7 L ${CENTRE + 9} -7 L ${CENTRE} 12 Z`} />
  </svg>
);

const Wheel = ({ table }: { table: ReturnType<typeof useWheelTable> }) => {
  const { options, winner, angle, spin } = table;
  const rotorRef = useRef<HTMLDivElement>(null);

  // A spin plays on the face; coming back to the tab mid-spin picks it up where it is.
  useLayoutEffect(() => {
    const rotor = rotorRef.current;
    if (!spin || !rotor || typeof rotor.animate !== 'function') return;
    const animation = rotor.animate(
      [{ transform: `rotate(${spin.from}deg)` }, { transform: `rotate(${spin.to}deg)` }],
      { duration: spin.durationMs, easing: SPIN_EASING, fill: 'forwards' },
    );
    animation.currentTime = Math.min(spin.durationMs, performance.now() - spin.startedAt);
    return () => animation.cancel();
  }, [spin]);

  // The Spin button is disabled while the wheel turns, which drops focus to
  // the page; give it back to the table so Space spins again.
  const wasSpinning = useRef(false);
  useEffect(() => {
    if (wasSpinning.current && !spin) {
      const active = document.activeElement;
      if (!active || active === document.body) rotorRef.current?.closest<HTMLElement>('.chance-layout')?.focus({ preventScroll: true });
    }
    wasSpinning.current = Boolean(spin);
  }, [spin]);

  return (
    <div className="chance-wheel" data-spinning={spin ? '' : undefined}>
      <div ref={rotorRef} className="chance-wheel-rotor" style={{ transform: `rotate(${angle}deg)` }}>
        <WheelFace options={options} winner={winner} rest={spin ? spin.to : angle} />
      </div>
      <WheelFrame />
    </div>
  );
};

// ---------- The tab ----------

export const WheelTab = ({ table }: { table: ReturnType<typeof useWheelTable> }) => {
  const { preset, options, edited, spinning, winner, spins, draft, addNote } = table;
  const inputRef = useRef<HTMLInputElement>(null);
  const canSpin = options.length >= MIN_WHEEL_OPTIONS;
  const full = options.length >= MAX_WHEEL_OPTIONS;

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    table.add();
  };

  const remove = useCallback((index: number) => {
    table.remove(index);
    inputRef.current?.focus({ preventScroll: true });
  }, [table]);

  const listHint = addNote === 'duplicate' ? 'Already on the wheel.'
    : addNote === 'full' || full ? `Up to ${MAX_WHEEL_OPTIONS} options.`
      : null;

  return (
    <ChanceTable
      label="Wheel"
      setup={
        <div className="chance-chips" role="group" aria-label="Presets">
          <span className="chance-setup-label">Presets</span>
          {WHEEL_PRESETS.map((option) => (
            <button
              type="button"
              className="chance-chip"
              key={option.id}
              aria-pressed={option.id === preset.id}
              disabled={spinning}
              onClick={() => table.choosePreset(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
      }
      result={
        spinning ? <span className="chance-result-note">Spinning…</span>
          : winner !== null && options[winner] ? (
            <>
              <span className="chance-result-note">{preset.label}</span>
              <strong className="chance-readout-value chance-wheel-winner">{options[winner]}</strong>
            </>
          ) : <span className="chance-result-note">{canSpin ? 'Spin to pick one.' : `Add at least ${MIN_WHEEL_OPTIONS} options to spin.`}</span>
      }
      action={{ label: spinning ? 'Spinning…' : 'Spin', onClick: table.spinWheel, disabled: spinning || !canSpin }}
      history={{
        title: 'History',
        count: spins.length,
        empty: 'Spins show up here.',
        onClear: table.clear,
        children: spins.map((entry, index) => (
          <li className="chance-history-entry" data-latest={index === 0 || undefined} key={entry.id}>
            <span className="chance-wheel-history-preset">{entry.preset}</span>
            <span className="chance-wheel-history-result">{entry.result}</span>
          </li>
        )),
      }}
    >
      <div className="chance-wheel-table">
        <Wheel table={table} />
        <div className="chance-wheel-side">
          <div className="chance-wheel-list-head">
            <span className="chance-wheel-list-title">{options.length === 1 ? '1 option' : `${options.length} options`}</span>
            {edited && (
              <button type="button" className="chance-wheel-reset" onClick={table.reset} disabled={spinning} title={`Back to the ${preset.label} list`}>
                Reset
              </button>
            )}
          </div>
          {options.length > 0 && (
            <ol className="chance-wheel-options" aria-label={`${preset.label} options`}>
              {options.map((option, index) => (
                <li className="chance-wheel-option" data-winner={!spinning && winner === index ? '' : undefined} key={option}>
                  <span className="chance-wheel-option-text" title={option}>{option}</span>
                  <button
                    type="button"
                    className="chance-wheel-remove"
                    aria-label={`Remove ${option}`}
                    title="Remove"
                    disabled={spinning}
                    onClick={() => remove(index)}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ol>
          )}
          <form className="app-joined-control chance-wheel-add" onSubmit={onSubmit}>
            <input
              ref={inputRef}
              type="text"
              className="search-input"
              value={draft}
              onChange={(event) => table.setDraft(event.target.value)}
              placeholder={full ? 'The wheel is full' : 'Add an option'}
              aria-label="New option"
              maxLength={60}
              disabled={spinning || full}
              autoComplete="off"
              enterKeyHint="done"
            />
            <RetroButton type="submit" size="icon" className="chance-wheel-add-button" aria-label="Add option" title="Add option" disabled={spinning || full}>
              <Plus className="w-4 h-4" />
            </RetroButton>
          </form>
          {listHint && <span className="chance-wheel-hint" aria-live="polite">{listHint}</span>}
        </div>
      </div>
    </ChanceTable>
  );
};

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { WindowLayout } from '@/components/window/WindowLayout';
import { RetroButton } from '@/components/ui/RetroButton';
import { usePersistedState } from '@/hooks/useStorage';
import {
  DEFAULT_STORED,
  EMPTY_STATE,
  TAPE_LIMIT,
  entryText,
  equals,
  lengthBand,
  renderTokens,
  transition,
  type CalculatorState,
  type CalculatorStored,
  type KeyAction,
  type TapeEntry,
} from './keypad';
import './calculator.css';

export interface CalculatorAppProps {
  onPropsChange?: (props: Record<string, unknown>) => void;
}

const STORAGE_KEY = 'app:calculator';

const normalizeStored = (stored: unknown, fallback: CalculatorStored): CalculatorStored => {
  const saved = (stored && typeof stored === 'object' ? stored : {}) as Partial<Record<keyof CalculatorStored, unknown>>;
  const tape = Array.isArray(saved.tape)
    ? saved.tape
        .filter((entry): entry is TapeEntry => {
          if (!entry || typeof entry !== 'object') return false;
          const candidate = entry as Partial<TapeEntry>;
          return typeof candidate.expression === 'string' && typeof candidate.result === 'string';
        })
        .slice(0, TAPE_LIMIT)
        .map(({ expression, result }) => ({ expression, result }))
    : fallback.tape;
  return { tape, tapeOpen: typeof saved.tapeOpen === 'boolean' ? saved.tapeOpen : fallback.tapeOpen };
};

const KEYBOARD_ACTIONS: Record<string, KeyAction> = {
  '.': { type: 'point' },
  '+': { type: 'operator', operator: '+' },
  '-': { type: 'operator', operator: '−' },
  '−': { type: 'operator', operator: '−' },
  '*': { type: 'operator', operator: '×' },
  '×': { type: 'operator', operator: '×' },
  '/': { type: 'operator', operator: '÷' },
  '÷': { type: 'operator', operator: '÷' },
  '%': { type: 'percent' },
  '(': { type: 'paren', which: 'open' },
  ')': { type: 'paren', which: 'close' },
  Enter: { type: 'equals' },
  '=': { type: 'equals' },
  Backspace: { type: 'backspace' },
  Escape: { type: 'clear' },
  c: { type: 'clear' },
  C: { type: 'clear' },
};

interface KeyDefinition {
  label: string;
  action: KeyAction;
  name?: string;
  /** Function-row keys span 4 of the 20 grid columns; everything else spans 5. */
  narrow?: boolean;
  primary?: boolean;
}

const digitKey = (digit: string): KeyDefinition => ({ label: digit, action: { type: 'digit', digit } });

const KEYS: KeyDefinition[] = [
  { label: 'AC', action: { type: 'clear' }, name: 'All clear', narrow: true },
  { label: '⌫', action: { type: 'backspace' }, name: 'Backspace', narrow: true },
  { label: '( )', action: { type: 'paren', which: 'auto' }, name: 'Parentheses', narrow: true },
  { label: '%', action: { type: 'percent' }, name: 'Percent', narrow: true },
  { label: '÷', action: { type: 'operator', operator: '÷' }, name: 'Divide', narrow: true, primary: true },
  digitKey('7'),
  digitKey('8'),
  digitKey('9'),
  { label: '×', action: { type: 'operator', operator: '×' }, name: 'Multiply', primary: true },
  digitKey('4'),
  digitKey('5'),
  digitKey('6'),
  { label: '−', action: { type: 'operator', operator: '−' }, name: 'Subtract', primary: true },
  digitKey('1'),
  digitKey('2'),
  digitKey('3'),
  { label: '+', action: { type: 'operator', operator: '+' }, name: 'Add', primary: true },
  { label: '±', action: { type: 'negate' }, name: 'Change sign' },
  digitKey('0'),
  { label: '.', action: { type: 'point' }, name: 'Decimal point' },
  { label: '=', action: { type: 'equals' }, name: 'Equals', primary: true },
];

export const CalculatorApp: React.FC<CalculatorAppProps> = () => {
  const [state, setState] = useState<CalculatorState>(EMPTY_STATE);
  const [stored, setStored] = usePersistedState<CalculatorStored>({
    key: STORAGE_KEY,
    defaultValue: DEFAULT_STORED,
    debounceMs: 200,
    normalize: normalizeStored,
  });
  const rootRef = useRef<HTMLDivElement>(null);
  const expressionRef = useRef<HTMLDivElement>(null);

  const expressionText = state.shown ? state.shown.expression : renderTokens(state.tokens);
  const resultText = entryText(state);

  useEffect(() => {
    rootRef.current?.focus({ preventScroll: true });
  }, []);

  // The newest tokens matter most, so a long expression clips at its start like a paper tape.
  useEffect(() => {
    const line = expressionRef.current;
    if (line) line.scrollLeft = line.scrollWidth;
  }, [expressionText]);

  const focusRoot = () => rootRef.current?.focus({ preventScroll: true });

  const dispatch = (action: KeyAction) => {
    if (action.type !== 'equals') {
      setState((previous) => transition(previous, action));
      return;
    }
    const outcome = equals(state);
    setState(outcome.state);
    if (outcome.entry) {
      const entry = outcome.entry;
      setStored((previous) => ({ ...previous, tape: [entry, ...previous.tape].slice(0, TAPE_LIMIT) }));
    }
  };

  const copyResult = useCallback(async () => {
    if (state.error) {
      toast('Nothing to copy');
      return;
    }
    try {
      await navigator.clipboard.writeText(resultText);
      toast('Copied');
    } catch (error) {
      console.warn('[Calculator] Could not copy the result:', error);
      toast('Could not copy');
    }
  }, [resultText, state.error]);

  const recall = (entry: TapeEntry) => {
    setState({ tokens: [], shown: { expression: `${entry.expression} =`, result: entry.result }, repeat: null, error: null });
    focusRoot();
  };

  const toggleTape = () => setStored((previous) => ({ ...previous, tapeOpen: !previous.tapeOpen }));
  const clearTape = () => setStored((previous) => ({ ...previous, tape: [] }));

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    const onControl = target !== event.currentTarget && target.closest('button') !== null;
    if ((event.ctrlKey || event.metaKey) && !event.altKey && (event.key === 'c' || event.key === 'C')) {
      // With text selected the browser's own copy should win.
      if (window.getSelection()?.toString()) return;
      event.preventDefault();
      void copyResult();
      return;
    }
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    // A focused button activates itself on Enter and Space; doing both would double the key.
    if (onControl && (event.key === 'Enter' || event.key === ' ')) return;
    const action = /^\d$/.test(event.key) ? { type: 'digit' as const, digit: event.key } : KEYBOARD_ACTIONS[event.key];
    if (!action) return;
    event.preventDefault();
    dispatch(action);
  };

  const pressKey = (action: KeyAction) => {
    dispatch(action);
    focusRoot();
  };

  return (
    <div ref={rootRef} className="calculator-root" tabIndex={0} onKeyDown={handleKeyDown} aria-label="Calculator">
      <WindowLayout
        toolbar={
          <div className="app-toolbar-row">
            <RetroButton size="sm" onClick={() => void copyResult()} title="Copy the result (Ctrl+C)">
              Copy
            </RetroButton>
            <RetroButton size="sm" active={stored.tapeOpen} aria-pressed={stored.tapeOpen} onClick={toggleTape}>
              Tape
            </RetroButton>
          </div>
        }
        footer={
          <div className="app-footer-row">
            <span className="text-xs opacity-50">{state.error ?? 'Ready'}</span>
            <span className="text-xs opacity-50">{stored.tape.length} on tape</span>
          </div>
        }
        hasPadding={false}
      >
        <div className="calculator-panel">
          <div className="calculator-display" role="status" aria-live="polite">
            <div ref={expressionRef} className="calculator-expression">
              {expressionText || ' '}
            </div>
            <div className="calculator-result" data-length={lengthBand(resultText)} data-error={state.error ? 'true' : undefined}>
              {resultText}
            </div>
          </div>
          <div className="calculator-body">
            {stored.tapeOpen && (
              <section className="calculator-tape" aria-label="Tape">
                <div className="calculator-tape-header">
                  <span>Tape</span>
                  <RetroButton size="sm" onClick={clearTape} disabled={stored.tape.length === 0}>
                    Clear tape
                  </RetroButton>
                </div>
                {stored.tape.length === 0 ? (
                  <p className="calculator-tape-empty">No calculations yet</p>
                ) : (
                  <ol className="calculator-tape-list">
                    {stored.tape.map((entry, index) => (
                      <li key={`${index}:${entry.expression}`}>
                        <button type="button" className="calculator-tape-entry" onClick={() => recall(entry)} title="Recall this result">
                          <span>{entry.expression} =</span>
                          <strong>{entry.result}</strong>
                        </button>
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            )}
            <div className="calculator-keys">
              {KEYS.map((key) => (
                <RetroButton
                  key={key.label}
                  size="md"
                  className="calculator-key"
                  variant={key.primary ? 'primary' : 'default'}
                  data-span={key.narrow ? '4' : undefined}
                  aria-label={key.name}
                  tabIndex={-1}
                  onClick={() => pressKey(key.action)}
                >
                  {key.label}
                </RetroButton>
              ))}
            </div>
          </div>
        </div>
      </WindowLayout>
    </div>
  );
};

export default CalculatorApp;

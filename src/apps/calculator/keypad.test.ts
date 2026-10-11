import { describe, expect, test } from 'bun:test';
import { EMPTY_STATE, entryText, equals, lengthBand, renderTokens, transition, type CalculatorState, type KeyAction } from './keypad';

/** Types a key sequence the way the app does: "=" goes through `equals`, everything else through `transition`. */
const press = (keys: string, from: CalculatorState = EMPTY_STATE) => {
  let state = from;
  let lastEntry: ReturnType<typeof equals>['entry'] = null;
  for (const key of keys) {
    if (key === ' ') continue;
    if (key === '=') {
      const outcome = equals(state);
      state = outcome.state;
      lastEntry = outcome.entry;
      continue;
    }
    state = transition(state, actionFor(key));
  }
  return { state, lastEntry, expression: state.shown?.expression ?? renderTokens(state.tokens), display: entryText(state) };
};

const actionFor = (key: string): Exclude<KeyAction, { type: 'equals' }> => {
  if (/^\d$/.test(key)) return { type: 'digit', digit: key };
  switch (key) {
    case '.': return { type: 'point' };
    case '+': case '−': case '×': case '÷': return { type: 'operator', operator: key };
    case '%': return { type: 'percent' };
    case 'p': return { type: 'paren', which: 'auto' };
    case '(': return { type: 'paren', which: 'open' };
    case ')': return { type: 'paren', which: 'close' };
    case '~': return { type: 'negate' };
    case '<': return { type: 'backspace' };
    case 'C': return { type: 'clear' };
  }
  throw new Error(`no key ${key}`);
};

describe('keypad', () => {
  test('builds an expression and evaluates it', () => {
    const { expression, display, lastEntry } = press('12 + 3 × 4 =');
    expect(expression).toBe('12 + 3 × 4 =');
    expect(display).toBe('24');
    expect(lastEntry).toEqual({ expression: '12 + 3 × 4', result: '24' });
  });

  test('"=" again repeats the last operation like a desk calculator', () => {
    const first = press('2 + 3 =');
    expect(first.display).toBe('5');
    const second = press('=', first.state);
    expect(second.display).toBe('8');
    expect(second.expression).toBe('5 + 3 =');
    expect(press('=', second.state).display).toBe('11');
  });

  test('a trailing operation inside parentheses does not repeat', () => {
    const shown = press('2 × (3 + 4 =');
    expect(shown.display).toBe('14');
    expect(press('=', shown.state).display).toBe('14');
  });

  test('a new number after a result replaces it; an operator continues from it', () => {
    const shown = press('2 + 3 =').state;
    expect(press('7', shown).expression).toBe('7');
    expect(press('× 2 =', shown).display).toBe('10');
    expect(press('%', shown).expression).toBe('5%');
  });

  test('typing after ")" or "%" multiplies implicitly and ( ) picks a side', () => {
    expect(press('p 2 + 3 p 4').expression).toBe('(2 + 3) × 4');
    expect(press('2 p 3 p').expression).toBe('2 × (3)');
    expect(press('50 % 2').expression).toBe('50% × 2');
    expect(press('2 + )').expression).toBe('2 +');
  });

  test('operators replace a dangling operator and minus can start a negative number', () => {
    expect(press('2 + ×').expression).toBe('2 ×');
    expect(press('2 × − 3 =').display).toBe('-6');
    expect(press('− 3 × − 2 =').display).toBe('6');
    expect(press('× 3 =').display).toBe('0');
  });

  test('negate flips the entry and backspace edits it', () => {
    expect(press('45 ~').display).toBe('-45');
    expect(press('45 ~ ~').display).toBe('45');
    expect(press('45 <').display).toBe('4');
    expect(press('45 + <').expression).toBe('45');
    expect(press('2 + 3 = <').expression).toBe('');
  });

  test('the decimal point is entered once and leading zeros collapse', () => {
    expect(press('0 0 7 . . 5').display).toBe('7.5');
    expect(press('.').display).toBe('0.');
    expect(press('~ .').display).toBe('-0.');
  });

  test('dangling operators and open parentheses are forgiven on "="', () => {
    expect(press('2 + =').display).toBe('2');
    expect(press('(2 + 3 =').display).toBe('5');
    expect(press('=').display).toBe('0');
  });

  test('a lone number is shown but not written to the tape', () => {
    const { display, lastEntry } = press('42 =');
    expect(display).toBe('42');
    expect(lastEntry).toBeNull();
  });

  test('errors show until the next key, which starts over', () => {
    const failed = press('5 ÷ 0 =');
    expect(failed.display).toBe('Error');
    expect(failed.state.error).toBe('Cannot divide by zero');
    expect(press('7', failed.state).expression).toBe('7');
    expect(press('C', failed.state)).toMatchObject({ display: '0', expression: '' });
  });
});

describe('display', () => {
  test('shows the number being typed, or the last one entered', () => {
    expect(press('').display).toBe('0');
    expect(press('12 +').display).toBe('12');
    expect(press('12 + −').display).toBe('-0');
  });

  test('steps the result size down by length', () => {
    expect(lengthBand('1234567890')).toBe('short');
    expect(lengthBand('12345678901')).toBe('medium');
    expect(lengthBand('0.00000000123456789012')).toBe('extra');
  });
});

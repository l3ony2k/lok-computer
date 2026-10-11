/**
 * The Calculator's keypad: what each key does to the expression being built.
 * Pure functions over a small state so the desk-calculator rules (repeat "=",
 * continuing from a result, implicit multiplication) are testable without React.
 */
import { evaluate } from './evaluate';

export const TAPE_LIMIT = 20;
/* Desk calculators stop accepting digits long before the display runs out. */
const ENTRY_MAX_DIGITS = 16;

const BINARY_OPERATORS = new Set(['+', '−', '×', '÷']);
const SYMBOLS = new Set([...BINARY_OPERATORS, '%', '(', ')']);

/*
 * The expression is a list of display tokens: number literals as typed (a lone
 * "-" is a negative number waiting for digits), the operator glyphs, "%", and
 * parentheses. The engine reads the same glyphs, so one rendering serves both.
 */
export type Token = string;

export interface TapeEntry {
  expression: string;
  result: string;
}

export interface CalculatorStored {
  tape: TapeEntry[];
  tapeOpen: boolean;
}

export interface CalculatorState {
  tokens: Token[];
  /** The last evaluation, shown until the next key either continues or replaces it. */
  shown: TapeEntry | null;
  /** The trailing operation, repeated by another "=" like a desk calculator. */
  repeat: { operator: Token; operand: Token } | null;
  error: string | null;
}

export type KeyAction =
  | { type: 'digit'; digit: string }
  | { type: 'point' }
  | { type: 'operator'; operator: Token }
  | { type: 'percent' }
  | { type: 'paren'; which: 'auto' | 'open' | 'close' }
  | { type: 'negate' }
  | { type: 'backspace' }
  | { type: 'clear' }
  | { type: 'equals' };

export const EMPTY_STATE: CalculatorState = { tokens: [], shown: null, repeat: null, error: null };
export const DEFAULT_STORED: CalculatorStored = { tape: [], tapeOpen: false };

const isNumber = (token: Token | undefined): token is Token => token !== undefined && !SYMBOLS.has(token);
/** Whether a binary operator, percent or closing parenthesis may follow. */
const endsValue = (token: Token | undefined): boolean =>
  token === ')' || token === '%' || (isNumber(token) && token !== '-');
const openParens = (tokens: Token[]): number =>
  tokens.reduce((depth, token) => depth + (token === '(' ? 1 : token === ')' ? -1 : 0), 0);
const lastOf = (tokens: Token[]): Token | undefined => tokens[tokens.length - 1];

export const renderTokens = (tokens: Token[]): string =>
  tokens.reduce((text, token, index) => {
    const previous = tokens[index - 1];
    const glued = index === 0 || previous === '(' || previous === '-' || token === ')' || token === '%';
    return text + (glued ? '' : ' ') + token;
  }, '');

/** An error clears on the next key, like AC. */
const settle = (state: CalculatorState): CalculatorState => (state.error ? EMPTY_STATE : state);
/** Starting a new number after a result replaces it. */
const startFresh = (state: CalculatorState): CalculatorState => (state.shown ? EMPTY_STATE : settle(state));
/** Starting with an operator continues from the result. */
const continueFromResult = (state: CalculatorState): CalculatorState =>
  state.shown ? { ...state, tokens: [state.shown.result], shown: null } : settle(state);

const pushDigit = (state: CalculatorState, digit: string): CalculatorState => {
  const base = startFresh(state);
  const tokens = [...base.tokens];
  const last = lastOf(tokens);
  if (isNumber(last)) {
    if (last.replace('-', '').length >= ENTRY_MAX_DIGITS) return base;
    // A lone zero is a placeholder, not a leading digit.
    tokens[tokens.length - 1] = last === '0' ? digit : last === '-0' ? `-${digit}` : last + digit;
  } else if (endsValue(last)) {
    // A number typed straight after ")" or "%" means multiplication.
    tokens.push('×', digit);
  } else {
    tokens.push(digit);
  }
  return { ...base, tokens };
};

const pushPoint = (state: CalculatorState): CalculatorState => {
  const base = startFresh(state);
  const tokens = [...base.tokens];
  const last = lastOf(tokens);
  if (isNumber(last)) {
    if (last.includes('.') || last.includes('e')) return base;
    tokens[tokens.length - 1] = last === '-' ? '-0.' : `${last}.`;
  } else if (endsValue(last)) {
    tokens.push('×', '0.');
  } else {
    tokens.push('0.');
  }
  return { ...base, tokens };
};

const pushOperator = (state: CalculatorState, operator: Token): CalculatorState => {
  const base = continueFromResult(state);
  const tokens = [...base.tokens];
  const last = lastOf(tokens);
  if (endsValue(last)) {
    tokens.push(operator);
  } else if (operator === '−' && last !== '-') {
    // Minus with nothing to subtract from starts a negative number, as in a typed "2*-3".
    tokens.push('-');
  } else if (last !== undefined && BINARY_OPERATORS.has(last)) {
    tokens[tokens.length - 1] = operator;
  } else if (last === undefined) {
    tokens.push('0', operator);
  } else {
    return base;
  }
  return { ...base, tokens };
};

const pushPercent = (state: CalculatorState): CalculatorState => {
  const base = continueFromResult(state);
  return endsValue(lastOf(base.tokens)) ? { ...base, tokens: [...base.tokens, '%'] } : base;
};

const pushParen = (state: CalculatorState, which: 'auto' | 'open' | 'close'): CalculatorState => {
  const base = continueFromResult(state);
  const tokens = [...base.tokens];
  const last = lastOf(tokens);
  const canClose = endsValue(last) && openParens(tokens) > 0;
  if (which === 'close' || (which === 'auto' && canClose)) {
    if (!canClose) return base;
    tokens.push(')');
  } else if (endsValue(last)) {
    tokens.push('×', '(');
  } else {
    tokens.push('(');
  }
  return { ...base, tokens };
};

const negate = (state: CalculatorState): CalculatorState => {
  const base = continueFromResult(state);
  const tokens = [...base.tokens];
  const last = lastOf(tokens);
  if (isNumber(last)) {
    const flipped = last.startsWith('-') ? last.slice(1) : `-${last}`;
    if (flipped === '') tokens.pop();
    else tokens[tokens.length - 1] = flipped;
  } else if (last === undefined || last === '(' || BINARY_OPERATORS.has(last)) {
    tokens.push('-');
  } else {
    return base;
  }
  return { ...base, tokens };
};

const backspace = (state: CalculatorState): CalculatorState => {
  if (state.shown || state.error) return EMPTY_STATE;
  const tokens = [...state.tokens];
  const last = lastOf(tokens);
  if (last === undefined) return state;
  // A result carried over in exponent form is one unit; trimming it would leave a half literal.
  if (isNumber(last) && last.length > 1 && !last.includes('e')) tokens[tokens.length - 1] = last.slice(0, -1);
  else tokens.pop();
  return { ...state, tokens };
};

const trimDangling = (tokens: Token[]): Token[] => {
  const trimmed = [...tokens];
  let last = lastOf(trimmed);
  while (last !== undefined && (BINARY_OPERATORS.has(last) || last === '(' || last === '-')) {
    trimmed.pop();
    last = lastOf(trimmed);
  }
  return trimmed;
};

const detectRepeat = (work: Token[]): CalculatorState['repeat'] => {
  const length = work.length;
  if (length < 3) return null;
  const operand = work[length - 1];
  const operator = work[length - 2];
  if (!isNumber(operand) || operand === '-' || !BINARY_OPERATORS.has(operator) || !endsValue(work[length - 3])) return null;
  // Only a top-level trailing operation repeats; one inside parentheses has no lone operand.
  if (openParens(work.slice(0, length - 2)) !== 0) return null;
  return { operator, operand };
};

export const equals = (state: CalculatorState): { state: CalculatorState; entry: TapeEntry | null } => {
  if (state.error) return { state: EMPTY_STATE, entry: null };
  let work: Token[];
  let repeat = state.repeat;
  if (state.shown) {
    if (!repeat) return { state, entry: null };
    work = [state.shown.result, repeat.operator, repeat.operand];
  } else {
    work = trimDangling(state.tokens);
    if (work.length === 0) return { state, entry: null };
    work.push(...Array.from({ length: openParens(work) }, () => ')'));
    repeat = detectRepeat(work);
  }
  const expression = renderTokens(work);
  const result = evaluate(expression);
  if (!result.ok) {
    return { state: { tokens: work, shown: null, repeat: null, error: result.error }, entry: null };
  }
  const shown = { expression: `${expression} =`, result: result.text };
  // A bare number is not a calculation worth a line on the tape.
  const entry = work.length > 1 ? { expression, result: result.text } : null;
  return { state: { tokens: [], shown, repeat, error: null }, entry };
};

export const transition = (state: CalculatorState, action: Exclude<KeyAction, { type: 'equals' }>): CalculatorState => {
  switch (action.type) {
    case 'digit':
      return pushDigit(state, action.digit);
    case 'point':
      return pushPoint(state);
    case 'operator':
      return pushOperator(state, action.operator);
    case 'percent':
      return pushPercent(state);
    case 'paren':
      return pushParen(state, action.which);
    case 'negate':
      return negate(state);
    case 'backspace':
      return backspace(state);
    case 'clear':
      return EMPTY_STATE;
  }
};

export const entryText = (state: CalculatorState): string => {
  if (state.error) return 'Error';
  if (state.shown) return state.shown.result;
  for (let index = state.tokens.length - 1; index >= 0; index -= 1) {
    const token = state.tokens[index];
    if (isNumber(token)) return token === '-' ? '-0' : token;
  }
  return '0';
};

export const lengthBand = (text: string): string => {
  if (text.length <= 10) return 'short';
  if (text.length <= 14) return 'medium';
  if (text.length <= 18) return 'long';
  if (text.length <= 24) return 'extra';
  return 'max';
};

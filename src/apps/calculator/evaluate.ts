/**
 * The Calculator's arithmetic engine: a tokenizer and a small recursive-descent
 * parser over `+ − × ÷` (ASCII `- * /` too), parentheses, unary minus and a
 * postfix percent (x% = x / 100). Pure and synchronous; the app formats the
 * expression and the engine only reads it.
 */

export type EvaluateErrorCode =
  | 'empty'
  | 'division-by-zero'
  | 'unbalanced-parentheses'
  | 'malformed'
  | 'unknown-character'
  | 'out-of-range';

export interface EvaluateSuccess {
  ok: true;
  value: number;
  text: string;
}

export interface EvaluateFailure {
  ok: false;
  error: string;
  code: EvaluateErrorCode;
}

export type EvaluateResult = EvaluateSuccess | EvaluateFailure;

const ERROR_MESSAGES: Record<EvaluateErrorCode, string> = {
  empty: 'Nothing to calculate',
  'division-by-zero': 'Cannot divide by zero',
  'unbalanced-parentheses': 'Unbalanced parentheses',
  malformed: 'Malformed expression',
  'unknown-character': 'Unknown character',
  'out-of-range': 'Out of range',
};

/** Floating-point noise sits far below this, so 0.1 + 0.2 reads as 0.3. */
const SIGNIFICANT_DIGITS = 12;
/** Plain digits beyond these magnitudes stop being readable at a glance. */
const PLAIN_MAX = 1e15;
const PLAIN_MIN = 1e-9;

class CalculatorError extends Error {
  constructor(readonly code: EvaluateErrorCode) {
    super(ERROR_MESSAGES[code]);
  }
}

type BinaryOperator = '+' | '-' | '*' | '/';

type Token =
  | { kind: 'number'; value: number }
  | { kind: 'operator'; operator: BinaryOperator }
  | { kind: 'percent' }
  | { kind: 'open' }
  | { kind: 'close' };

const OPERATOR_GLYPHS: Record<string, BinaryOperator> = {
  '+': '+',
  '-': '-',
  '−': '-',
  '*': '*',
  '×': '*',
  '/': '/',
  '÷': '/',
};

/* Decimal literals, optionally in exponent form so a formatted result (1e+20) can be fed back in. */
const NUMBER_PATTERN = /(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/y;

const tokenize = (source: string): Token[] => {
  const tokens: Token[] = [];
  let index = 0;
  while (index < source.length) {
    const char = source[index];
    if (/\s/.test(char)) {
      index += 1;
      continue;
    }
    if ((char >= '0' && char <= '9') || char === '.') {
      NUMBER_PATTERN.lastIndex = index;
      const match = NUMBER_PATTERN.exec(source);
      if (!match) throw new CalculatorError('malformed');
      tokens.push({ kind: 'number', value: Number(match[0]) });
      index += match[0].length;
      continue;
    }
    const operator = OPERATOR_GLYPHS[char];
    if (operator) tokens.push({ kind: 'operator', operator });
    else if (char === '%') tokens.push({ kind: 'percent' });
    else if (char === '(') tokens.push({ kind: 'open' });
    else if (char === ')') tokens.push({ kind: 'close' });
    else throw new CalculatorError('unknown-character');
    index += 1;
  }
  return tokens;
};

/*
 * Grammar, loosest to tightest:
 *   expression := term (('+' | '-') term)*
 *   term       := unary (('*' | '/') unary)*
 *   unary      := '-' unary | postfix
 *   postfix    := primary '%'*
 *   primary    := number | '(' expression ')'
 */
class Parser {
  private index = 0;

  constructor(private readonly tokens: Token[]) {}

  parse(): number {
    const value = this.expression();
    if (this.index < this.tokens.length) {
      throw new CalculatorError(this.peek()?.kind === 'close' ? 'unbalanced-parentheses' : 'malformed');
    }
    return value;
  }

  private peek(): Token | undefined {
    return this.tokens[this.index];
  }

  private takeOperator(...accepted: BinaryOperator[]): BinaryOperator | null {
    const token = this.peek();
    if (token?.kind !== 'operator' || !accepted.includes(token.operator)) return null;
    this.index += 1;
    return token.operator;
  }

  private expression(): number {
    let left = this.term();
    for (let operator = this.takeOperator('+', '-'); operator; operator = this.takeOperator('+', '-')) {
      const right = this.term();
      left = operator === '+' ? left + right : left - right;
    }
    return left;
  }

  private term(): number {
    let left = this.unary();
    for (let operator = this.takeOperator('*', '/'); operator; operator = this.takeOperator('*', '/')) {
      const right = this.unary();
      if (operator === '/' && right === 0) throw new CalculatorError('division-by-zero');
      left = operator === '*' ? left * right : left / right;
    }
    return left;
  }

  private unary(): number {
    if (this.takeOperator('-')) return -this.unary();
    return this.postfix();
  }

  private postfix(): number {
    let value = this.primary();
    while (this.peek()?.kind === 'percent') {
      this.index += 1;
      value /= 100;
    }
    return value;
  }

  private primary(): number {
    const token = this.peek();
    if (!token) throw new CalculatorError('malformed');
    if (token.kind === 'number') {
      this.index += 1;
      return token.value;
    }
    if (token.kind === 'open') {
      this.index += 1;
      const value = this.expression();
      if (this.peek()?.kind !== 'close') throw new CalculatorError('unbalanced-parentheses');
      this.index += 1;
      return value;
    }
    throw new CalculatorError('malformed');
  }
}

/**
 * Plain decimal text with at most 12 significant digits, no locale separators,
 * and exponent notation only beyond 1e15 or below 1e-9.
 */
export const formatNumber = (value: number): string => {
  if (!Number.isFinite(value)) return String(value);
  if (value === 0) return '0';
  const [mantissa, exponentText] = value.toExponential(SIGNIFICANT_DIGITS - 1).split('e');
  const exponent = Number(exponentText);
  const sign = mantissa.startsWith('-') ? '-' : '';
  // Significant digits with the point removed and padding zeros dropped: "1.20000000000" -> "12".
  const digits = mantissa.replace('-', '').replace('.', '').replace(/0+$/, '') || '0';
  const magnitude = Math.abs(value);
  if (magnitude > PLAIN_MAX || magnitude < PLAIN_MIN) {
    const fraction = digits.length > 1 ? `.${digits.slice(1)}` : '';
    return `${sign}${digits[0]}${fraction}e${exponent < 0 ? '-' : '+'}${Math.abs(exponent)}`;
  }
  if (exponent < 0) return `${sign}0.${'0'.repeat(-exponent - 1)}${digits}`;
  if (digits.length <= exponent + 1) return sign + digits.padEnd(exponent + 1, '0');
  return `${sign}${digits.slice(0, exponent + 1)}.${digits.slice(exponent + 1)}`;
};

export const evaluate = (expression: string): EvaluateResult => {
  try {
    const tokens = tokenize(expression);
    if (tokens.length === 0) throw new CalculatorError('empty');
    const raw = new Parser(tokens).parse();
    if (!Number.isFinite(raw)) throw new CalculatorError('out-of-range');
    const value = Number(raw.toPrecision(SIGNIFICANT_DIGITS));
    return { ok: true, value, text: formatNumber(value) };
  } catch (error) {
    if (error instanceof CalculatorError) return { ok: false, error: error.message, code: error.code };
    throw error;
  }
};

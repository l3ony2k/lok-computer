import { describe, expect, test } from 'bun:test';
import { evaluate, formatNumber } from './evaluate';

const value = (expression: string) => {
  const result = evaluate(expression);
  if (!result.ok) throw new Error(`expected ${expression} to evaluate, got ${result.code}`);
  return result;
};

const failure = (expression: string) => {
  const result = evaluate(expression);
  if (result.ok) throw new Error(`expected ${expression} to fail, got ${result.text}`);
  return result;
};

describe('evaluate', () => {
  test('multiplies and divides before adding and subtracting', () => {
    expect(value('2 + 3 × 4').value).toBe(14);
    expect(value('20 − 6 ÷ 3').value).toBe(18);
    expect(value('2 + 3 * 4 - 8 / 2').value).toBe(10);
  });

  test('evaluates left to right within one precedence level', () => {
    expect(value('10 − 4 − 3').value).toBe(3);
    expect(value('100 ÷ 10 ÷ 2').value).toBe(5);
  });

  test('parentheses override precedence and nest', () => {
    expect(value('(2 + 3) × 4').value).toBe(20);
    expect(value('((1 + 2) × (3 + 4)) ÷ 7').value).toBe(3);
  });

  test('unary minus applies to numbers and groups', () => {
    expect(value('−3×−2').value).toBe(6);
    expect(value('-(2 + 3)').value).toBe(-5);
    expect(value('2 − −3').value).toBe(5);
    expect(value('−3 + 2').value).toBe(-1);
  });

  test('postfix percent divides by one hundred', () => {
    expect(value('50%').value).toBe(0.5);
    expect(value('200×10%').value).toBe(20);
    expect(value('(20 + 30)%').value).toBe(0.5);
  });

  test('decimals round to twelve significant digits', () => {
    expect(value('0.1 + 0.2').text).toBe('0.3');
    expect(value('.5 + 1.').value).toBe(1.5);
    expect(value('1 ÷ 3').text).toBe('0.333333333333');
  });

  test('rejects division by zero instead of producing infinity', () => {
    expect(failure('5 ÷ 0').code).toBe('division-by-zero');
    expect(failure('1 / (2 − 2)').code).toBe('division-by-zero');
    expect(failure('0 ÷ 0').code).toBe('division-by-zero');
  });

  test('rejects unbalanced parentheses', () => {
    expect(failure('(2 + 3').code).toBe('unbalanced-parentheses');
    expect(failure('2 + 3)').code).toBe('unbalanced-parentheses');
  });

  test('rejects empty and malformed input with a message', () => {
    expect(failure('').code).toBe('empty');
    expect(failure('   ').code).toBe('empty');
    expect(failure('2 +').code).toBe('malformed');
    expect(failure('× 2').code).toBe('malformed');
    expect(failure('1.2.3').code).toBe('malformed');
    expect(failure('()').code).toBe('malformed');
    expect(failure('2 $ 3').code).toBe('unknown-character');
    expect(failure('2 +').error).toBe('Malformed expression');
  });

  test('accepts its own formatted output as input', () => {
    const big = value('1000000000 × 10000000').text;
    expect(big).toBe('1e+16');
    expect(value(`${big} ÷ 10`).text).toBe('1000000000000000');
  });
});

describe('formatNumber', () => {
  test('writes plain digits without separators', () => {
    expect(formatNumber(1234567.5)).toBe('1234567.5');
    expect(formatNumber(-42)).toBe('-42');
    expect(formatNumber(1e15)).toBe('1000000000000000');
    expect(formatNumber(0.000000001)).toBe('0.000000001');
  });

  test('switches to exponent notation beyond 1e15 and below 1e-9', () => {
    expect(formatNumber(2e15)).toBe('2e+15');
    expect(formatNumber(-1.25e20)).toBe('-1.25e+20');
    expect(formatNumber(1e-10)).toBe('1e-10');
  });

  test('drops floating-point noise and negative zero', () => {
    expect(formatNumber(0.1 + 0.2)).toBe('0.3');
    expect(formatNumber(1.0000000000001)).toBe('1');
    expect(formatNumber(-0)).toBe('0');
  });
});

import { describe, it, expect } from 'vitest';
import { formatAmount, parsePrice, totalDifference } from './price.utils';

describe('formatAmount (spec 0013, Q32)', () => {
  it.each([
    [1290, '1.290'],
    [990, '990'],
    [1234567, '1.234.567'],
    [0, '0'],
  ])('%s → "%s"', (n, expected) => {
    expect(formatAmount(n)).toBe(expected);
  });

  it('sin monto → vacío', () => {
    expect(formatAmount(null)).toBe('');
  });
});

describe('totalDifference (spec 0013, Q32)', () => {
  it('total pagado menos la suma de precios', () => {
    expect(totalDifference(15000, 12500)).toBe(2500);
    expect(totalDifference(10000, 12500)).toBe(-2500);
  });

  it('sin total, sin precios o si calzan → null (no hay nada que mostrar)', () => {
    expect(totalDifference(null, 12500)).toBeNull();
    expect(totalDifference(15000, 0)).toBeNull();
    expect(totalDifference(12500, 12500)).toBeNull();
  });
});

describe('parsePrice', () => {
  it.each([
    ['1290', 1290],
    [' 3490 ', 3490],
    ['0', 0],
    ['1290.6', 1291], // CLP sin decimales
  ])('"%s" → %s', (raw, expected) => {
    expect(parsePrice(raw)).toBe(expected);
  });

  it.each([[''], ['   '], ['abc'], ['-10'], ['Infinity']])('"%s" no es un precio → null', (raw) => {
    expect(parsePrice(raw)).toBeNull();
  });
});

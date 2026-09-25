import { describe, it, expect } from 'vitest';
import { parsePrice } from './price.utils';

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

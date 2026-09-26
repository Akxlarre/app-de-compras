import { describe, it, expect } from 'vitest';
import { formatInviteCode, normalizeInviteCode } from './family.utils';

describe('normalizeInviteCode', () => {
  it.each([
    ['ABCDEFGH', 'ABCDEFGH'],
    ['abcd-efgh', 'ABCDEFGH'],
    ['  AbCd EfGh ', 'ABCDEFGH'],
    ['K7M2-P9QX', 'K7M2P9QX'],
  ])('"%s" → %s', (input, code) => {
    expect(normalizeInviteCode(input)).toBe(code);
  });

  it.each([
    ['', 'vacío'],
    ['ABCDEFG', 'corto'],
    ['ABCDEFGHJ', 'largo'],
    ['ABCD-EFG0', 'con 0 (no está en el alfabeto)'],
    ['ABCD-EFGI', 'con I'],
    ['7f3a9c2e-1b4d-4e8f-9a6b-2c5d8e1f3a7b', 'un UUID viejo'],
  ])('"%s" (%s) → null', (input) => {
    expect(normalizeInviteCode(input)).toBeNull();
  });
});

describe('formatInviteCode', () => {
  it('separa en dos grupos de 4', () => {
    expect(formatInviteCode('ABCDEFGH')).toBe('ABCD-EFGH');
  });

  it('deja tal cual algo que no tiene 8 caracteres', () => {
    expect(formatInviteCode('ABC')).toBe('ABC');
  });
});

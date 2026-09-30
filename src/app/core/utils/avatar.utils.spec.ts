import { describe, expect, it } from 'vitest';
import { AVATAR_TONES, avatarTone, initialsOf } from './avatar.utils';

describe('initialsOf (spec 0013, Q42)', () => {
  it('dos palabras: inicial de la primera y de la última', () => {
    expect(initialsOf('Ana María Pérez')).toBe('AP');
  });

  it('una palabra con número: letra + número, para que test3 y test4 no se vean iguales', () => {
    expect(initialsOf('test3')).toBe('T3');
    expect(initialsOf('test4')).toBe('T4');
    expect(initialsOf('juan12')).toBe('J1');
  });

  it('una palabra sin número: dos primeras letras', () => {
    expect(initialsOf('beto')).toBe('BE');
  });

  it('vacío o solo espacios: "?"', () => {
    expect(initialsOf('')).toBe('?');
    expect(initialsOf('   ')).toBe('?');
  });

  it('no se cae con nombres enormes', () => {
    expect(initialsOf(' '.repeat(100000) + 'x')).toBe('?');
  });
});

describe('avatarTone (spec 0013, Q42)', () => {
  it('el mismo usuario siempre tiene el mismo tono de la paleta', () => {
    const tone = avatarTone('user-1');
    expect(AVATAR_TONES).toContain(tone);
    expect(avatarTone('user-1')).toBe(tone);
  });

  it('usuarios distintos se reparten en la paleta', () => {
    const tones = new Set(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map(avatarTone));
    expect(tones.size).toBeGreaterThan(1);
  });
});

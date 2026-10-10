import { describe, it, expect } from 'vitest';
import { formatQuantity, hasStepper, isDecimalUnit, parseQuantity, unitLabel } from './units.utils';

describe('unidades (spec 0019 D4)', () => {
  it('kg y L admiten decimales; un y paquete usan el stepper', () => {
    expect(['un', 'kg', 'g', 'L', 'ml', 'paquete'].map((u) => isDecimalUnit(u as never))).toEqual([
      false,
      true,
      false,
      true,
      false,
      false,
    ]);
    expect(['un', 'kg', 'g', 'L', 'ml', 'paquete'].map((u) => hasStepper(u as never))).toEqual([
      true,
      false,
      false,
      false,
      false,
      true,
    ]);
    expect(hasStepper(undefined)).toBe(true);
  });

  it('formatQuantity: "1,5 kg", "500 g", "2 paq."; en unidades, solo el número', () => {
    expect(formatQuantity(1.5, 'kg')).toBe('1,5 kg');
    expect(formatQuantity(2, 'L')).toBe('2 L');
    expect(formatQuantity(500, 'g')).toBe('500 g');
    expect(formatQuantity(2, 'paquete')).toBe('2 paq.');
    expect(formatQuantity(3, 'un')).toBe('3');
    expect(formatQuantity(3, undefined)).toBe('3');
    expect(formatQuantity(0.25, 'kg')).toBe('0,25 kg');
  });

  it('unitLabel: el nombre que se ve en los botones', () => {
    expect(unitLabel('un')).toBe('Unidad');
    expect(unitLabel('paquete')).toBe('Paquete');
    expect(unitLabel('kg')).toBe('kg');
  });

  it('parseQuantity: coma o punto, mayor que 0, decimales solo en kg y L', () => {
    expect(parseQuantity('1,5', 'kg')).toBe(1.5);
    expect(parseQuantity(' 0.75 ', 'L')).toBe(0.75);
    expect(parseQuantity('1,234', 'kg')).toBe(1.23);
    expect(parseQuantity('500', 'g')).toBe(500);
    expect(parseQuantity('1,5', 'un')).toBeNull();
    expect(parseQuantity('0', 'kg')).toBeNull();
    expect(parseQuantity('-1', 'un')).toBeNull();
    expect(parseQuantity('abc', 'kg')).toBeNull();
    expect(parseQuantity('', 'un')).toBeNull();
    expect(parseQuantity('100000', 'g')).toBeNull();
  });
});

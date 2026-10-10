import { describe, it, expect } from 'vitest';
import { aisleOf, groupByAisle } from './aisles.utils';

const item = (
  id: string,
  category: string | null,
  checked = false,
  created = `2026-10-10T10:0${id}:00Z`
) => ({
  id,
  created_at: created,
  is_checked: checked,
  product: { name: id, category },
});

describe('aisleOf (spec 0019 D1)', () => {
  it('un pasillo conocido se respeta; lo demás es "Otros"', () => {
    expect(aisleOf('Limpieza')).toBe('Limpieza');
    expect(aisleOf('Ferretería')).toBe('Otros');
    expect(aisleOf(null)).toBe('Otros');
    expect(aisleOf(undefined)).toBe('Otros');
  });
});

describe('groupByAisle (spec 0019 D3)', () => {
  it('agrupa en el orden del súper, sin pasillos vacíos', () => {
    const groups = groupByAisle([
      item('1', 'Limpieza'),
      item('2', 'Frutas y verduras'),
      item('3', null),
      item('4', 'Frutas y verduras'),
    ]);
    expect(groups.map((g) => [g.aisle, g.items.map((i) => i.id)])).toEqual([
      ['Frutas y verduras', ['2', '4']],
      ['Limpieza', ['1']],
      ['Otros', ['3']],
    ]);
  });

  it('dentro de cada pasillo, los marcados al final y el resto como se agregó', () => {
    const groups = groupByAisle([
      item('1', 'Despensa', true),
      item('2', 'Despensa'),
      item('3', 'Despensa'),
    ]);
    expect(groups[0].items.map((i) => i.id)).toEqual(['2', '3', '1']);
  });

  it('cuenta los pendientes de cada pasillo', () => {
    const groups = groupByAisle([item('1', 'Bebidas', true), item('2', 'Bebidas')]);
    expect(groups[0].pending).toBe(1);
  });

  it('sin ítems, sin grupos', () => {
    expect(groupByAisle([])).toEqual([]);
  });
});

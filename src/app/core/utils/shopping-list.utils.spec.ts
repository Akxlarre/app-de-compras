import { describe, expect, it } from 'vitest';
import { sortListItems } from './shopping-list.utils';

const item = (id: string, created_at: string, is_checked = false) => ({
  id,
  created_at,
  is_checked,
});

describe('sortListItems (spec 0013, Q19)', () => {
  it('pendientes arriba y marcados abajo', () => {
    const items = [item('a', '2026-09-30T10:00:00Z', true), item('b', '2026-09-30T11:00:00Z')];
    expect(sortListItems(items).map((i) => i.id)).toEqual(['b', 'a']);
  });

  it('dentro de cada grupo, en el orden en que se agregaron (no el del servidor)', () => {
    const items = [
      item('c', '2026-09-30T12:00:00Z'),
      item('a', '2026-09-30T10:00:00Z'),
      item('z', '2026-09-30T09:00:00Z', true),
      item('b', '2026-09-30T11:00:00Z'),
      item('y', '2026-09-30T08:00:00Z', true),
    ];
    expect(sortListItems(items).map((i) => i.id)).toEqual(['a', 'b', 'c', 'y', 'z']);
  });

  it('al desmarcar, el producto vuelve a su lugar original', () => {
    const before = [item('a', '1'), item('b', '2'), item('c', '3')];
    const checked = sortListItems(
      before.map((i) => (i.id === 'b' ? { ...i, is_checked: true } : i))
    );
    expect(checked.map((i) => i.id)).toEqual(['a', 'c', 'b']);
    const unchecked = sortListItems(checked.map((i) => ({ ...i, is_checked: false })));
    expect(unchecked.map((i) => i.id)).toEqual(['a', 'b', 'c']);
  });

  it('misma fecha: desempata por id (orden estable entre recargas)', () => {
    const items = [item('b', '1'), item('a', '1')];
    expect(sortListItems(items).map((i) => i.id)).toEqual(['a', 'b']);
  });

  it('no muta el arreglo recibido', () => {
    const items = [item('b', '2'), item('a', '1')];
    sortListItems(items);
    expect(items.map((i) => i.id)).toEqual(['b', 'a']);
  });
});

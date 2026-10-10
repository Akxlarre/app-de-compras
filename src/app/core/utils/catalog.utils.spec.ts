import { describe, it, expect } from 'vitest';
import { filterCatalog, sortCatalog } from './catalog.utils';

const p = (id: string, name: string, over: object = {}) => ({
  id,
  name,
  category: 'Otros',
  last_price: 1000 as number | null,
  daysSincePurchase: null as number | null,
  ...over,
});

const list = [
  p('a', 'Arroz', { category: 'Despensa', daysSincePurchase: 3 }),
  p('b', 'Leche', { category: 'Lácteos y huevos', daysSincePurchase: 30, last_price: null }),
  p('c', 'Pan', { category: 'Panadería' }),
  p('d', 'Detergente', { category: 'Limpieza', daysSincePurchase: 30, last_price: null }),
];

describe('sortCatalog (spec 0022 D1)', () => {
  it('A–Z por nombre, sin tildes ni mayúsculas', () => {
    expect(
      sortCatalog([p('1', 'leche'), p('2', 'Ácido'), p('3', 'Bebida')], 'name', new Map()).map(
        (x) => x.name
      )
    ).toEqual(['Ácido', 'Bebida', 'leche']);
  });

  it('más comprados primero; empate por nombre; sin compras al final', () => {
    const counts = new Map([
      ['a', 2],
      ['b', 5],
      ['d', 2],
    ]);
    expect(sortCatalog(list, 'most', counts).map((x) => x.id)).toEqual(['b', 'a', 'd', 'c']);
  });

  it('hace más tiempo primero; nunca comprados al final', () => {
    expect(sortCatalog(list, 'oldest', new Map()).map((x) => x.id)).toEqual(['d', 'b', 'a', 'c']);
  });

  it('no muta la lista recibida', () => {
    const copy = [...list];
    sortCatalog(list, 'oldest', new Map());
    expect(list).toEqual(copy);
  });
});

describe('filterCatalog (spec 0022 D2)', () => {
  it('sin filtros devuelve todo', () => {
    expect(filterCatalog(list, { query: '', aisle: null, noPrice: false })).toHaveLength(4);
  });

  it('sin precio, por pasillo y con el buscador se combinan', () => {
    expect(filterCatalog(list, { query: '', aisle: null, noPrice: true }).map((x) => x.id)).toEqual(
      ['b', 'd']
    );
    expect(
      filterCatalog(list, { query: '', aisle: 'Limpieza', noPrice: true }).map((x) => x.id)
    ).toEqual(['d']);
    expect(
      filterCatalog(list, { query: 'lech', aisle: null, noPrice: true }).map((x) => x.id)
    ).toEqual(['b']);
    expect(filterCatalog(list, { query: 'arroz', aisle: 'Limpieza', noPrice: false })).toEqual([]);
  });

  it('un pasillo desconocido cuenta como "Otros"', () => {
    const odd = [p('x', 'Cosa', { category: null })];
    expect(filterCatalog(odd, { query: '', aisle: 'Otros', noPrice: false })).toHaveLength(1);
  });
});

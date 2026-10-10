import { describe, expect, it } from 'vitest';
import { buyEvery, matchesSearch, purchaseHistory } from './product-sheet.utils';

describe('purchaseHistory (spec 0017 AC2)', () => {
  it('ordena de la más reciente a la más vieja y une las tiendas de sus boletas', () => {
    const rows = [
      { quantity: 1, unit_price: 1100, list: { id: 'l1', completed_at: '2026-09-20T12:00:00Z', receipts: [] } },
      {
        quantity: 2,
        unit_price: 1290,
        list: {
          id: 'l2',
          completed_at: '2026-10-05T12:00:00Z',
          receipts: [{ store: 'Aroca' }, { store: null }, { store: 'Pedregal' }],
        },
      },
    ];

    expect(purchaseHistory(rows)).toEqual([
      { listId: 'l2', date: '2026-10-05T12:00:00Z', stores: 'Aroca · Pedregal', quantity: 2, unitPrice: 1290 },
      { listId: 'l1', date: '2026-09-20T12:00:00Z', stores: null, quantity: 1, unitPrice: 1100 },
    ]);
  });

  it('sin cantidad cuenta 1; sin precio queda null; sin fecha no se muestra', () => {
    const rows = [
      { quantity: null, unit_price: null, list: { id: 'l1', completed_at: '2026-10-01T12:00:00Z', receipts: null } },
      { quantity: 1, unit_price: 500, list: { id: 'l2', completed_at: null, receipts: null } },
    ];
    expect(purchaseHistory(rows)).toEqual([
      { listId: 'l1', date: '2026-10-01T12:00:00Z', stores: null, quantity: 1, unitPrice: null },
    ]);
  });
});

describe('buyEvery', () => {
  it('con 2 o más compras dice cada cuánto (redondeado)', () => {
    expect(buyEvery({ purchase_count: 3, median_interval_days: 10.6 })).toBe(
      'Lo compras cada ~11 días · 3 compras'
    );
    expect(buyEvery({ purchase_count: 2, median_interval_days: 1 })).toBe(
      'Lo compras cada ~1 día · 2 compras'
    );
  });

  it('con menos de 2 compras o sin estadística no dice nada', () => {
    expect(buyEvery({ purchase_count: 1, median_interval_days: null })).toBeNull();
    expect(buyEvery(undefined)).toBeNull();
  });
});

describe('matchesSearch (spec 0017 AC9)', () => {
  it('ignora tildes, mayúsculas y espacios de más', () => {
    expect(matchesSearch('Champiñones', 'champi')).toBe(true);
    expect(matchesSearch('Café molido', 'CAFE')).toBe(true);
    expect(matchesSearch('Detergente líquido', '  liquido ')).toBe(true);
    expect(matchesSearch('Leche', 'pan')).toBe(false);
  });

  it('un término vacío deja pasar todo', () => {
    expect(matchesSearch('Leche', '  ')).toBe(true);
  });
});

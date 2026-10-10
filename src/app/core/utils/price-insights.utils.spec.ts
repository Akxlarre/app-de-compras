import { describe, expect, it } from 'vitest';
import type { StorePriceRow } from '@core/models/price-insights.model';
import type { ProductPurchase } from '@core/models/product-sheet.model';
import { lastRise, priceRise, pricesByStore } from './price-insights.utils';

const row = (
  store: string | null,
  date: string,
  unit_price: number | null,
  over: Partial<StorePriceRow> = {}
): StorePriceRow => ({
  unit_price,
  quantity: 1,
  amount: unit_price ?? 0,
  receipt: store === null ? null : { store, purchased_at: date },
  list: { completed_at: date },
  ...over,
});

describe('pricesByStore (spec 0020 D1)', () => {
  it('deja el último precio de cada tienda, del más barato al más caro', () => {
    const prices = pricesByStore([
      row('Jumbo', '2026-09-20', 2350),
      row('Líder', '2026-09-01', 2290),
      row('Líder', '2026-10-05', 2190),
      row('Jumbo', '2026-08-10', 2100),
    ]);
    expect(prices).toEqual([
      { store: 'Líder', unitPrice: 2190, date: '2026-10-05' },
      { store: 'Jumbo', unitPrice: 2350, date: '2026-09-20' },
    ]);
  });

  it('sin precio unitario lo saca del monto y la cantidad; sin tienda no cuenta', () => {
    const prices = pricesByStore([
      row('Aroca', '2026-10-05', null, { quantity: 2, amount: 2980 }),
      row(null, '2026-10-01', 900),
    ]);
    expect(prices).toEqual([{ store: 'Aroca', unitPrice: 1490, date: '2026-10-05' }]);
  });

  it('sin fecha de boleta usa la del cierre de la compra', () => {
    const r = row('Aroca', '2026-10-05', 1000);
    r.receipt!.purchased_at = null;
    expect(pricesByStore([r])[0].date).toBe('2026-10-05');
  });
});

describe('priceRise (spec 0020 D2)', () => {
  it('avisa desde 10% de subida, redondeado', () => {
    expect(priceRise(1000, 1180)).toBe(18);
    expect(priceRise(1000, 1100)).toBe(10);
  });

  it('menos de 10%, bajas o sin precio anterior no avisan', () => {
    expect(priceRise(1000, 1090)).toBeNull();
    expect(priceRise(1000, 900)).toBeNull();
    expect(priceRise(null, 900)).toBeNull();
    expect(priceRise(0, 900)).toBeNull();
  });
});

describe('lastRise', () => {
  const p = (
    date: string,
    unitPrice: number | null,
    stores: string | null = null
  ): ProductPurchase => ({
    listId: date,
    date,
    stores,
    quantity: 1,
    unitPrice,
  });

  it('compara la última con la anterior de la misma tienda si se sabe', () => {
    expect(
      lastRise([
        p('2026-10-05', 1180, 'Líder'),
        p('2026-10-01', 1300, 'Jumbo'),
        p('2026-09-01', 1000, 'Líder'),
      ])
    ).toBe(18);
  });

  it('sin tienda compara con la anterior con precio', () => {
    expect(lastRise([p('2026-10-05', 1200), p('2026-10-01', null), p('2026-09-01', 1000)])).toBe(
      20
    );
  });

  it('con una sola compra no hay con qué comparar', () => {
    expect(lastRise([p('2026-10-05', 1200)])).toBeNull();
  });
});

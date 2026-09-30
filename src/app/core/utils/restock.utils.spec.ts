import { describe, it, expect } from 'vitest';
import { restockIntervalDays, restockSuggestions, snoozeUntil } from './restock.utils';
import type { Product } from '@core/models/product.model';
import type { RestockStat } from '@core/models/restock.model';

const now = new Date(2026, 8, 30, 10, 0);
const daysAgo = (n: number) => new Date(2026, 8, 30 - n, 9, 0).toISOString();
const product = (id: string, extra: Partial<Product> = {}): Product =>
  ({ id, name: id, family_id: 'f', created_at: '', updated_at: '', ...extra }) as Product;
const stat = (product_id: string, count: number, median: number | null, last: number): RestockStat => ({
  product_id,
  purchase_count: count,
  median_interval_days: median,
  last_purchased_at: daysAgo(last),
});

describe('restockIntervalDays (spec 0014)', () => {
  it('con 2+ compras usa la mediana del historial', () => {
    expect(restockIntervalDays(product('aceite'), stat('aceite', 3, 30, 1))).toEqual({
      days: 30,
      learned: true,
    });
  });

  it('con una sola compra usa 7 días, o la duración estimada si existe', () => {
    expect(restockIntervalDays(product('pan'), stat('pan', 1, null, 1))).toEqual({
      days: 7,
      learned: false,
    });
    expect(
      restockIntervalDays(product('arroz', { estimated_duration_days: 20 }), undefined)
    ).toEqual({ days: 20, learned: false });
  });

  it('nunca menos de 1 día (compras seguidas)', () => {
    expect(restockIntervalDays(product('x'), stat('x', 4, 0, 1)).days).toBe(1);
  });
});

describe('restockSuggestions (spec 0014)', () => {
  const products = [
    product('leche'),
    product('aceite'),
    product('pan'),
    product('nuevo'), // nunca comprado
  ];
  const stats = [
    stat('leche', 4, 10, 12), // toca: 12 ≥ 10
    stat('aceite', 3, 30, 12), // no toca: 12 < 30
    stat('pan', 1, null, 8), // toca: 8 ≥ 7 (una compra)
  ];

  it('sugiere lo que ya toca según su propio intervalo, el más atrasado primero', () => {
    const s = restockSuggestions(products, stats, new Set(), now);

    expect(s.map((x) => x.product.id)).toEqual(['leche', 'pan']);
    expect(s[0]).toMatchObject({ daysSince: 12, intervalDays: 10, learned: true });
    expect(s[1]).toMatchObject({ daysSince: 8, intervalDays: 7, learned: false });
  });

  it('no sugiere lo que ya está en la lista', () => {
    const s = restockSuggestions(products, stats, new Set(['leche']), now);
    expect(s.map((x) => x.product.id)).toEqual(['pan']);
  });

  it('no sugiere lo pospuesto hasta que pase la fecha', () => {
    const snoozed = products.map((p) =>
      p.id === 'leche' ? { ...p, restock_snoozed_until: new Date(2026, 9, 5).toISOString() } : p
    );
    expect(restockSuggestions(snoozed, stats, new Set(), now).map((x) => x.product.id)).toEqual([
      'pan',
    ]);

    const expired = products.map((p) =>
      p.id === 'leche' ? { ...p, restock_snoozed_until: new Date(2026, 8, 29).toISOString() } : p
    );
    expect(restockSuggestions(expired, stats, new Set(), now).map((x) => x.product.id)).toContain(
      'leche'
    );
  });

  it('sin estadísticas usa la última compra del producto', () => {
    const s = restockSuggestions([product('sal', { last_purchased_at: daysAgo(9) })], [], new Set(), now);
    expect(s.map((x) => x.product.id)).toEqual(['sal']);
  });

  it('nunca sugiere un producto que no se ha comprado', () => {
    expect(restockSuggestions([product('nuevo')], [], new Set(), now)).toEqual([]);
  });
});

describe('snoozeUntil (spec 0014)', () => {
  it('pospone un intervalo desde hoy', () => {
    expect(snoozeUntil(10, now)).toBe(new Date(2026, 9, 10, 10, 0).toISOString());
  });
});

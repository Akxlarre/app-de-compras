import { describe, it, expect } from 'vitest';
import { summarizePurchase, spendingInMonth } from './purchase-history.utils';
import type { ActiveShoppingList } from '@core/models/shopping-list.model';
import type { PurchaseSummary } from '@core/models/purchase-history.model';

const completed = (items: any[], completed_at = '2026-09-20T15:00:00Z') =>
  ({
    id: 'l1',
    family_id: 'f1',
    name: 'Semana',
    status: 'completed',
    created_at: '2026-09-18T10:00:00Z',
    completed_at,
    list_items: items,
  } as ActiveShoppingList);

describe('summarizePurchase', () => {
  it('suma cantidad × precio pagado de lo marcado', () => {
    const summary = summarizePurchase(
      completed([
        { id: 'a', is_checked: true, quantity: 2, unit_price: 1000, product: { name: 'Pan' } },
        { id: 'b', is_checked: true, quantity: 1, unit_price: 500, product: { name: 'Leche' } },
      ])
    );

    expect(summary).toMatchObject({
      id: 'l1',
      name: 'Semana',
      completedAt: '2026-09-20T15:00:00Z',
      itemCount: 2,
      total: 2500,
    });
    expect(summary.items[0]).toEqual({ name: 'Pan', quantity: 2, unitPrice: 1000, subtotal: 2000 });
  });

  it('ignora lo que no se marcó (listas finalizadas antes de pasar pendientes)', () => {
    const summary = summarizePurchase(
      completed([
        { id: 'a', is_checked: true, quantity: 1, unit_price: 800, product: { name: 'Pan' } },
        { id: 'b', is_checked: false, quantity: 5, unit_price: 100, product: { name: 'Sal' } },
      ])
    );

    expect(summary.itemCount).toBe(1);
    expect(summary.total).toBe(800);
  });

  it('sin precio pagado cuenta 0 y conserva el ítem; sin producto usa un nombre genérico', () => {
    const summary = summarizePurchase(
      completed([{ id: 'a', is_checked: true, quantity: null, unit_price: null, product: null }])
    );

    expect(summary.items).toEqual([
      { name: 'Producto sin nombre', quantity: 1, unitPrice: null, subtotal: 0 },
    ]);
    expect(summary.total).toBe(0);
  });

  it('sin completed_at usa created_at como fecha', () => {
    const summary = summarizePurchase({ ...completed([]), completed_at: undefined });
    expect(summary.completedAt).toBe('2026-09-18T10:00:00Z');
  });
});

describe('spendingInMonth', () => {
  const purchase = (completedAt: string, total: number) =>
    ({ id: completedAt, completedAt, total } as PurchaseSummary);

  it('suma solo las compras del mes en curso (hora local)', () => {
    const now = new Date(2026, 8, 25, 10, 0);
    const purchases = [
      purchase(new Date(2026, 8, 1, 0, 30).toISOString(), 10_000),
      purchase(new Date(2026, 8, 24, 20, 0).toISOString(), 5_500),
      purchase(new Date(2026, 7, 31, 23, 30).toISOString(), 99_000),
      purchase(new Date(2025, 8, 10).toISOString(), 1_000),
    ];

    expect(spendingInMonth(purchases, now)).toEqual({ total: 15_500, count: 2 });
  });

  it('sin compras: 0', () => {
    expect(spendingInMonth([], new Date())).toEqual({ total: 0, count: 0 });
  });
});

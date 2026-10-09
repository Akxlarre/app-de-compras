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

describe('summarizePurchase con las líneas de la boleta (spec 0015, G2)', () => {
  const conLineas = () =>
    ({
      ...completed([
        { id: 'a', is_checked: true, quantity: 1, unit_price: 1100, product: { name: 'Leche' } },
      ]),
      total_paid: 2120,
      total_source: 'receipt',
      purchase_lines: [
        {
          line_index: 2,
          raw_text: 'BOLSA',
          name: null,
          kind: 'bag',
          quantity: 1,
          unit_price: 20,
          amount: 20,
          product: null,
        },
        {
          line_index: 0,
          raw_text: 'LCH ENT',
          name: 'Leche',
          kind: 'product',
          quantity: 1,
          unit_price: 1100,
          amount: 1100,
          product: { name: 'Leche' },
        },
        {
          line_index: 1,
          raw_text: 'CHOCOLATE X',
          name: null,
          kind: 'product',
          quantity: 2,
          unit_price: 500,
          amount: 1000,
          product: null,
        },
      ],
    } as unknown as ActiveShoppingList);

  it('el detalle muestra todas las líneas de producto, con o sin catálogo, en orden', () => {
    const s = summarizePurchase(conLineas());

    expect(s.items).toEqual([
      { name: 'Leche', quantity: 1, unitPrice: 1100, subtotal: 1100 },
      { name: 'CHOCOLATE X', quantity: 2, unitPrice: 500, subtotal: 1000 },
    ]);
    expect(s.itemCount).toBe(2);
  });

  it('bolsas y descuentos van aparte; productos y cargos suman la boleta', () => {
    const s = summarizePurchase(conLineas());

    expect(s.charges).toEqual([{ kind: 'bag', rawText: 'BOLSA', amount: 20 }]);
    expect(s.estimatedTotal).toBe(2120);
    expect(s.total).toBe(2120);
  });

  it('sin líneas (sin boleta o compra antigua) se arma como antes, desde lo marcado', () => {
    const s = summarizePurchase(
      completed([
        { id: 'a', is_checked: true, quantity: 1, unit_price: 800, product: { name: 'Pan' } },
      ])
    );
    expect(s.items).toEqual([{ name: 'Pan', quantity: 1, unitPrice: 800, subtotal: 800 }]);
    expect(s.charges).toEqual([]);
  });
});

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

  describe('gasto real (spec 0009)', () => {
    const items = [
      { id: 'a', is_checked: true, quantity: 2, unit_price: 1000, product: { name: 'Pan' } },
    ];

    it('sin boleta ni total es estimado: total = suma de precios', () => {
      const s = summarizePurchase(completed(items));
      expect(s).toMatchObject({
        total: 2000,
        estimatedTotal: 2000,
        totalSource: 'estimated',
        hasReceipt: false,
        receiptImagePath: null,
        store: null,
      });
    });

    it('con total_paid de la boleta usa ese total, no la suma', () => {
      const s = summarizePurchase({
        ...completed(items),
        total_paid: 2350,
        total_source: 'receipt',
        receipts: { id: 'r1', image_url: 'fam/r1.jpg', store: 'Líder' },
      });
      expect(s).toMatchObject({
        total: 2350,
        estimatedTotal: 2000,
        totalSource: 'receipt',
        hasReceipt: true,
        receiptImagePath: 'fam/r1.jpg',
        store: 'Líder',
      });
    });

    it('acepta la boleta como arreglo (PostgREST según la relación)', () => {
      const s = summarizePurchase({
        ...completed(items),
        total_paid: 100,
        total_source: 'receipt',
        receipts: [{ id: 'r1', image_url: null, store: null }],
      });
      expect(s.hasReceipt).toBe(true);
      expect(s.receiptImagePath).toBeNull();
    });

    it('un total ingresado a mano cuenta como real, sin boleta', () => {
      const s = summarizePurchase({
        ...completed(items),
        total_paid: 5000,
        total_source: 'manual',
      });
      expect(s).toMatchObject({ total: 5000, totalSource: 'manual', hasReceipt: false });
    });

    it('un total_paid de 0 es un total real (no cae al estimado)', () => {
      const s = summarizePurchase({ ...completed(items), total_paid: 0, total_source: 'manual' });
      expect(s.total).toBe(0);
    });

    it('conserva la compra original para poder cerrarla con boleta', () => {
      const list = completed(items);
      expect(summarizePurchase(list).source).toBe(list);
    });
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

    expect(spendingInMonth(purchases, now)).toEqual({ total: 15_500, count: 2, estimatedCount: 0 });
  });

  it('cuenta cuántas compras del mes son estimadas (sin boleta ni total)', () => {
    const now = new Date(2026, 8, 25, 10, 0);
    const day = (d: number) => new Date(2026, 8, d, 12).toISOString();
    const purchases = [
      { ...purchase(day(2), 10_000), totalSource: 'receipt' },
      { ...purchase(day(9), 5_000), totalSource: 'manual' },
      { ...purchase(day(16), 3_000), totalSource: 'estimated' },
      { ...purchase(new Date(2026, 7, 30).toISOString(), 9_000), totalSource: 'estimated' },
    ] as PurchaseSummary[];

    expect(spendingInMonth(purchases, now)).toEqual({ total: 18_000, count: 3, estimatedCount: 1 });
  });

  it('sin compras: 0', () => {
    expect(spendingInMonth([], new Date())).toEqual({ total: 0, count: 0, estimatedCount: 0 });
  });
});

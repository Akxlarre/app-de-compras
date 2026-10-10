import { describe, it, expect } from 'vitest';
import {
  summarizePurchase,
  spendingInMonth,
  monthComparison,
  purchasesInMonth,
  shiftMonth,
  monthlyTotals,
  topProducts,
  spendByStore,
  purchasedProducts,
  searchPurchases,
} from './purchase-history.utils';
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

  it('con varias boletas (una salida por varias tiendas) muestra todas las tiendas (D6)', () => {
    const s = summarizePurchase({
      ...conLineas(),
      receipts: [
        { id: 'r1', image_url: 'fam/a.jpg', store: 'Aroca' },
        { id: 'r2', image_url: null, store: 'Pedregal' },
      ],
    } as unknown as ActiveShoppingList);

    expect(s.store).toBe('Aroca · Pedregal');
    expect(s.receiptImagePath).toBe('fam/a.jpg');
    // Todas las fotos, para verlas en el detalle de la compra (0016 AC7).
    expect(s.receiptImagePaths).toEqual(['fam/a.jpg']);
  });

  it('con varias boletas las líneas van boleta por boleta, no mezcladas', () => {
    const l = (receipt_id: string, line_index: number, raw_text: string) => ({
      receipt_id,
      line_index,
      raw_text,
      name: null,
      kind: 'product',
      quantity: 1,
      unit_price: 100,
      amount: 100,
      product: null,
    });
    const s = summarizePurchase({
      ...completed([]),
      receipts: [
        { id: 'r1', image_url: null, store: 'Aroca' },
        { id: 'r2', image_url: null, store: 'Pedregal' },
      ],
      purchase_lines: [
        l('r2', 0, 'PALMITOS'),
        l('r1', 1, 'HUEVOS'),
        l('r2', 1, 'AJO'),
        l('r1', 0, 'LECHE'),
      ],
    } as unknown as ActiveShoppingList);

    expect(s.items.map((i) => i.name)).toEqual(['LECHE', 'HUEVOS', 'PALMITOS', 'AJO']);
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

describe('meses (spec 0016 D4)', () => {
  const purchase = (completedAt: Date, total: number, totalSource = 'receipt') =>
    ({
      id: completedAt.toISOString(),
      completedAt: completedAt.toISOString(),
      total,
      totalSource,
    } as PurchaseSummary);
  const purchases = [
    purchase(new Date(2026, 9, 5, 12), 122_760),
    purchase(new Date(2026, 9, 1, 9), 3_000, 'estimated'),
    purchase(new Date(2026, 8, 20, 12), 100_000),
    purchase(new Date(2025, 11, 30, 12), 40_000),
    purchase(new Date(2026, 0, 2, 12), 50_000),
  ];

  it('shiftMonth va al primer día del mes, también entre años', () => {
    expect(shiftMonth(new Date(2026, 9, 25, 18), 0)).toEqual(new Date(2026, 9, 1));
    expect(shiftMonth(new Date(2026, 0, 31), -1)).toEqual(new Date(2025, 11, 1));
    expect(shiftMonth(new Date(2025, 11, 15), 1)).toEqual(new Date(2026, 0, 1));
  });

  it('purchasesInMonth deja solo las del mes elegido', () => {
    expect(purchasesInMonth(purchases, new Date(2026, 9, 1)).map((p) => p.total)).toEqual([
      122_760, 3_000,
    ]);
    expect(purchasesInMonth(purchases, new Date(2026, 6, 1))).toEqual([]);
  });

  it('monthComparison da el mes, el anterior y la diferencia', () => {
    const c = monthComparison(purchases, new Date(2026, 9, 1));
    expect(c.current).toEqual({ total: 125_760, count: 2, estimatedCount: 1 });
    expect(c.previous.total).toBe(100_000);
    expect(c.diff).toBe(25_760);
  });

  it('la diferencia también cruza de año (enero contra diciembre) y puede ser negativa', () => {
    expect(monthComparison(purchases, new Date(2026, 0, 1)).diff).toBe(10_000);
    expect(monthComparison(purchases, new Date(2026, 8, 1)).diff).toBeNull();
    expect(
      monthComparison([purchase(new Date(2026, 1, 3), 1_000), purchases[4]], new Date(2026, 1, 1))
        .diff
    ).toBe(-49_000);
  });

  it('sin compras el mes anterior no hay diferencia que mostrar', () => {
    expect(monthComparison(purchases, new Date(2025, 11, 1)).diff).toBeNull();
  });
});

describe('gasto (spec 0020 D3, D4)', () => {
  const p = (completedAt: Date, total: number, over: Partial<PurchaseSummary> = {}) =>
    ({
      id: completedAt.toISOString(),
      completedAt: completedAt.toISOString(),
      total,
      totalSource: 'receipt',
      items: [],
      receiptTotals: [],
      ...over,
    } as unknown as PurchaseSummary);

  it('monthlyTotals da los últimos 6 meses terminando en el mes pedido, con los vacíos en 0', () => {
    const totals = monthlyTotals(
      [
        p(new Date(2026, 9, 5), 122_760),
        p(new Date(2026, 9, 1), 3_000),
        p(new Date(2026, 7, 20), 50_000),
      ],
      new Date(2026, 9, 1)
    );
    expect(totals.map((t) => [t.month.getMonth(), t.total, t.count])).toEqual([
      [4, 0, 0],
      [5, 0, 0],
      [6, 0, 0],
      [7, 50_000, 1],
      [8, 0, 0],
      [9, 125_760, 2],
    ]);
  });

  it('topProducts suma por nombre lo pagado y deja los 5 más caros', () => {
    const items = (pairs: [string, number][]) =>
      pairs.map(([name, subtotal]) => ({ name, subtotal, quantity: 1, unitPrice: subtotal }));
    const top = topProducts([
      p(new Date(2026, 9, 5), 0, {
        items: items([
          ['Leche', 2_800],
          ['Carne', 12_000],
          ['Pan', 1_500],
        ]),
      }),
      p(new Date(2026, 9, 1), 0, {
        items: items([
          ['Leche', 2_800],
          ['Queso', 4_000],
          ['Café', 6_000],
          ['Arroz', 1_000],
        ]),
      }),
    ]);
    expect(top).toEqual([
      { name: 'Carne', total: 12_000 },
      { name: 'Café', total: 6_000 },
      { name: 'Leche', total: 5_600 },
      { name: 'Queso', total: 4_000 },
      { name: 'Pan', total: 1_500 },
    ]);
  });

  it('spendByStore suma cada boleta en su tienda; sin boleta va aparte', () => {
    const byStore = spendByStore([
      p(new Date(2026, 9, 5), 81_700, {
        receiptTotals: [
          { store: 'Aroca', total: 58_900 },
          { store: 'El Nene Jr SPA', total: 22_800 },
        ],
      }),
      p(new Date(2026, 9, 3), 10_000, { receiptTotals: [{ store: 'Aroca', total: 10_000 }] }),
      p(new Date(2026, 9, 2), 4_000, { receiptTotals: [] }),
      p(new Date(2026, 9, 1), 2_000, { receiptTotals: [{ store: null, total: 2_000 }] }),
    ]);
    expect(byStore).toEqual([
      { name: 'Aroca', total: 68_900 },
      { name: 'El Nene Jr SPA', total: 22_800 },
      { name: 'Sin boleta', total: 4_000 },
      { name: 'Tienda sin leer', total: 2_000 },
    ]);
  });

  it('summarizePurchase da el total de cada boleta con su tienda', () => {
    const s = summarizePurchase({
      ...completed([]),
      total_paid: 81_700,
      total_source: 'receipt',
      receipts: [
        { id: 'r1', image_url: null, store: 'Aroca', total_amount: 58_900 },
        { id: 'r2', image_url: null, store: 'El Nene', total_amount: 22_800 },
      ],
    } as unknown as ActiveShoppingList);
    expect(s.receiptTotals).toEqual([
      { store: 'Aroca', total: 58_900 },
      { store: 'El Nene', total: 22_800 },
    ]);
  });
});

describe('compras útiles (spec 0023)', () => {
  it('summarizePurchase copia quién cerró la compra (D3)', () => {
    expect(summarizePurchase({ ...completed([]), completed_by: 'u2' }).completedBy).toBe('u2');
    expect(summarizePurchase(completed([])).completedBy).toBeNull();
  });

  it('purchasedProducts: lo marcado con producto, con su cantidad (D1)', () => {
    const list = completed([
      { id: 'a', product_id: 'p1', is_checked: true, quantity: 2 },
      { id: 'b', product_id: 'p2', is_checked: false, quantity: 1 },
      { id: 'c', product_id: null, is_checked: true, quantity: 1 },
      { id: 'd', product_id: 'p3', is_checked: true, quantity: '1.5' },
    ]);
    expect(purchasedProducts(list)).toEqual([
      { product_id: 'p1', quantity: 2 },
      { product_id: 'p3', quantity: 1.5 },
    ]);
  });

  it('purchasedProducts: con boleta, también sus productos; sin repetir y sumando líneas (D1)', () => {
    const line = (product: object | null, quantity: number | null, kind = 'product') => ({
      receipt_id: 'r',
      line_index: 0,
      raw_text: null,
      name: null,
      kind,
      quantity,
      unit_price: null,
      amount: 0,
      product,
    });
    const list = {
      ...completed([{ id: 'a', product_id: 'p1', is_checked: true, quantity: 1 }]),
      purchase_lines: [
        line({ id: 'p1', name: 'Leche' }, 2),
        line({ id: 'p2', name: 'Pan' }, 1),
        line({ id: 'p2', name: 'Pan' }, null),
        line({ name: 'sin id' }, 1),
        line(null, 1),
        line({ id: 'p9', name: 'Bolsa' }, 1, 'bag'),
      ],
    } as ActiveShoppingList;
    expect(purchasedProducts(list)).toEqual([
      { product_id: 'p1', quantity: 2 },
      { product_id: 'p2', quantity: 2 },
    ]);
  });

  describe('searchPurchases (D2)', () => {
    const p = (id: string, completedAt: string, over: Partial<PurchaseSummary> = {}) =>
      ({
        id,
        name: 'Compra',
        title: `Compra ${id}`,
        completedAt,
        store: null,
        items: [],
        ...over,
      } as unknown as PurchaseSummary);
    const purchases = [
      p('a', '2026-08-01T10:00:00Z', {
        items: [{ name: 'Pilas AA', quantity: 2, unitPrice: 3990, subtotal: 7980 }],
      }),
      p('b', '2026-09-15T10:00:00Z', { store: 'Líder Express' }),
      p('c', '2026-09-20T10:00:00Z', { title: 'Asado del sábado' }),
      p('d', '2026-10-01T10:00:00Z', {
        items: [{ name: 'Pilas recargables', quantity: 1, unitPrice: null, subtotal: 0 }],
      }),
    ];

    it('busca por producto en cualquier mes y dice qué coincidió, la más nueva primero', () => {
      expect(searchPurchases(purchases, 'pilas')).toEqual([
        { purchase: purchases[3], match: 'Pilas recargables' },
        { purchase: purchases[0], match: 'Pilas AA · 2 × $3.990' },
      ]);
    });

    it('busca por tienda y por nombre, sin tildes ni mayúsculas', () => {
      expect(searchPurchases(purchases, 'LIDER').map((r) => r.purchase.id)).toEqual(['b']);
      expect(searchPurchases(purchases, 'sabado')).toEqual([
        { purchase: purchases[2], match: null },
      ]);
    });

    it('sin texto no busca', () => {
      expect(searchPurchases(purchases, '  ')).toEqual([]);
    });
  });
});

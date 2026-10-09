import { describe, it, expect } from 'vitest';
import {
  buildApplyReceipt,
  canConfirmReceipt,
  initialDecisions,
  lineAmounts,
  targetFromCandidate,
} from './purchase-close.utils';
import { normalizeReceiptText, reconcileReceipt } from './reconcile.utils';
import { validateReceipt } from './receipt.utils';
import lider01 from '../../../../supabase/functions/process-receipt/eval/casos/01-lider-matucana.json';
import type {
  ReconcileListItem,
  LineDecision,
  OcrReceipt,
  OcrReceiptLine,
  ReceiptValidation,
  ReconciliationResult,
} from '@core/models/receipt.model';

const line = (over: Partial<OcrReceiptLine>): OcrReceiptLine => ({
  raw_text: 'X',
  kind: 'product',
  name: null,
  matched_list_item: null,
  quantity: 1,
  unit: 'un',
  unit_price: 1000,
  line_total: 1000,
  applies_to: null,
  legible: true,
  ...over,
});

const leche = { itemId: 'i-leche', productId: 'p-leche', name: 'Leche', quantity: 1 };
const pan = { itemId: 'i-pan', productId: 'p-pan', name: 'Pan', quantity: 1 };

const receipt: OcrReceipt = {
  store: 'Líder',
  date: '2026-09-29',
  total: 5750,
  lines: [
    line({
      raw_text: 'LCH ENT',
      name: 'Leche entera',
      quantity: 2,
      unit_price: 1100,
      line_total: 2200,
    }),
    line({ raw_text: 'CAFE JV', unit_price: 3990, line_total: 3990 }),
    line({
      kind: 'discount',
      raw_text: 'DCTO LECHE',
      unit_price: null,
      line_total: -440,
      applies_to: 0,
    }),
    line({ raw_text: 'BOLSA BASURA', name: 'Bolsa basura', unit_price: 450, line_total: 450 }),
    line({ raw_text: 'QUESO GAUDA', name: 'Queso gauda', unit_price: 2890, line_total: 2890 }),
  ],
};
const validation: ReceiptValidation = {
  computedTotal: 9090,
  totalMatches: false,
  doubtfulLines: [{ index: 4, reason: 'no-cuadra' }],
};
const result: ReconciliationResult = {
  lines: [
    {
      index: 0,
      line: receipt.lines[0],
      status: 'matched',
      via: 'alias',
      match: { productId: 'p-leche', itemId: 'i-leche', name: 'Leche', score: 1 },
      candidates: [],
    },
    {
      index: 1,
      line: receipt.lines[1],
      status: 'extra',
      via: 'alias',
      match: { productId: 'p-cafe', itemId: null, name: 'Café', score: 1 },
      candidates: [],
    },
    { index: 3, line: receipt.lines[3], status: 'extra', via: null, match: null, candidates: [] },
    {
      index: 4,
      line: receipt.lines[4],
      status: 'candidate',
      via: null,
      match: null,
      candidates: [{ productId: 'p-queso', itemId: null, name: 'Queso', score: 0.5 }],
    },
  ],
  missing: [pan],
};

describe('lineAmounts', () => {
  it('usa el precio unitario y la cantidad de la línea', () => {
    expect(lineAmounts(receipt.lines, 3)).toEqual({ quantity: 1, unitPrice: 450 });
  });
  it('descuenta lo que aplica a esa línea (applies_to) del precio unitario', () => {
    // (2200 - 440) / 2
    expect(lineAmounts(receipt.lines, 0)).toEqual({ quantity: 2, unitPrice: 880 });
  });
  it('sin precio unitario lo saca del total de la línea; sin cantidad es 1', () => {
    const lines = [line({ quantity: null, unit_price: null, line_total: 1990 })];
    expect(lineAmounts(lines, 0)).toEqual({ quantity: 1, unitPrice: 1990 });
  });
  it('kg: cantidad decimal y precio redondeado', () => {
    const lines = [line({ quantity: 0.732, unit: 'kg', unit_price: 5990, line_total: 4385 })];
    expect(lineAmounts(lines, 0)).toEqual({ quantity: 0.732, unitPrice: 5990 });
  });
});

describe('initialDecisions', () => {
  const d = initialDecisions(result, receipt, validation);

  it('una coincidencia con la lista va al ítem', () => {
    expect(d[0].target).toEqual({
      kind: 'item',
      itemId: 'i-leche',
      productId: 'p-leche',
      name: 'Leche',
    });
  });
  it('un alias a un producto fuera de la lista va a ese producto', () => {
    expect(d[1].target).toEqual({ kind: 'product', productId: 'p-cafe', name: 'Café' });
  });
  it('lo que no estaba en la lista es nuevo y no va al catálogo por defecto', () => {
    expect(d[2]).toMatchObject({
      target: { kind: 'new' },
      saveToCatalog: false,
      name: 'Bolsa basura',
    });
  });
  it('un "¿Es este?" empieza sin elegir y trae la duda de validateReceipt', () => {
    expect(d[3]).toMatchObject({ target: null, doubt: 'no-cuadra' });
  });
  it('recuerda lo que propuso la lectura', () => {
    expect(d[0].ocr).toEqual({ quantity: 2, unitPrice: 880, target: 'p-leche' });
  });
});

describe('canConfirmReceipt / targetFromCandidate', () => {
  it('no se confirma con un "¿Es este?" sin elegir', () => {
    const d = initialDecisions(result, receipt, validation);
    expect(canConfirmReceipt(d)).toBe(false);
    d[3] = { ...d[3], target: targetFromCandidate(d[3].candidates[0]) };
    expect(canConfirmReceipt(d)).toBe(true);
  });
  it('un candidato de la lista va al ítem; uno del catálogo, al producto', () => {
    expect(targetFromCandidate({ productId: 'p', itemId: 'i', name: 'P', score: 1 })).toEqual({
      kind: 'item',
      itemId: 'i',
      productId: 'p',
      name: 'P',
    });
    expect(targetFromCandidate({ productId: 'p', itemId: null, name: 'P', score: 1 })).toEqual({
      kind: 'product',
      productId: 'p',
      name: 'P',
    });
  });
});

describe('AC6: la segunda boleta del mismo comercio concilia sola (boleta real 01 Líder)', () => {
  const caso = lider01 as unknown as OcrReceipt;
  const catalog = [
    { productId: 'p-arroz', name: 'Arroz' },
    { productId: 'p-atun', name: 'Atún' },
    { productId: 'p-azucar', name: 'Azúcar' },
    { productId: 'p-lentejas', name: 'Lentejas' },
    { productId: 'p-harina', name: 'Harina' },
  ];
  const compra = (n: number, ids: string[]) =>
    ids.map((p) => ({
      itemId: `${p}-${n}`,
      productId: p,
      name: catalog.find((c) => c.productId === p)!.name,
      quantity: 1,
    }));

  /** Lo que `apply_receipt` guarda en `product_aliases` (pgTAP lo verifica del lado de la BD). */
  const aliasesGuardados = (
    input: ReturnType<typeof buildApplyReceipt>,
    items: ReconcileListItem[]
  ) => [
    ...input.items
      .filter((i) => i.saveAlias && i.rawText)
      .map((i) => ({
        rawText: normalizeReceiptText(i.rawText!),
        productId: items.find((x) => x.itemId === i.itemId)!.productId,
      })),
    ...input.extras
      .filter((e) => e.productId && e.rawText)
      .map((e) => ({ rawText: normalizeReceiptText(e.rawText!), productId: e.productId! })),
  ];

  it('lo confirmado en la primera boleta se reconoce solo en la segunda', () => {
    // 1ª compra: Harina no estaba en la lista; "HNA MONT BLA" no se parece a nada → el usuario elige.
    const items1 = compra(1, ['p-arroz', 'p-atun', 'p-azucar', 'p-lentejas']);
    const v1 = validateReceipt(caso);
    const r1 = reconcileReceipt(caso.lines, items1, catalog, []);
    const d1 = initialDecisions(r1, caso, v1);
    const hna = d1.find((d) => d.rawText === 'HNA MONT BLA')!;
    expect(hna.target).toEqual({ kind: 'new' });
    hna.target = { kind: 'product', productId: 'p-harina', name: 'Harina' };

    const matched1 = d1.filter((d) => d.target?.kind === 'item').map((d) => d.rawText);
    expect(matched1).toEqual(['ARROZ PREG.G', 'LENTEJA 6MM', 'AZUCAR 1KG', 'ATUN LOMITO']);

    const aliases = aliasesGuardados(
      buildApplyReceipt({
        listId: 'l1',
        carryPending: true,
        receipt: caso,
        validation: v1,
        imagePath: null,
        decisions: d1,
        missing: [],
      }),
      items1
    );

    // 2ª compra en el mismo comercio, ahora con Harina en la lista (otros ítems, mismos productos).
    const items2 = compra(2, ['p-arroz', 'p-atun', 'p-azucar', 'p-lentejas', 'p-harina']);
    const r2 = reconcileReceipt(caso.lines, items2, catalog, aliases);
    const porAlias = r2.lines.filter((l) => l.via === 'alias');

    expect(porAlias.map((l) => [l.line.raw_text, l.status, l.match?.itemId])).toEqual([
      ['ARROZ PREG.G', 'matched', 'p-arroz-2'],
      ['HNA MONT BLA', 'matched', 'p-harina-2'],
      ['LENTEJA 6MM', 'matched', 'p-lentejas-2'],
      ['AZUCAR 1KG', 'matched', 'p-azucar-2'],
      ['ATUN LOMITO', 'matched', 'p-atun-2'],
    ]);
    expect(r2.missing).toEqual([]);
  });
});

describe('buildApplyReceipt', () => {
  const decided = (): LineDecision[] => {
    const d = initialDecisions(result, receipt, validation);
    d[3] = { ...d[3], target: { kind: 'new' } };
    return d;
  };
  const build = (decisions: LineDecision[], bought = true) =>
    buildApplyReceipt({
      listId: 'l1',
      carryPending: true,
      receipt,
      validation,
      imagePath: 'fam/b.jpg',
      decisions,
      missing: [{ item: pan, bought }],
    });

  it('los ítems de la lista llevan precio, cantidad y alias', () => {
    expect(build(decided()).items).toEqual([
      { itemId: 'i-leche', unitPrice: 880, quantity: 2, rawText: 'LCH ENT', saveAlias: true },
    ]);
  });

  it('un producto conocido entra como extra con su id; lo nuevo solo si va al catálogo', () => {
    const d = decided();
    d[2] = { ...d[2], saveToCatalog: true };
    expect(build(d).extras).toEqual([
      {
        productId: 'p-cafe',
        rawText: 'CAFE JV',
        name: 'Café',
        unitPrice: 3990,
        quantity: 1,
        lineIndex: 1,
      },
      {
        productId: null,
        rawText: 'BOLSA BASURA',
        name: 'Bolsa basura',
        unitPrice: 450,
        quantity: 1,
        lineIndex: 3,
      },
    ]);
  });

  it('manda todas las líneas de la boleta, con su producto si lo tienen (spec 0015, G2)', () => {
    const r = build(decided());

    expect(r.lines).toEqual([
      {
        index: 0,
        rawText: 'LCH ENT',
        name: 'Leche',
        kind: 'product',
        quantity: 2,
        unitPrice: 880,
        amount: 1760,
        itemId: 'i-leche',
        productId: 'p-leche',
      },
      {
        index: 1,
        rawText: 'CAFE JV',
        name: 'Café',
        kind: 'product',
        quantity: 1,
        unitPrice: 3990,
        amount: 3990,
        itemId: null,
        productId: 'p-cafe',
      },
      {
        index: 3,
        rawText: 'BOLSA BASURA',
        name: 'Bolsa basura',
        kind: 'product',
        quantity: 1,
        unitPrice: 450,
        amount: 450,
        itemId: null,
        productId: null,
      },
      {
        index: 4,
        rawText: 'QUESO GAUDA',
        name: 'Queso gauda',
        kind: 'product',
        quantity: 1,
        unitPrice: 2890,
        amount: 2890,
        itemId: null,
        productId: null,
      },
    ]);
    // El descuento a la leche ya va en su precio: no se repite y las líneas suman la boleta.
    expect(r.lines.reduce((s, l) => s + l.amount, 0)).toBe(validation.computedTotal);
  });

  it('bolsas y descuentos a la compra van como líneas sin producto', () => {
    const r = buildApplyReceipt({
      listId: 'l1',
      carryPending: true,
      receipt: {
        store: null,
        date: null,
        total: 900,
        lines: [
          line({ kind: 'bag', raw_text: 'BOLSA', unit_price: 50, line_total: 50 }),
          line({ kind: 'discount', raw_text: 'CANJE', unit_price: null, line_total: -150 }),
          line({ raw_text: 'ILEGIBLE', legible: false, line_total: null }),
        ],
      },
      validation: { computedTotal: -100, totalMatches: false, doubtfulLines: [] },
      imagePath: null,
      decisions: [],
      missing: [],
    });

    expect(r.lines.map((l) => [l.index, l.kind, l.amount, l.productId])).toEqual([
      [0, 'bag', 50, null],
      [1, 'discount', -150, null],
    ]);
  });

  it('el catálogo no crece con lo que no se marcó "guardar en catálogo"', () => {
    expect(build(decided()).extras.map((e) => e.productId)).toEqual(['p-cafe']);
  });

  it('dos líneas al mismo ítem se suman', () => {
    const d = decided();
    d[3] = { ...d[3], target: d[0].target, quantity: 1, unitPrice: 1000 };
    expect(build(d).items).toEqual([
      { itemId: 'i-leche', unitPrice: 920, quantity: 3, rawText: 'LCH ENT', saveAlias: true },
    ]);
  });

  it('"¿no lo compraste?" sin comprar vuelve a pendiente; comprado se queda', () => {
    expect(build(decided(), false).uncheckItemIds).toEqual(['i-pan']);
    expect(build(decided(), true).uncheckItemIds).toEqual([]);
  });

  it('guarda la boleta: comercio, fecha, total, foto, lectura y correcciones', () => {
    const d = decided();
    d[0] = { ...d[0], unitPrice: 900 };
    const input = build(d);

    expect(input).toMatchObject({
      listId: 'l1',
      carryPending: true,
      store: 'Líder',
      purchasedAt: '2026-09-29',
      total: 5750,
      imagePath: 'fam/b.jpg',
      ocrResult: receipt,
    });
    expect(input.ocrCheck).toEqual({
      ...validation,
      corrections: [
        { index: 0, field: 'unitPrice', ocr: 880, user: 900 },
        { index: 4, field: 'product', ocr: null, user: 'new' },
      ],
    });
  });

  it('sin total impreso usa la suma de la boleta; una fecha rara no se guarda', () => {
    const input = buildApplyReceipt({
      listId: 'l1',
      carryPending: false,
      receipt: { ...receipt, total: null, date: '29/09' },
      validation,
      imagePath: null,
      decisions: decided(),
      missing: [],
    });
    expect(input.total).toBe(9090);
    expect(input.purchasedAt).toBeNull();
  });
});

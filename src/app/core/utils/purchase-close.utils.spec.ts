import { describe, it, expect } from 'vitest';
import {
  buildApplyReceipt,
  canConfirmReceipt,
  initialDecisions,
  lineAmounts,
  targetFromCandidate,
} from './purchase-close.utils';
import type {
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
      { productId: 'p-cafe', rawText: 'CAFE JV', name: 'Café', unitPrice: 3990, quantity: 1 },
      {
        productId: null,
        rawText: 'BOLSA BASURA',
        name: 'Bolsa basura',
        unitPrice: 450,
        quantity: 1,
      },
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

import { describe, it, expect } from 'vitest';
import { combineReceipts, combineValidations, splitByReceipt } from './receipt-parts.utils';
import type { ApplyReceiptInput, OcrReceipt, OcrReceiptLine } from '@core/models/receipt.model';

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

const aroca: OcrReceipt = {
  store: 'Aroca',
  date: '2026-10-05',
  total: 2000,
  lines: [
    line({ raw_text: 'LECHE', line_total: 2100 }),
    line({ raw_text: 'DCTO', kind: 'discount', line_total: -100, applies_to: 0 }),
  ],
};
const pedregal: OcrReceipt = {
  store: 'Pedregal',
  date: '2026-10-05',
  total: 1490,
  lines: [line({ raw_text: 'PALMITOS', line_total: 1490 })],
};
const feria: OcrReceipt = { store: 'El Nene Jr SPA', date: '2026-10-05', total: 22800, lines: [] };

describe('combineReceipts (spec 0015, D6)', () => {
  it('une las boletas: tiendas, suma de totales y líneas seguidas, con los descuentos corridos', () => {
    const c = combineReceipts([aroca, pedregal, feria]);

    expect(c.store).toBe('Aroca · Pedregal · El Nene Jr SPA');
    expect(c.date).toBe('2026-10-05');
    expect(c.total).toBe(26290);
    expect(c.lines.map((l) => l.raw_text)).toEqual(['LECHE', 'DCTO', 'PALMITOS']);
    expect(c.lines[1].applies_to).toBe(0);
  });

  it('un descuento de la segunda boleta apunta a su producto en la lista combinada', () => {
    const c = combineReceipts([
      pedregal,
      { ...aroca, lines: [line({}), line({ kind: 'discount', line_total: -10, applies_to: 0 })] },
    ]);
    expect(c.lines[2].applies_to).toBe(1);
  });

  it('una sola boleta queda igual', () => {
    expect(combineReceipts([aroca])).toEqual(aroca);
  });
});

describe('combineValidations', () => {
  it('suma lo calculado, corre las dudas y "no cuadra" si alguna no cuadra', () => {
    const v = combineValidations(
      [
        { computedTotal: 2000, totalMatches: true, doubtfulLines: [] },
        {
          computedTotal: 1400,
          totalMatches: false,
          doubtfulLines: [{ index: 0, reason: 'no-cuadra' }],
        },
        { computedTotal: 0, totalMatches: null, doubtfulLines: [] },
      ],
      [0, 2, 3]
    );
    expect(v).toEqual({
      computedTotal: 3400,
      totalMatches: false,
      doubtfulLines: [{ index: 2, reason: 'no-cuadra' }],
    });
  });

  it('un voucher sin detalle (null) no hace que las demás "no cuadren"', () => {
    const v = combineValidations(
      [
        { computedTotal: 2000, totalMatches: true, doubtfulLines: [] },
        { computedTotal: 0, totalMatches: null, doubtfulLines: [] },
      ],
      [0, 2]
    );
    expect(v.totalMatches).toBe(true);
  });
});

describe('splitByReceipt', () => {
  const input: ApplyReceiptInput = {
    listId: 'l1',
    carryPending: true,
    store: 'Aroca · Pedregal · El Nene Jr SPA',
    purchasedAt: '2026-10-05',
    total: 26290,
    imagePath: null,
    ocrResult: combineReceipts([aroca, pedregal, feria]),
    ocrCheck: {
      computedTotal: 3490,
      totalMatches: true,
      doubtfulLines: [],
      corrections: [{ index: 2, field: 'unitPrice', ocr: 1490, user: 1390 }],
    },
    items: [{ itemId: 'i1', unitPrice: 2000, quantity: 1, rawText: 'LECHE', saveAlias: true }],
    extras: [
      {
        productId: null,
        rawText: 'PALMITOS',
        name: 'Palmitos',
        unitPrice: 1390,
        quantity: 1,
        lineIndex: 2,
      },
    ],
    lines: [
      {
        index: 0,
        rawText: 'LECHE',
        name: 'Leche',
        kind: 'product',
        quantity: 1,
        unitPrice: 2000,
        amount: 2000,
        itemId: 'i1',
        productId: 'p1',
      },
      {
        index: 2,
        rawText: 'PALMITOS',
        name: 'Palmitos',
        kind: 'product',
        quantity: 1,
        unitPrice: 1390,
        amount: 1390,
        itemId: null,
        productId: null,
      },
    ],
    uncheckItemIds: [],
  };
  const parts = [
    {
      receipt: aroca,
      validation: { computedTotal: 2000, totalMatches: true, doubtfulLines: [] },
      imagePath: 'fam/a.jpg',
    },
    {
      receipt: pedregal,
      validation: { computedTotal: 1490, totalMatches: true, doubtfulLines: [] },
      imagePath: 'fam/p.jpg',
    },
    {
      receipt: feria,
      validation: { computedTotal: 0, totalMatches: null, doubtfulLines: [] },
      imagePath: null,
    },
  ];

  it('la primera boleta va como la principal, con sus datos, sus líneas y su total', () => {
    const r = splitByReceipt(input, parts);

    expect(r).toMatchObject({
      store: 'Aroca',
      total: 2000,
      imagePath: 'fam/a.jpg',
      ocrResult: aroca,
      items: input.items,
      uncheckItemIds: [],
    });
    expect(r.lines.map((l) => l.index)).toEqual([0]);
  });

  it('las demás van en "others", cada una con sus líneas numeradas desde 0 y sus correcciones', () => {
    const r = splitByReceipt(input, parts);

    expect(r.others).toEqual([
      {
        store: 'Pedregal',
        purchasedAt: '2026-10-05',
        total: 1490,
        imagePath: 'fam/p.jpg',
        ocrResult: pedregal,
        ocrCheck: {
          computedTotal: 1490,
          totalMatches: true,
          doubtfulLines: [],
          corrections: [{ index: 0, field: 'unitPrice', ocr: 1490, user: 1390 }],
        },
        lines: [{ ...input.lines[1], index: 0 }],
      },
      {
        store: 'El Nene Jr SPA',
        purchasedAt: '2026-10-05',
        total: 22800,
        imagePath: null,
        ocrResult: feria,
        ocrCheck: { computedTotal: 0, totalMatches: null, doubtfulLines: [], corrections: [] },
        lines: [],
      },
    ]);
  });

  it('un extra queda con su boleta y su línea dentro de ella', () => {
    expect(splitByReceipt(input, parts).extras[0]).toMatchObject({ receiptIndex: 1, lineIndex: 0 });
  });

  it('con una sola boleta no hay "others" y los extras son de la boleta 0', () => {
    const one = splitByReceipt(
      { ...input, ocrResult: aroca, lines: [input.lines[0]], extras: [] },
      [parts[0]]
    );
    expect(one.others).toEqual([]);
  });
});

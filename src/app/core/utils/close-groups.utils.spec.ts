import { describe, expect, it } from 'vitest';
import type { LineDecision } from '@core/models/receipt.model';
import { groupDecisions } from './close-groups.utils';

const line = (index: number, rawText: string, over: Partial<LineDecision> = {}): LineDecision => ({
  index,
  rawText,
  name: rawText,
  quantity: 1,
  unitPrice: 1290,
  target: { kind: 'new' },
  status: 'extra',
  candidates: [],
  saveToCatalog: false,
  doubt: null,
  ocr: { quantity: 1, unitPrice: 1290, target: 'new' },
  ...over,
});

const leche = { kind: 'item', itemId: 'i1', productId: 'p1', name: 'Leche' } as const;

describe('groupDecisions (spec 0016 AC10)', () => {
  it('junta la misma línea repetida en una fila con la cantidad y el total sumados', () => {
    const groups = groupDecisions([
      line(0, 'LECHE SOPROLE 1L', { target: leche, status: 'matched' }),
      line(1, 'PAN MARRAQUETA', { unitPrice: 990 }),
      line(2, 'Leche  Soprole 1L', { target: leche, status: 'matched' }),
    ]);

    expect(groups.map((g) => [g.indexes, g.quantity, g.total])).toEqual([
      [[0, 2], 2, 2580],
      [[1], 1, 990],
    ]);
    expect(groups[0].decision.index).toBe(0);
  });

  it('no junta la misma línea con distinto precio ni con distinto destino', () => {
    const groups = groupDecisions([
      line(0, 'TOMATE KG', { unitPrice: 1500 }),
      line(1, 'TOMATE KG', { unitPrice: 1700 }),
      line(2, 'TOMATE KG', { unitPrice: 1500, target: leche, status: 'matched' }),
    ]);

    expect(groups.map((g) => g.indexes)).toEqual([[0], [1], [2]]);
  });

  it('la duda de cualquier línea del grupo marca el grupo', () => {
    const [g] = groupDecisions([
      line(0, 'QUESO'),
      line(1, 'QUESO', { doubt: 'line_total' as LineDecision['doubt'] }),
    ]);
    expect(g.doubt).toBe(true);
  });

  it('un "¿Es este?" sin responder no se junta con nada', () => {
    const groups = groupDecisions([
      line(0, 'YOGHURT', { target: null, status: 'candidate' }),
      line(1, 'YOGHURT', { target: null, status: 'candidate' }),
    ]);
    expect(groups.map((g) => g.indexes)).toEqual([[0], [1]]);
  });

  it('30 líneas con una repetida 10 veces quedan en 21 filas', () => {
    const lines = Array.from({ length: 30 }, (_, i) =>
      line(i, i % 3 === 0 ? 'BEBIDA 3L' : `PRODUCTO ${i}`)
    );
    expect(groupDecisions(lines).length).toBe(21);
  });
});

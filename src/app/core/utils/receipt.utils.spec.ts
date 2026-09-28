import { describe, it, expect } from 'vitest';
import { parseOcrReceipt, validateReceipt } from './receipt.utils';
import type { OcrReceipt, OcrReceiptLine } from '@core/models/receipt.model';

const line = (over: Partial<OcrReceiptLine>): OcrReceiptLine => ({
  raw_text: 'X',
  kind: 'product',
  name: null,
  matched_list_item: null,
  quantity: 1,
  unit: 'un',
  unit_price: null,
  line_total: null,
  applies_to: null,
  legible: true,
  ...over,
});
const receipt = (total: number | null, lines: OcrReceiptLine[]): OcrReceipt => ({
  store: null,
  date: null,
  total,
  lines,
});

describe('validateReceipt', () => {
  it('una boleta que cuadra no tiene dudas (Líder: "2X 640 BETUN")', () => {
    const r = validateReceipt(
      receipt(1280, [line({ quantity: 2, unit_price: 640, line_total: 1280 })])
    );

    expect(r).toEqual({ computedTotal: 1280, totalMatches: true, doubtfulLines: [] });
  });

  it('marca la línea cuya cantidad × precio no da el total de línea', () => {
    const r = validateReceipt(
      receipt(3900, [line({ quantity: 2, unit_price: 1950, line_total: 1950 })])
    );

    expect(r.doubtfulLines).toEqual([{ index: 0, reason: 'no-cuadra' }]);
    expect(r.totalMatches).toBe(false);
  });

  it('granel: tolera el redondeo de kg × precio por kg (0,306 kg × $2.092 = $640)', () => {
    const r = validateReceipt(
      receipt(640, [line({ quantity: 0.306, unit: 'kg', unit_price: 2092, line_total: 640 })])
    );

    expect(r.doubtfulLines).toEqual([]);
    expect(r.totalMatches).toBe(true);
  });

  it('resta los descuentos, vengan negativos o no (Cencosud: PEBRE 898, AJI -180)', () => {
    const r = validateReceipt(
      receipt(6056, [
        line({ unit_price: 5338, line_total: 5338 }),
        line({ quantity: 2, unit_price: 449, line_total: 898 }),
        line({ kind: 'discount', quantity: null, unit: null, line_total: -180, applies_to: 1 }),
      ])
    );

    expect(r.computedTotal).toBe(6056);
    expect(r.totalMatches).toBe(true);

    const positivo = validateReceipt(
      receipt(718, [
        line({ quantity: 2, unit_price: 449, line_total: 898 }),
        line({ kind: 'discount', quantity: null, unit: null, line_total: 180, applies_to: 0 }),
      ])
    );
    expect(positivo.computedTotal).toBe(718);
  });

  it('las bolsas y envases suman; la donación y el redondeo no', () => {
    const r = validateReceipt(
      receipt(1050, [
        line({ unit_price: 1000, line_total: 1000 }),
        line({ kind: 'bag', quantity: null, unit: null, line_total: 50 }),
        line({ kind: 'other', quantity: null, unit: null, line_total: 4 }),
      ])
    );

    expect(r.computedTotal).toBe(1050);
    expect(r.totalMatches).toBe(true);
  });

  it('una línea ilegible queda en dudas y el total no cuadra (dedo sobre la boleta)', () => {
    const r = validateReceipt(
      receipt(3000, [
        line({ unit_price: 1000, line_total: 1000 }),
        line({ legible: false, quantity: null, unit: null }),
      ])
    );

    expect(r.doubtfulLines).toEqual([{ index: 1, reason: 'ilegible' }]);
    expect(r.totalMatches).toBe(false);
  });

  it('un producto legible sin total de línea queda en dudas', () => {
    const r = validateReceipt(receipt(null, [line({ unit_price: 990, line_total: null })]));

    expect(r.doubtfulLines).toEqual([{ index: 0, reason: 'sin-total' }]);
  });

  it('sin total impreso no puede decir si cuadra', () => {
    const r = validateReceipt(receipt(null, [line({ unit_price: 990, line_total: 990 })]));

    expect(r.totalMatches).toBeNull();
    expect(r.computedTotal).toBe(990);
  });

  it('un canje sobre el total (applies_to null) también descuenta (Líder: -50.591)', () => {
    const r = validateReceipt(
      receipt(15939, [
        line({ quantity: 24, unit_price: 1690, line_total: 40560 }),
        line({ unit_price: 25970, line_total: 25970 }),
        line({ kind: 'discount', quantity: null, unit: null, line_total: -50591 }),
      ])
    );

    expect(r.totalMatches).toBe(true);
  });

  describe('con las boletas reales del set de prueba (process-receipt/eval/casos)', () => {
    const casos = import.meta.glob<{ default: OcrReceipt & { caso: string } }>(
      '../../../../supabase/functions/process-receipt/eval/casos/*.json',
      { eager: true }
    );
    const todos = Object.values(casos).map((m) => m.default);

    it('carga los 11 casos', () => {
      expect(todos.length).toBeGreaterThanOrEqual(11);
    });

    it.each(todos.map((c) => [c.caso, c] as const))('%s', (caso, c) => {
      const r = validateReceipt(c);
      const esperaDudas = c.lines.some((l) => !l.legible);

      // Las transcripciones cuadran salvo las que tienen líneas ilegibles (04 Jumbo, 09 dedo).
      expect(r.totalMatches).toBe(!esperaDudas);
      expect(r.doubtfulLines.some((d) => d.reason === 'ilegible')).toBe(esperaDudas);
      expect(r.doubtfulLines.filter((d) => d.reason === 'no-cuadra')).toEqual([]);
    });
  });

  it('sin cantidad o sin precio unitario no revisa la línea: basta su total', () => {
    const r = validateReceipt(
      receipt(2190, [line({ quantity: null, unit: null, unit_price: null, line_total: 2190 })])
    );

    expect(r.doubtfulLines).toEqual([]);
    expect(r.totalMatches).toBe(true);
  });
});

describe('parseOcrReceipt', () => {
  const valida = {
    store: 'Líder',
    date: '2012-04-24',
    total: 1280,
    lines: [line({ raw_text: 'BETUN LIQ NE', quantity: 2, unit_price: 640, line_total: 1280 })],
    _model: 'gemini-3.8-flash',
  };

  it('acepta una respuesta que cumple el contrato (y descarta campos extra como _model)', () => {
    const { _model, ...esperado } = valida;
    expect(parseOcrReceipt(valida)).toEqual(esperado);
  });

  it.each([
    ['null', null],
    ['el formato viejo { items }', { items: [{ name: 'Leche', price: 1200 }] }],
    ['lines no es arreglo', { ...valida, lines: 'x' }],
    ['total como texto', { ...valida, total: '1.280' }],
    ['una línea con kind desconocido', { ...valida, lines: [line({ kind: 'promo' as never })] }],
    ['una línea sin legible', { ...valida, lines: [{ ...line({}), legible: undefined }] }],
    ['un monto como texto', { ...valida, lines: [line({ line_total: '$1.280' as never })] }],
    ['unidad desconocida', { ...valida, lines: [line({ unit: 'lt' as never })] }],
  ])('rechaza %s', (_, data) => {
    expect(() => parseOcrReceipt(data)).toThrow(/contrato/);
  });

  it('completa con null los campos opcionales que falten en una línea', () => {
    const r = parseOcrReceipt({
      store: null,
      date: null,
      total: 990,
      lines: [{ kind: 'product', line_total: 990, legible: true }],
    });

    expect(r.lines[0]).toEqual(
      line({ raw_text: null, quantity: null, unit: null, unit_price: null, line_total: 990 })
    );
  });
});

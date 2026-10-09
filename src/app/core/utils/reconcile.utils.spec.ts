import { describe, it, expect } from 'vitest';
import { normalizeReceiptText, reconcileReceipt, similarity } from './reconcile.utils';
import type {
  CatalogProduct,
  OcrReceiptLine,
  ReceiptAlias,
  ReconcileListItem,
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
const item = (itemId: string, productId: string, name: string): ReconcileListItem => ({
  itemId,
  productId,
  name,
  quantity: 1,
});

const leche = item('i-leche', 'p-leche', 'Leche');
const pan = item('i-pan', 'p-pan', 'Pan');
const arroz = item('i-arroz', 'p-arroz', 'Arroz grado 1');
const catalogo: CatalogProduct[] = [
  { productId: 'p-leche', name: 'Leche' },
  { productId: 'p-pan', name: 'Pan' },
  { productId: 'p-arroz', name: 'Arroz grado 1' },
  { productId: 'p-cafe', name: 'Café molido' },
];

describe('normalizeReceiptText', () => {
  it('mayúsculas y espacios colapsados (igual que shop.normalize_receipt_text)', () => {
    expect(normalizeReceiptText('  lch   ent  Sop 1L ')).toBe('LCH ENT SOP 1L');
  });
});

describe('similarity', () => {
  it('1 para el mismo nombre, sin importar tildes ni mayúsculas', () => {
    expect(similarity('Café molido', 'CAFE MOLIDO')).toBe(1);
  });
  it('acepta prefijos de 3+ letras ("ARROZ GRAD" ≈ "Arroz grado 1")', () => {
    expect(similarity('ARROZ GRAD', 'Arroz grado 1')).toBeGreaterThanOrEqual(0.6);
  });
  it('0 si no comparten palabras', () => {
    expect(similarity('DETERGENTE', 'Leche')).toBe(0);
  });
});

describe('reconcileReceipt', () => {
  it('un alias gana siempre, aunque el OCR diga otra cosa', () => {
    const aliases: ReceiptAlias[] = [{ rawText: 'LCH ENT SOP', productId: 'p-leche' }];
    const r = reconcileReceipt(
      [line({ raw_text: ' lch ent  sop', matched_list_item: 'Pan' })],
      [leche, pan],
      catalogo,
      aliases
    );

    expect(r.lines[0]).toMatchObject({
      status: 'matched',
      via: 'alias',
      match: { productId: 'p-leche', itemId: 'i-leche' },
    });
  });

  it('usa el ítem que eligió el OCR (matched_list_item)', () => {
    const r = reconcileReceipt(
      [line({ raw_text: 'LCH ENT', matched_list_item: 'leche' })],
      [leche, pan],
      catalogo,
      []
    );

    expect(r.lines[0]).toMatchObject({
      status: 'matched',
      via: 'ocr',
      match: { itemId: 'i-leche' },
    });
  });

  it('por similitud alta coincide con la lista', () => {
    const r = reconcileReceipt(
      [line({ raw_text: 'ARROZ GRADO 1 TUCAPEL' })],
      [arroz],
      catalogo,
      []
    );

    expect(r.lines[0]).toMatchObject({
      status: 'matched',
      via: 'similarity',
      match: { itemId: 'i-arroz' },
    });
  });

  it('la lista tiene prioridad sobre el catálogo', () => {
    const r = reconcileReceipt(
      [line({ raw_text: 'LECHE' })],
      [leche],
      [...catalogo, { productId: 'p-leche-2', name: 'Leche' }],
      []
    );

    expect(r.lines[0].match?.itemId).toBe('i-leche');
  });

  it('parecido solo a un producto del catálogo que no estaba en la lista → "¿Es este?"', () => {
    const r = reconcileReceipt([line({ raw_text: 'CAFE MOLIDO JUAN V' })], [leche], catalogo, []);

    expect(r.lines[0].status).toBe('candidate');
    expect(r.lines[0].candidates[0]).toMatchObject({ productId: 'p-cafe', itemId: null });
  });

  it('sin coincidencia queda como "no estaba en la lista"', () => {
    const r = reconcileReceipt([line({ raw_text: 'BOLSA BASURA 50X70' })], [leche], catalogo, []);

    expect(r.lines[0]).toMatchObject({ status: 'extra', match: null, candidates: [] });
  });

  it('un alias a un producto que no está en la lista coincide sin ítem (se compró algo conocido)', () => {
    const r = reconcileReceipt([line({ raw_text: 'CAFE JV' })], [leche], catalogo, [
      { rawText: 'CAFE JV', productId: 'p-cafe' },
    ]);

    expect(r.lines[0]).toMatchObject({
      status: 'extra',
      via: 'alias',
      match: { productId: 'p-cafe', itemId: null },
    });
  });

  it('cada ítem de la lista se usa una sola vez (dos líneas distintas no se lo reparten)', () => {
    const r = reconcileReceipt(
      [line({ raw_text: 'LECHE ENTERA' }), line({ raw_text: 'LECHE DESCREMADA' })],
      [leche],
      catalogo,
      []
    );

    expect(r.lines.map((l) => l.match?.itemId ?? null)).toEqual(['i-leche', null]);
  });

  it('la misma línea repetida en la boleta va al mismo ítem (spec 0015, Aroca)', () => {
    const r = reconcileReceipt(
      [line({ raw_text: 'LECHE' }), line({ raw_text: 'PAN' }), line({ raw_text: ' leche ' })],
      [leche, pan],
      catalogo,
      []
    );

    expect(r.lines.map((l) => [l.status, l.match?.itemId])).toEqual([
      ['matched', 'i-leche'],
      ['matched', 'i-pan'],
      ['matched', 'i-leche'],
    ]);
  });

  describe('pendientes de la lista (spec 0015, B2)', () => {
    it('un pendiente que sale en la boleta coincide y se sabe que estaba pendiente', () => {
      const r = reconcileReceipt(
        [line({ raw_text: 'ARROZ GRADO 1' })],
        [leche],
        catalogo,
        [],
        [arroz]
      );

      expect(r.lines[0].status).toBe('matched');
      expect(r.lines[0].match).toMatchObject({ itemId: 'i-arroz', wasPending: true });
    });

    it('un marcado coincide sin la marca de pendiente', () => {
      const r = reconcileReceipt([line({ raw_text: 'LECHE' })], [leche], catalogo, [], [arroz]);

      expect(r.lines[0].match?.wasPending).toBeUndefined();
    });

    it('un pendiente que no sale no es "¿no lo compraste?" (solo los marcados)', () => {
      const r = reconcileReceipt([line({ raw_text: 'PAN' })], [leche], catalogo, [], [arroz, pan]);

      expect(r.missing).toEqual([leche]);
    });

    it('si una línea calza igual con un marcado y con un pendiente, gana el marcado', () => {
      const lecheOtra = item('i-leche-2', 'p-leche-2', 'Leche');
      const r = reconcileReceipt([line({ raw_text: 'LECHE' })], [leche], catalogo, [], [lecheOtra]);

      expect(r.lines[0].match?.itemId).toBe('i-leche');
    });

    it('el caso real: "Arroz" pendiente ↔ "ARROZ G1 GRANO LARGO 1KG" se ofrece en "¿Es este?"', () => {
      const arrozCorto = item('i-arroz-c', 'p-arroz-c', 'Arroz');
      const r = reconcileReceipt(
        [line({ raw_text: 'ARROZ G1 GRANO LARGO 1KG' })],
        [leche],
        [],
        [],
        [arrozCorto]
      );

      expect(r.lines[0].status).toBe('candidate');
      expect(r.lines[0].candidates[0]).toMatchObject({ itemId: 'i-arroz-c', wasPending: true });
    });
  });

  describe('nombre corto contenido en una línea larga (spec 0015, AC3)', () => {
    it('se ofrece como candidato del catálogo, sin coincidir solo', () => {
      const r = reconcileReceipt(
        [line({ raw_text: 'COLUN LECHE SIN LACTOSA SEMIDES 1L' })],
        [],
        [{ productId: 'p-leche', name: 'Leche' }],
        []
      );

      expect(r.lines[0].status).toBe('candidate');
      expect(r.lines[0].candidates.map((c) => c.productId)).toEqual(['p-leche']);
    });

    it('compara palabras enteras: "Sal" no está contenido en "SALSA DORASOL"', () => {
      const r = reconcileReceipt(
        [line({ raw_text: 'SALSA DORASOL 160G 4X1000' })],
        [],
        [{ productId: 'p-sal', name: 'Sal' }],
        []
      );

      expect(r.lines[0].status).toBe('extra');
    });
  });

  it('los ítems marcados sin línea en la boleta quedan como "¿no lo compraste?"', () => {
    const r = reconcileReceipt([line({ raw_text: 'LECHE' })], [leche, pan], catalogo, []);

    expect(r.missing).toEqual([pan]);
  });

  it('solo concilia productos legibles (descuentos, bolsas e ilegibles no)', () => {
    const r = reconcileReceipt(
      [
        line({ raw_text: 'LECHE' }),
        line({ kind: 'discount', raw_text: 'DCTO', line_total: -100 }),
        line({ legible: false, raw_text: null }),
      ],
      [leche],
      catalogo,
      []
    );

    expect(r.lines.map((l) => l.index)).toEqual([0]);
  });
});

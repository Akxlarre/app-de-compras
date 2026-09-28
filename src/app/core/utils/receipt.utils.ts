import type {
  OcrLineKind,
  OcrReceipt,
  OcrReceiptLine,
  ReceiptValidation,
} from '@core/models/receipt.model';

const KINDS: readonly OcrLineKind[] = ['product', 'discount', 'bag', 'deposit', 'other'];

/** Error de respuesta del OCR que no cumple el contrato (la UI la trata como "no se pudo leer"). */
export class OcrContractError extends Error {
  constructor(detail: string) {
    super(`Respuesta del OCR fuera de contrato: ${detail}`);
  }
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

function nullableOf<T>(v: unknown, ok: (x: unknown) => x is T, field: string): T | null {
  if (v === undefined || v === null) return null;
  if (!ok(v)) throw new OcrContractError(`${field} inválido`);
  return v;
}
const isNumber = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
const isString = (x: unknown): x is string => typeof x === 'string';
const isUnit = (x: unknown): x is 'un' | 'kg' => x === 'un' || x === 'kg';

/**
 * Valida la respuesta de `process-receipt` contra el contrato (specs/0007). El esquema estricto
 * de Gemini debería garantizarlo, pero la app no confía: lanza `OcrContractError` si no cumple.
 * Los campos opcionales ausentes quedan en null y los extra (p. ej. `_model`) se descartan.
 */
export function parseOcrReceipt(data: unknown): OcrReceipt {
  if (!isRecord(data) || !Array.isArray(data['lines'])) {
    throw new OcrContractError('falta el arreglo lines');
  }
  const lines = data['lines'].map((raw, i): OcrReceiptLine => {
    if (!isRecord(raw)) throw new OcrContractError(`línea ${i} no es un objeto`);
    if (!KINDS.includes(raw['kind'] as OcrLineKind)) {
      throw new OcrContractError(`línea ${i}: kind desconocido`);
    }
    if (typeof raw['legible'] !== 'boolean') {
      throw new OcrContractError(`línea ${i}: falta legible`);
    }
    return {
      raw_text: nullableOf(raw['raw_text'], isString, `línea ${i} raw_text`),
      kind: raw['kind'] as OcrLineKind,
      name: nullableOf(raw['name'], isString, `línea ${i} name`),
      matched_list_item: nullableOf(
        raw['matched_list_item'],
        isString,
        `línea ${i} matched_list_item`
      ),
      quantity: nullableOf(raw['quantity'], isNumber, `línea ${i} quantity`),
      unit: nullableOf(raw['unit'], isUnit, `línea ${i} unit`),
      unit_price: nullableOf(raw['unit_price'], isNumber, `línea ${i} unit_price`),
      line_total: nullableOf(raw['line_total'], isNumber, `línea ${i} line_total`),
      applies_to: nullableOf(raw['applies_to'], isNumber, `línea ${i} applies_to`),
      legible: raw['legible'],
    };
  });
  return {
    store: nullableOf(data['store'], isString, 'store'),
    date: nullableOf(data['date'], isString, 'date'),
    total: nullableOf(data['total'], isNumber, 'total'),
    lines,
  };
}

/** Pesos de tolerancia: el granel (kg × $/kg) se redondea al peso en la boleta. */
const TOLERANCE = 2;

/**
 * Revisa una boleta leída por OCR con aritmética: el modelo puede inventar un número plausible,
 * pero no puede hacer cuadrar cantidad × precio con el total de línea, ni las líneas con el total.
 * Los descuentos restan (vengan con signo o no); bolsas y envases suman; `other` (donación,
 * redondeo) no se cobra en el total.
 */
export function validateReceipt(receipt: OcrReceipt): ReceiptValidation {
  const doubtfulLines: ReceiptValidation['doubtfulLines'] = [];
  let computedTotal = 0;

  receipt.lines.forEach((line, index) => {
    if (!line.legible) {
      doubtfulLines.push({ index, reason: 'ilegible' });
      return;
    }
    if (line.kind === 'other') return;

    if (line.line_total == null) {
      if (line.kind === 'product') doubtfulLines.push({ index, reason: 'sin-total' });
      return;
    }

    if (line.kind === 'discount') {
      computedTotal -= Math.abs(line.line_total);
      return;
    }

    computedTotal += line.line_total;
    if (
      line.kind === 'product' &&
      line.quantity != null &&
      line.unit_price != null &&
      Math.abs(line.quantity * line.unit_price - line.line_total) > TOLERANCE
    ) {
      doubtfulLines.push({ index, reason: 'no-cuadra' });
    }
  });

  const totalMatches =
    receipt.total == null ? null : Math.abs(computedTotal - receipt.total) <= TOLERANCE;
  return { computedTotal, totalMatches, doubtfulLines };
}

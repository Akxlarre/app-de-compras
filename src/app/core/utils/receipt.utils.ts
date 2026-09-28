import type { OcrReceipt, ReceiptValidation } from '@core/models/receipt.model';

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

import type {
  ApplyReceiptInput,
  LineDecision,
  LineTarget,
  MatchCandidate,
  MissingDecision,
  OcrReceipt,
  OcrReceiptLine,
  ReceiptCorrection,
  ReceiptExtraInput,
  ReceiptItemInput,
  ReceiptValidation,
  ReconciliationResult,
} from '@core/models/receipt.model';

/**
 * Cantidad y precio unitario pagado de una línea de producto: los descuentos que aplican a esa
 * línea (`applies_to`) bajan el precio. Sin cantidad cuenta 1; sin precio unitario sale del total.
 */
export function lineAmounts(
  lines: OcrReceiptLine[],
  index: number
): { quantity: number; unitPrice: number } {
  const l = lines[index];
  const quantity = l.quantity && l.quantity > 0 ? l.quantity : 1;
  const discount = lines
    .filter((d) => d.kind === 'discount' && d.applies_to === index)
    .reduce((s, d) => s + (d.line_total ?? 0), 0);
  if (!discount && l.unit_price != null) return { quantity, unitPrice: l.unit_price };

  const total = (l.line_total ?? (l.unit_price ?? 0) * quantity) + discount;
  return { quantity, unitPrice: Math.max(0, Math.round(total / quantity)) };
}

export function targetFromCandidate(c: MatchCandidate): LineTarget {
  return c.itemId
    ? { kind: 'item', itemId: c.itemId, productId: c.productId, name: c.name }
    : { kind: 'product', productId: c.productId, name: c.name };
}

/** Clave de un destino para comparar lo que propuso la lectura con lo que eligió el usuario. */
export function targetKey(t: LineTarget | null): string | null {
  if (!t) return null;
  return t.kind === 'new' ? 'new' : t.productId;
}

/** Punto de partida de la pantalla de conciliación (spec 0008). */
export function initialDecisions(
  result: ReconciliationResult,
  receipt: OcrReceipt,
  validation: ReceiptValidation
): LineDecision[] {
  return result.lines.map((r) => {
    const { quantity, unitPrice } = lineAmounts(receipt.lines, r.index);
    let target: LineTarget | null = null;
    if (r.status !== 'candidate') {
      target = r.match ? targetFromCandidate(r.match) : { kind: 'new' };
    }
    return {
      index: r.index,
      rawText: r.line.raw_text,
      name: r.line.name || r.line.raw_text || '',
      quantity,
      unitPrice,
      target,
      status: r.status,
      candidates: r.candidates,
      saveToCatalog: false,
      doubt: validation.doubtfulLines.find((d) => d.index === r.index)?.reason ?? null,
      ocr: { quantity, unitPrice, target: targetKey(target) },
    };
  });
}

/** Se puede confirmar cuando no queda ningún "¿Es este?" sin elegir. */
export function canConfirmReceipt(decisions: LineDecision[]): boolean {
  return decisions.every((d) => d.target !== null);
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

function corrections(decisions: LineDecision[]): ReceiptCorrection[] {
  const out: ReceiptCorrection[] = [];
  for (const d of decisions) {
    if (d.quantity !== d.ocr.quantity) {
      out.push({ index: d.index, field: 'quantity', ocr: d.ocr.quantity, user: d.quantity });
    }
    if (d.unitPrice !== d.ocr.unitPrice) {
      out.push({ index: d.index, field: 'unitPrice', ocr: d.ocr.unitPrice, user: d.unitPrice });
    }
    const key = targetKey(d.target);
    if (key !== d.ocr.target) {
      out.push({ index: d.index, field: 'product', ocr: d.ocr.target, user: key });
    }
  }
  return out;
}

/**
 * Traduce lo decidido en la conciliación a `apply_receipt`:
 * - ítems de la lista con precio y cantidad reales (varias líneas al mismo ítem se suman) y alias;
 * - productos conocidos fuera de la lista y, de lo nuevo, solo lo marcado "guardar en catálogo";
 * - los "¿no lo compraste?" desmarcados vuelven a pendiente.
 * El total es el impreso; si el OCR no lo leyó, la suma de la boleta.
 */
export function buildApplyReceipt(args: {
  listId: string;
  carryPending: boolean;
  receipt: OcrReceipt;
  validation: ReceiptValidation;
  imagePath: string | null;
  decisions: LineDecision[];
  missing: MissingDecision[];
}): ApplyReceiptInput {
  const { receipt, validation, decisions } = args;
  const byItem = new Map<string, { quantity: number; amount: number; rawText: string | null }>();
  const extras: ReceiptExtraInput[] = [];

  for (const d of decisions) {
    const t = d.target;
    if (!t) continue;
    if (t.kind === 'item') {
      const acc = byItem.get(t.itemId) ?? { quantity: 0, amount: 0, rawText: d.rawText };
      acc.quantity += d.quantity;
      acc.amount += d.quantity * d.unitPrice;
      byItem.set(t.itemId, acc);
    } else if (t.kind === 'product') {
      extras.push({
        productId: t.productId,
        rawText: d.rawText,
        name: t.name,
        unitPrice: d.unitPrice,
        quantity: d.quantity,
      });
    } else if (d.saveToCatalog && d.name.trim()) {
      extras.push({
        productId: null,
        rawText: d.rawText,
        name: d.name.trim(),
        unitPrice: d.unitPrice,
        quantity: d.quantity,
      });
    }
  }

  const items: ReceiptItemInput[] = [...byItem].map(([itemId, a]) => ({
    itemId,
    unitPrice: Math.round(a.amount / a.quantity),
    quantity: a.quantity,
    rawText: a.rawText,
    saveAlias: !!a.rawText,
  }));

  return {
    listId: args.listId,
    carryPending: args.carryPending,
    store: receipt.store,
    purchasedAt: receipt.date && DATE.test(receipt.date) ? receipt.date : null,
    total: receipt.total ?? (validation.computedTotal > 0 ? validation.computedTotal : null),
    imagePath: args.imagePath,
    ocrResult: receipt,
    ocrCheck: { ...validation, corrections: corrections(decisions) },
    items,
    extras,
    uncheckItemIds: args.missing.filter((m) => !m.bought).map((m) => m.item.itemId),
  };
}

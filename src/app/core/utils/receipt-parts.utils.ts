import type {
  ApplyReceiptInput,
  OcrReceipt,
  ReceiptCheck,
  ReceiptPartInput,
  ReceiptValidation,
} from '@core/models/receipt.model';

/** Una boleta de una salida por varias tiendas (spec 0015, D6). */
export interface ReceiptPart {
  receipt: OcrReceipt;
  validation: ReceiptValidation;
  imagePath: string | null;
}

/** Dónde empieza cada boleta en la lista combinada de líneas. */
export function partOffsets(receipts: OcrReceipt[]): number[] {
  let at = 0;
  return receipts.map((r) => {
    const start = at;
    at += r.lines.length;
    return start;
  });
}

/**
 * Las boletas de la salida como una sola: tiendas unidas, totales sumados y líneas seguidas (los
 * descuentos siguen apuntando a su producto). La conciliación y la pantalla trabajan sobre esto.
 */
export function combineReceipts(receipts: OcrReceipt[]): OcrReceipt {
  if (receipts.length === 1) return receipts[0];
  const offsets = partOffsets(receipts);
  const totals = receipts.map((r) => r.total).filter((t): t is number => t != null);
  return {
    store:
      receipts
        .map((r) => r.store)
        .filter(Boolean)
        .join(' · ') || null,
    date: receipts.find((r) => r.date)?.date ?? null,
    total: totals.length ? totals.reduce((s, t) => s + t, 0) : null,
    lines: receipts.flatMap((r, i) =>
      r.lines.map((l) =>
        l.applies_to == null ? l : { ...l, applies_to: l.applies_to + offsets[i] }
      )
    ),
  };
}

/** La revisión de cada boleta, unida: "no cuadra" si alguna no cuadra; null si ninguna se pudo revisar. */
export function combineValidations(
  validations: ReceiptValidation[],
  offsets: number[]
): ReceiptValidation {
  const checked = validations.map((v) => v.totalMatches).filter((m) => m !== null);
  return {
    computedTotal: validations.reduce((s, v) => s + v.computedTotal, 0),
    totalMatches: checked.length ? checked.every(Boolean) : null,
    doubtfulLines: validations.flatMap((v, i) =>
      v.doubtfulLines.map((d) => ({ ...d, index: d.index + offsets[i] }))
    ),
  };
}

/**
 * Reparte lo armado sobre la boleta combinada entre las boletas: la primera va como la principal
 * de `apply_receipt` y las demás en `others`, cada una con sus líneas y correcciones numeradas
 * desde 0. Ítems, extras y "no lo compré" son de la compra; un extra lleva su boleta y su línea.
 */
export function splitByReceipt(input: ApplyReceiptInput, parts: ReceiptPart[]): ApplyReceiptInput {
  const offsets = partOffsets(parts.map((p) => p.receipt));
  const partOf = (index: number) => {
    let i = 0;
    while (i + 1 < parts.length && index >= offsets[i + 1]) i++;
    return i;
  };
  const corrections = (input.ocrCheck as ReceiptCheck | null)?.corrections ?? [];

  const pieces: ReceiptPartInput[] = parts.map((p, i) => ({
    store: p.receipt.store,
    purchasedAt: i === 0 ? input.purchasedAt : p.receipt.date,
    total: p.receipt.total ?? (p.validation.computedTotal > 0 ? p.validation.computedTotal : null),
    imagePath: p.imagePath,
    ocrResult: p.receipt,
    ocrCheck: {
      ...p.validation,
      corrections: corrections
        .filter((c) => partOf(c.index) === i)
        .map((c) => ({ ...c, index: c.index - offsets[i] })),
    },
    lines: input.lines
      .filter((l) => partOf(l.index) === i)
      .map((l) => ({ ...l, index: l.index - offsets[i] })),
  }));

  const [main, ...others] = pieces;
  return {
    ...input,
    ...main,
    extras: input.extras.map((e) =>
      e.lineIndex == null
        ? e
        : {
            ...e,
            receiptIndex: partOf(e.lineIndex),
            lineIndex: e.lineIndex - offsets[partOf(e.lineIndex)],
          }
    ),
    others,
  };
}

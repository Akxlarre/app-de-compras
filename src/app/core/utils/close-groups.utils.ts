import type { LineDecision, LineTarget } from '@core/models/receipt.model';
import { normalizeReceiptText } from './reconcile.utils';

/** Una fila del cierre: una línea de la boleta o la misma línea repetida (spec 0016 AC10). */
export interface DecisionGroup {
  key: string;
  /** Índices de las líneas que junta; editar la fila cambia todas. */
  indexes: number[];
  /** La primera línea: la que se muestra y se edita. */
  decision: LineDecision;
  /** Unidades sumadas ("× 2"). */
  quantity: number;
  total: number;
  /** Alguna línea del grupo quedó para revisar. */
  doubt: boolean;
}

function targetKey(t: LineTarget | null): string {
  if (!t) return 'none';
  if (t.kind === 'new') return 'new';
  return t.kind === 'item' ? `item:${t.itemId}` : `product:${t.productId}`;
}

/**
 * Junta las líneas iguales (mismo texto, mismo precio unitario y mismo destino), en el orden de la
 * boleta. Cada línea se sigue guardando por separado. Un "¿Es este?" sin responder va solo.
 */
export function groupDecisions(decisions: LineDecision[]): DecisionGroup[] {
  const groups = new Map<string, DecisionGroup>();
  for (const d of decisions) {
    const key =
      d.target === null
        ? `line:${d.index}`
        : `${normalizeReceiptText(d.rawText ?? d.name)}|${d.unitPrice}|${targetKey(d.target)}`;
    const amount = Math.round(d.quantity * d.unitPrice);
    const g = groups.get(key);
    if (g) {
      g.indexes.push(d.index);
      g.quantity += d.quantity;
      g.total += amount;
      g.doubt ||= !!d.doubt;
    } else {
      groups.set(key, {
        key,
        indexes: [d.index],
        decision: d,
        quantity: d.quantity,
        total: amount,
        doubt: !!d.doubt,
      });
    }
  }
  return [...groups.values()];
}

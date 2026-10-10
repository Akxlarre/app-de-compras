import type { ListItem } from './shopping-list.model';

/** Valores finales de un ítem que se escriben tal cual: unidad, cantidad y precio (spec 0019). */
export type ItemPatch = Partial<Pick<ListItem, 'quantity' | 'unit' | 'unit_price'>>;

/**
 * Cambio de la lista hecho sin conexión, pendiente de enviar (spec 0011). El marcado y el `patch`
 * guardan el valor final (idempotentes); la cantidad del stepper guarda el incremento.
 */
export type QueuedChange =
  | { kind: 'check'; itemId: string; checked: boolean }
  | { kind: 'quantity'; itemId: string; delta: number }
  | { kind: 'patch'; itemId: string; patch: ItemPatch };

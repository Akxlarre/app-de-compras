import type { ActiveShoppingList } from '../models/shopping-list.model';
import type { QueuedChange } from '../models/offline-queue.model';

/**
 * Agrega un cambio a la cola compactando por ítem: el marcado se reemplaza por el último valor y
 * las cantidades suman su incremento (si se anulan, salen). Devuelve una cola nueva.
 */
export function enqueue(queue: QueuedChange[], change: QueuedChange): QueuedChange[] {
  const index = queue.findIndex((c) => c.kind === change.kind && c.itemId === change.itemId);
  if (index === -1) return [...queue, change];

  const next = [...queue];
  if (change.kind === 'check') {
    next[index] = change;
    return next;
  }

  const delta = (queue[index] as Extract<QueuedChange, { kind: 'quantity' }>).delta + change.delta;
  if (delta === 0) next.splice(index, 1);
  else next[index] = { ...change, delta };
  return next;
}

/** La lista como se ve con los cambios pendientes aplicados (cantidad mínima 1). */
export function applyQueue(list: ActiveShoppingList, queue: QueuedChange[]): ActiveShoppingList {
  if (queue.length === 0) return list;
  return {
    ...list,
    list_items: list.list_items.map((item) =>
      queue.reduce((acc, change) => {
        if (change.itemId !== acc.id) return acc;
        return change.kind === 'check'
          ? { ...acc, is_checked: change.checked }
          : { ...acc, quantity: Math.max(1, acc.quantity + change.delta) };
      }, item),
    ),
  };
}

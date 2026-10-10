import type { ActiveShoppingList } from '../models/shopping-list.model';
import type { QueuedChange } from '../models/offline-queue.model';

type PatchChange = Extract<QueuedChange, { kind: 'patch' }>;
type QuantityChange = Extract<QueuedChange, { kind: 'quantity' }>;

/**
 * Agrega un cambio a la cola compactando por ítem: el marcado se reemplaza por el último valor,
 * las cantidades suman su incremento (si se anulan, salen) y los `patch` se juntan con el último
 * valor de cada campo. Una cantidad fija borra los incrementos anteriores y absorbe los
 * siguientes. Devuelve una cola nueva.
 */
export function enqueue(queue: QueuedChange[], change: QueuedChange): QueuedChange[] {
  if (change.kind === 'patch') return enqueuePatch(queue, change);

  const fixed = queue.findIndex(
    (c) => c.kind === 'patch' && c.itemId === change.itemId && c.patch.quantity != null
  );
  if (change.kind === 'quantity' && fixed !== -1) {
    const next = [...queue];
    const patch = (queue[fixed] as PatchChange).patch;
    next[fixed] = {
      ...(queue[fixed] as PatchChange),
      patch: { ...patch, quantity: Math.max(1, patch.quantity! + change.delta) },
    };
    return next;
  }

  const index = queue.findIndex((c) => c.kind === change.kind && c.itemId === change.itemId);
  if (index === -1) return [...queue, change];

  const next = [...queue];
  if (change.kind === 'check') {
    next[index] = change;
    return next;
  }

  const delta = (queue[index] as QuantityChange).delta + change.delta;
  if (delta === 0) next.splice(index, 1);
  else next[index] = { ...change, delta };
  return next;
}

function enqueuePatch(queue: QueuedChange[], change: PatchChange): QueuedChange[] {
  const rest =
    change.patch.quantity != null
      ? queue.filter((c) => !(c.kind === 'quantity' && c.itemId === change.itemId))
      : queue;
  const index = rest.findIndex((c) => c.kind === 'patch' && c.itemId === change.itemId);
  if (index === -1) return [...rest, change];
  const next = [...rest];
  next[index] = { ...change, patch: { ...(rest[index] as PatchChange).patch, ...change.patch } };
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
        if (change.kind === 'check') return { ...acc, is_checked: change.checked };
        if (change.kind === 'patch') return { ...acc, ...change.patch };
        return { ...acc, quantity: Math.max(1, acc.quantity + change.delta) };
      }, item)
    ),
  };
}

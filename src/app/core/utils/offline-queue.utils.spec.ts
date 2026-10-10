import { describe, it, expect } from 'vitest';
import { applyQueue, enqueue } from './offline-queue.utils';
import type { ActiveShoppingList } from '../models/shopping-list.model';
import type { QueuedChange } from '../models/offline-queue.model';

const list = (items: { id: string; quantity: number; is_checked: boolean }[]) =>
  ({ id: 'l1', list_items: items } as unknown as ActiveShoppingList);

describe('enqueue', () => {
  it('el marcado guarda solo el último valor por ítem', () => {
    let q: QueuedChange[] = [];
    q = enqueue(q, { kind: 'check', itemId: 'a', checked: true });
    q = enqueue(q, { kind: 'check', itemId: 'a', checked: false });
    expect(q).toEqual([{ kind: 'check', itemId: 'a', checked: false }]);
  });

  it('las cantidades suman sus incrementos por ítem', () => {
    let q: QueuedChange[] = [];
    q = enqueue(q, { kind: 'quantity', itemId: 'a', delta: 1 });
    q = enqueue(q, { kind: 'check', itemId: 'b', checked: true });
    q = enqueue(q, { kind: 'quantity', itemId: 'a', delta: 2 });
    expect(q).toEqual([
      { kind: 'quantity', itemId: 'a', delta: 3 },
      { kind: 'check', itemId: 'b', checked: true },
    ]);
  });

  it('incrementos que se anulan salen de la cola', () => {
    let q: QueuedChange[] = [];
    q = enqueue(q, { kind: 'quantity', itemId: 'a', delta: 1 });
    q = enqueue(q, { kind: 'quantity', itemId: 'a', delta: -1 });
    expect(q).toEqual([]);
  });

  it('unidad, cantidad y precio (spec 0019) se juntan por ítem con el último valor', () => {
    let q: QueuedChange[] = [];
    q = enqueue(q, { kind: 'patch', itemId: 'a', patch: { unit: 'kg', quantity: 1.5 } });
    q = enqueue(q, { kind: 'patch', itemId: 'a', patch: { unit_price: 1990 } });
    q = enqueue(q, { kind: 'patch', itemId: 'a', patch: { quantity: 2 } });
    expect(q).toEqual([
      { kind: 'patch', itemId: 'a', patch: { unit: 'kg', quantity: 2, unit_price: 1990 } },
    ]);
  });

  it('una cantidad fija reemplaza los incrementos anteriores, y los posteriores se le suman', () => {
    let q: QueuedChange[] = [];
    q = enqueue(q, { kind: 'quantity', itemId: 'a', delta: 2 });
    q = enqueue(q, { kind: 'patch', itemId: 'a', patch: { quantity: 3, unit: 'paquete' } });
    expect(q).toEqual([{ kind: 'patch', itemId: 'a', patch: { quantity: 3, unit: 'paquete' } }]);
    q = enqueue(q, { kind: 'quantity', itemId: 'a', delta: 1 });
    expect(q).toEqual([{ kind: 'patch', itemId: 'a', patch: { quantity: 4, unit: 'paquete' } }]);
  });

  it('no muta la cola recibida', () => {
    const q: QueuedChange[] = [{ kind: 'quantity', itemId: 'a', delta: 1 }];
    enqueue(q, { kind: 'quantity', itemId: 'a', delta: 1 });
    expect(q).toEqual([{ kind: 'quantity', itemId: 'a', delta: 1 }]);
  });
});

describe('applyQueue', () => {
  it('superpone marcados y cantidades (mínimo 1) sobre la lista', () => {
    const result = applyQueue(
      list([
        { id: 'a', quantity: 2, is_checked: false },
        { id: 'b', quantity: 1, is_checked: true },
      ]),
      [
        { kind: 'check', itemId: 'a', checked: true },
        { kind: 'quantity', itemId: 'b', delta: -5 },
      ]
    );
    expect(result.list_items).toEqual([
      { id: 'a', quantity: 2, is_checked: true },
      { id: 'b', quantity: 1, is_checked: true },
    ]);
  });

  it('superpone unidad, cantidad y precio anotados (spec 0019)', () => {
    const result = applyQueue(list([{ id: 'a', quantity: 1, is_checked: false }]), [
      { kind: 'patch', itemId: 'a', patch: { unit: 'kg', quantity: 1.5, unit_price: 2990 } },
    ]);
    expect(result.list_items).toEqual([
      { id: 'a', quantity: 1.5, is_checked: false, unit: 'kg', unit_price: 2990 },
    ]);
  });

  it('ignora cambios de ítems que ya no están', () => {
    const base = list([{ id: 'a', quantity: 1, is_checked: false }]);
    expect(applyQueue(base, [{ kind: 'check', itemId: 'x', checked: true }]).list_items).toEqual(
      base.list_items
    );
  });
});

import { describe, it, expect } from 'vitest';
import { pendingListText } from './share-list.utils';

const item = (id: string, name: string, category: string, over: Record<string, unknown> = {}) =>
  ({
    id,
    created_at: `2026-10-10T10:00:0${id}Z`,
    is_checked: false,
    quantity: 1,
    unit: 'un',
    notes: null,
    product: { name, category },
    ...over,
  } as any);

describe('pendingListText (spec 0024 D2)', () => {
  it('pendientes por pasillo, con cantidad (si no es 1 un) y nota', () => {
    const text = pendingListText([
      item('1', 'Leche', 'Lácteos y huevos', { quantity: 2 }),
      item('2', 'Palta', 'Frutas y verduras', { quantity: 3 }),
      item('3', 'Plátano', 'Frutas y verduras', { quantity: 1.5, unit: 'kg', notes: 'maduros' }),
      item('4', 'Pan', 'Panadería', { is_checked: true }),
      item('5', 'Sal', 'Despensa'),
    ]);
    expect(text).toBe(
      [
        '*Lista de compras*',
        '_Frutas y verduras_',
        '• Palta × 3',
        '• Plátano 1,5 kg (maduros)',
        '_Lácteos y huevos_',
        '• Leche × 2',
        '_Despensa_',
        '• Sal',
      ].join('\n')
    );
  });

  it('sin pendientes, null', () => {
    expect(pendingListText([item('1', 'Pan', 'Panadería', { is_checked: true })])).toBeNull();
    expect(pendingListText([])).toBeNull();
  });
});

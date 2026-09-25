import { describe, it, expect } from 'vitest';
import { needsRestock } from './restock.utils';

const now = new Date(2026, 8, 25, 10, 0);
const daysAgo = (n: number) => new Date(2026, 8, 25 - n, 9, 0).toISOString();

describe('needsRestock', () => {
  it('un producto nunca comprado no se recomienda', () => {
    expect(needsRestock({ last_purchased_at: null }, now)).toBe(false);
    expect(needsRestock({}, now)).toBe(false);
  });

  it('sin duración estimada usa 7 días', () => {
    expect(needsRestock({ last_purchased_at: daysAgo(6) }, now)).toBe(false);
    expect(needsRestock({ last_purchased_at: daysAgo(7) }, now)).toBe(true);
  });

  it('respeta la duración estimada del producto', () => {
    const arroz = { estimated_duration_days: 30 };
    expect(needsRestock({ ...arroz, last_purchased_at: daysAgo(20) }, now)).toBe(false);
    expect(needsRestock({ ...arroz, last_purchased_at: daysAgo(30) }, now)).toBe(true);

    const pan = { estimated_duration_days: 2 };
    expect(needsRestock({ ...pan, last_purchased_at: daysAgo(2) }, now)).toBe(true);
  });
});

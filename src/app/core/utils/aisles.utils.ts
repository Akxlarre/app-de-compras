import { AISLES, type Aisle } from '../models/product.model';
import { sortListItems } from './shopping-list.utils';

type GroupableItem = {
  id: string;
  created_at: string;
  is_checked: boolean;
  product?: { category?: string | null } | null;
};

export interface AisleGroup<T> {
  aisle: Aisle;
  items: T[];
  /** Cuántos faltan por marcar en el pasillo. */
  pending: number;
}

/** El pasillo de un producto; cualquier valor desconocido (o vacío) es "Otros" (spec 0019 D1). */
export function aisleOf(category: string | null | undefined): Aisle {
  return (AISLES as readonly string[]).includes(category ?? '') ? (category as Aisle) : 'Otros';
}

/**
 * Mi Lista por pasillo (spec 0019 D3): grupos en el orden del súper, sin pasillos vacíos, y dentro
 * de cada uno el orden de siempre (pendientes como se agregaron, marcados al final).
 */
export function groupByAisle<T extends GroupableItem>(items: readonly T[]): AisleGroup<T>[] {
  const byAisle = new Map<Aisle, T[]>();
  for (const item of sortListItems(items)) {
    const aisle = aisleOf(item.product?.category);
    byAisle.set(aisle, [...(byAisle.get(aisle) ?? []), item]);
  }
  return AISLES.filter((a) => byAisle.has(a)).map((aisle) => {
    const list = byAisle.get(aisle)!;
    return { aisle, items: list, pending: list.filter((i) => !i.is_checked).length };
  });
}

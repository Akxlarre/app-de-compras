import type { Aisle } from '../models/product.model';
import { aisleOf } from './aisles.utils';
import { matchesSearch } from './product-sheet.utils';

/** Orden del Catálogo (spec 0022 D1). */
export type CatalogOrder = 'name' | 'most' | 'oldest';

export interface CatalogFilters {
  query: string;
  /** null = todos los pasillos. */
  aisle: Aisle | null;
  noPrice: boolean;
}

type CatalogProduct = {
  id: string;
  name: string;
  category?: string | null;
  last_price?: number | null;
  daysSincePurchase: number | null;
};

const byName = (a: CatalogProduct, b: CatalogProduct) =>
  a.name.localeCompare(b.name, 'es', { sensitivity: 'base' });

/**
 * A–Z, más comprados (empate por nombre) o la última compra más vieja primero. Lo que nunca se
 * compró va al final en los dos últimos. Devuelve una lista nueva.
 */
export function sortCatalog<T extends CatalogProduct>(
  products: readonly T[],
  order: CatalogOrder,
  counts: ReadonlyMap<string, number>
): T[] {
  const list = [...products];
  if (order === 'most') {
    return list.sort((a, b) => (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0) || byName(a, b));
  }
  if (order === 'oldest') {
    return list.sort(
      (a, b) => (b.daysSincePurchase ?? -1) - (a.daysSincePurchase ?? -1) || byName(a, b)
    );
  }
  return list.sort(byName);
}

/** Buscador + "Sin precio" + pasillo, combinados (spec 0022 D2). */
export function filterCatalog<T extends CatalogProduct>(
  products: readonly T[],
  { query, aisle, noPrice }: CatalogFilters
): T[] {
  return products.filter(
    (p) =>
      matchesSearch(p.name, query) &&
      (!noPrice || p.last_price == null) &&
      (!aisle || aisleOf(p.category) === aisle)
  );
}

import type { Product } from '@core/models/product.model';
import { daysSince } from './date.utils';

/** Duración por defecto de un producto sin `estimated_duration_days`. */
export const DEFAULT_RESTOCK_DAYS = 7;

/**
 * ¿Toca reponer? Comprado hace al menos su duración estimada (7 días si no tiene).
 * Un producto que nunca se compró no se recomienda: no hay con qué estimar.
 */
export function needsRestock(
  product: Pick<Product, 'last_purchased_at' | 'estimated_duration_days'>,
  now: Date = new Date()
): boolean {
  if (!product.last_purchased_at) return false;
  const duration = product.estimated_duration_days ?? DEFAULT_RESTOCK_DAYS;
  return daysSince(product.last_purchased_at, now) >= duration;
}

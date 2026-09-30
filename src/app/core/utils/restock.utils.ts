import type { Product } from '@core/models/product.model';
import type { RestockStat, RestockSuggestion } from '@core/models/restock.model';
import { daysSince } from './date.utils';

/** Intervalo por defecto de un producto con una sola compra y sin duración estimada. */
export const DEFAULT_RESTOCK_DAYS = 7;

/**
 * Cada cuántos días se repone un producto (spec 0014): la mediana del historial con 2 o más
 * compras; si no, su duración estimada o 7 días.
 */
export function restockIntervalDays(
  product: Pick<Product, 'estimated_duration_days'>,
  stat: RestockStat | undefined
): { days: number; learned: boolean } {
  if (stat && stat.purchase_count >= 2 && stat.median_interval_days != null) {
    return { days: Math.max(1, Math.round(Number(stat.median_interval_days))), learned: true };
  }
  return { days: product.estimated_duration_days ?? DEFAULT_RESTOCK_DAYS, learned: false };
}

/**
 * "Te puede faltar": productos cuya última compra fue hace al menos su intervalo, que no están en
 * la lista, no están pospuestos y se compraron alguna vez. El más atrasado primero.
 */
export function restockSuggestions(
  products: readonly Product[],
  stats: readonly RestockStat[],
  inListProductIds: ReadonlySet<string>,
  now: Date = new Date()
): RestockSuggestion[] {
  const byProduct = new Map(stats.map((s) => [s.product_id, s]));
  const suggestions: RestockSuggestion[] = [];

  for (const product of products) {
    if (inListProductIds.has(product.id)) continue;
    if (product.restock_snoozed_until && new Date(product.restock_snoozed_until) > now) continue;

    const stat = byProduct.get(product.id);
    const last = stat?.last_purchased_at ?? product.last_purchased_at;
    if (!last) continue;

    const days = daysSince(last, now);
    const interval = restockIntervalDays(product, stat);
    if (days < interval.days) continue;

    suggestions.push({ product, daysSince: days, intervalDays: interval.days, learned: interval.learned });
  }

  return suggestions.sort(
    (a, b) =>
      b.daysSince - b.intervalDays - (a.daysSince - a.intervalDays) ||
      a.product.name.localeCompare(b.product.name)
  );
}

/** "Todavía tengo": hasta cuándo posponer (un intervalo desde ahora). */
export function snoozeUntil(intervalDays: number, now: Date = new Date()): string {
  const until = new Date(now);
  until.setDate(until.getDate() + intervalDays);
  return until.toISOString();
}

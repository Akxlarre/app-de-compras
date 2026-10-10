import type { StorePrice, StorePriceRow } from '@core/models/price-insights.model';
import type { ProductPurchase } from '@core/models/product-sheet.model';

/** Desde cuánto se avisa que un precio subió (spec 0020 D2). */
const RISE_THRESHOLD = 0.1;

/**
 * El último precio pagado en cada tienda (spec 0020 D1), del más barato al más caro. Solo líneas de
 * boleta con tienda; sin precio unitario se calcula desde el monto y la cantidad.
 */
export function pricesByStore(rows: StorePriceRow[]): StorePrice[] {
  const latest = new Map<string, StorePrice>();
  for (const r of rows) {
    const store = r.receipt?.store?.trim();
    const date = r.receipt?.purchased_at ?? r.list?.completed_at;
    if (!store || !date) continue;
    const unitPrice =
      r.unit_price != null
        ? Number(r.unit_price)
        : Math.round(Number(r.amount) / (Number(r.quantity) || 1));
    if (!unitPrice) continue;
    const seen = latest.get(store);
    if (!seen || date > seen.date) latest.set(store, { store, unitPrice, date });
  }
  return [...latest.values()].sort((a, b) => a.unitPrice - b.unitPrice);
}

/** Porcentaje entero de subida si es de 10% o más; null si bajó, subió poco o no hay anterior. */
export function priceRise(previous: number | null | undefined, current: number): number | null {
  if (!previous || previous <= 0) return null;
  const rise = current / previous - 1;
  return rise >= RISE_THRESHOLD - 1e-9 ? Math.round(rise * 100) : null;
}

/**
 * Subida de la última compra contra la anterior (las compras van de la más reciente a la más vieja).
 * Si la última tiene tienda, compara con la anterior de esa tienda.
 */
export function lastRise(purchases: ProductPurchase[]): number | null {
  const priced = purchases.filter((p) => p.unitPrice != null);
  const [last, ...rest] = priced;
  if (!last) return null;
  const previous = (last.stores && rest.find((p) => p.stores === last.stores)) || rest[0];
  return previous ? priceRise(previous.unitPrice, last.unitPrice!) : null;
}

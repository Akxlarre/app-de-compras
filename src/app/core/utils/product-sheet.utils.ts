import type { ProductPurchase, ProductPurchaseRow } from '@core/models/product-sheet.model';
import type { RestockStat } from '@core/models/restock.model';

/** Las compras de un producto, de la más reciente a la más vieja (spec 0017 AC2). */
export function purchaseHistory(rows: ProductPurchaseRow[]): ProductPurchase[] {
  return rows
    .filter((r) => !!r.list.completed_at)
    .map((r) => ({
      listId: r.list.id,
      date: r.list.completed_at!,
      stores:
        (r.list.receipts ?? [])
          .map((x) => x.store)
          .filter(Boolean)
          .join(' · ') || null,
      quantity: Number(r.quantity ?? 1) || 1,
      unitPrice: r.unit_price == null ? null : Number(r.unit_price),
    }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

/** "Lo compras cada ~11 días · 3 compras"; null con menos de 2 compras (sin intervalo). */
export function buyEvery(
  stat: Pick<RestockStat, 'purchase_count' | 'median_interval_days'> | undefined
): string | null {
  if (!stat || stat.purchase_count < 2 || stat.median_interval_days == null) return null;
  const days = Math.max(1, Math.round(stat.median_interval_days));
  return `Lo compras cada ~${days} ${days === 1 ? 'día' : 'días'} · ${stat.purchase_count} compras`;
}

const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

/** El nombre contiene lo buscado, sin tildes ni mayúsculas (buscador del Catálogo, AC9). */
export function matchesSearch(name: string, term: string): boolean {
  const t = fold(term);
  return !t || fold(name).includes(t);
}

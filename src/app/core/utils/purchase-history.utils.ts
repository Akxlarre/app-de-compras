import type { ActiveShoppingList } from '@core/models/shopping-list.model';
import type {
  MonthlySpending,
  PurchaseSummary,
  PurchasedItem,
} from '@core/models/purchase-history.model';

/**
 * Resume una lista finalizada: solo lo marcado cuenta como comprado
 * (subtotal = cantidad × precio pagado; sin precio conocido suma 0).
 */
export function summarizePurchase(list: ActiveShoppingList): PurchaseSummary {
  const items: PurchasedItem[] = (list.list_items ?? [])
    .filter((item) => item.is_checked)
    .map((item) => {
      const quantity = Number(item.quantity ?? 1) || 1;
      const unitPrice = item.unit_price == null ? null : Number(item.unit_price);
      return {
        name: item.product?.name ?? 'Producto sin nombre',
        quantity,
        unitPrice,
        subtotal: quantity * (unitPrice ?? 0),
      };
    });

  return {
    id: list.id,
    name: list.name,
    completedAt: list.completed_at ?? list.created_at,
    itemCount: items.length,
    total: items.reduce((sum, item) => sum + item.subtotal, 0),
    items,
  };
}

/** Gasto de las compras finalizadas en el mes de `now` (hora local). */
export function spendingInMonth(
  purchases: Pick<PurchaseSummary, 'completedAt' | 'total'>[],
  now: Date = new Date()
): MonthlySpending {
  const inMonth = purchases.filter((p) => {
    const d = new Date(p.completedAt);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });
  return { total: inMonth.reduce((sum, p) => sum + p.total, 0), count: inMonth.length };
}

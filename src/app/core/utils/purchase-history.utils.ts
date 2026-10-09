import type { ActiveShoppingList, ListReceipt } from '@core/models/shopping-list.model';
import type {
  MonthlySpending,
  PurchaseSummary,
  PurchasedCharge,
  PurchasedItem,
} from '@core/models/purchase-history.model';
import { disambiguateTitles, purchaseTitle } from './purchase-name.utils';

/** La boleta de la compra (PostgREST la devuelve como objeto o como arreglo de uno). */
function receiptOf(list: ActiveShoppingList): ListReceipt | null {
  const r = list.receipts;
  return (Array.isArray(r) ? r[0] : r) ?? null;
}

/**
 * Resume una lista finalizada: solo lo marcado cuenta como comprado
 * (subtotal = cantidad × precio pagado; sin precio conocido suma 0).
 * `total` es lo pagado de verdad (boleta o a mano) si se sabe; si no, la suma estimada.
 */
export function summarizePurchase(list: ActiveShoppingList): PurchaseSummary {
  const lines = [...(list.purchase_lines ?? [])].sort((a, b) => a.line_index - b.line_index);
  // Con las líneas de la boleta (spec 0015) el detalle es la boleta completa; si no, lo marcado.
  const items: PurchasedItem[] = lines.length
    ? lines
        .filter((l) => l.kind === 'product')
        .map((l) => ({
          name: l.product?.name ?? l.name ?? l.raw_text ?? 'Producto sin nombre',
          quantity: Number(l.quantity ?? 1) || 1,
          unitPrice: l.unit_price == null ? null : Number(l.unit_price),
          subtotal: Number(l.amount),
        }))
    : (list.list_items ?? [])
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
  const charges: PurchasedCharge[] = lines
    .filter((l) => l.kind !== 'product')
    .map((l) => ({ kind: l.kind, rawText: l.raw_text, amount: Number(l.amount) }));

  // `other` (redondeo, donación) no suma al total, igual que en la revisión de la boleta.
  const estimatedTotal =
    items.reduce((sum, item) => sum + item.subtotal, 0) +
    charges.filter((c) => c.kind !== 'other').reduce((sum, c) => sum + c.amount, 0);
  const receipt = receiptOf(list);
  const paid = list.total_paid == null ? null : Number(list.total_paid);

  return {
    id: list.id,
    name: list.name,
    title: purchaseTitle(list.name, list.completed_at ?? list.created_at),
    completedAt: list.completed_at ?? list.created_at,
    itemCount: items.length,
    total: paid ?? estimatedTotal,
    estimatedTotal,
    totalSource: paid == null ? 'estimated' : list.total_source ?? 'estimated',
    hasReceipt: receipt !== null,
    receiptImagePath: receipt?.image_url ?? null,
    store: receipt?.store ?? null,
    items,
    charges,
    source: list,
  };
}

/** Resume las compras del Historial; las automáticas del mismo día llevan la hora en el título. */
export function summarizePurchases(lists: ActiveShoppingList[]): PurchaseSummary[] {
  const summaries = lists.map(summarizePurchase);
  const titles = disambiguateTitles(summaries);
  return summaries.map((s, i) => ({ ...s, title: titles[i] }));
}

/**
 * Gasto de las compras finalizadas en el mes de `now` (hora local), con cuántas son estimadas
 * (sin boleta ni total ingresado).
 */
export function spendingInMonth(
  purchases: Pick<PurchaseSummary, 'completedAt' | 'total' | 'totalSource'>[],
  now: Date = new Date()
): MonthlySpending {
  const inMonth = purchases.filter((p) => {
    const d = new Date(p.completedAt);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });
  return {
    total: inMonth.reduce((sum, p) => sum + p.total, 0),
    count: inMonth.length,
    estimatedCount: inMonth.filter((p) => p.totalSource === 'estimated').length,
  };
}

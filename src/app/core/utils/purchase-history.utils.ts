import type { ActiveShoppingList, ListReceipt } from '@core/models/shopping-list.model';
import type { MonthTotal, SpendItem } from '@core/models/price-insights.model';
import type {
  MonthComparison,
  MonthlySpending,
  PurchaseSummary,
  PurchasedCharge,
  PurchasedItem,
} from '@core/models/purchase-history.model';
import { disambiguateTitles, purchaseTitle } from './purchase-name.utils';

/** Las boletas de la compra: varias si la salida fue por varias tiendas (spec 0015 D6). */
function receiptsOf(list: ActiveShoppingList): ListReceipt[] {
  const r = list.receipts;
  return Array.isArray(r) ? r : r ? [r] : [];
}

/**
 * Resume una lista finalizada: solo lo marcado cuenta como comprado
 * (subtotal = cantidad × precio pagado; sin precio conocido suma 0).
 * `total` es lo pagado de verdad (boleta o a mano) si se sabe; si no, la suma estimada.
 */
export function summarizePurchase(list: ActiveShoppingList): PurchaseSummary {
  // Boleta por boleta (en el orden de la compra) y, dentro de cada una, en el orden impreso.
  const receiptOrder = new Map(receiptsOf(list).map((r, i) => [r.id, i]));
  const lines = [...(list.purchase_lines ?? [])].sort(
    (a, b) =>
      (receiptOrder.get(a.receipt_id) ?? 0) - (receiptOrder.get(b.receipt_id) ?? 0) ||
      a.line_index - b.line_index
  );
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
  const receipts = receiptsOf(list);
  const stores = receipts
    .map((r) => r.store)
    .filter(Boolean)
    .join(' · ');
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
    hasReceipt: receipts.length > 0,
    receiptImagePath: receipts.find((r) => r.image_url)?.image_url ?? null,
    receiptImagePaths: receipts.flatMap((r) => (r.image_url ? [r.image_url] : [])),
    receiptTotals: receipts.flatMap((r) =>
      r.total_amount == null ? [] : [{ store: r.store, total: Number(r.total_amount) }]
    ),
    store: stores || null,
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

/** Primer día (hora local) del mes de `date` corrido `delta` meses. */
export function shiftMonth(date: Date, delta: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

/** Las compras finalizadas en el mes de `month` (hora local). */
export function purchasesInMonth<T extends Pick<PurchaseSummary, 'completedAt'>>(
  purchases: T[],
  month: Date
): T[] {
  return purchases.filter((p) => {
    const d = new Date(p.completedAt);
    return d.getFullYear() === month.getFullYear() && d.getMonth() === month.getMonth();
  });
}

/**
 * Gasto de las compras finalizadas en el mes de `now` (hora local), con cuántas son estimadas
 * (sin boleta ni total ingresado).
 */
export function spendingInMonth(
  purchases: Pick<PurchaseSummary, 'completedAt' | 'total' | 'totalSource'>[],
  now: Date = new Date()
): MonthlySpending {
  const inMonth = purchasesInMonth(purchases, now);
  return {
    total: inMonth.reduce((sum, p) => sum + p.total, 0),
    count: inMonth.length,
    estimatedCount: inMonth.filter((p) => p.totalSource === 'estimated').length,
  };
}

/**
 * Gasto del mes elegido contra el anterior (spec 0016 D4). `diff` es null si el mes anterior no
 * tuvo compras: no hay con qué comparar.
 */
export function monthComparison(
  purchases: Pick<PurchaseSummary, 'completedAt' | 'total' | 'totalSource'>[],
  month: Date
): MonthComparison {
  const current = spendingInMonth(purchases, month);
  const previous = spendingInMonth(purchases, shiftMonth(month, -1));
  return { current, previous, diff: previous.count ? current.total - previous.total : null };
}

/** Gasto de los `n` meses que terminan en `endMonth`, del más viejo al más nuevo (spec 0020 D3). */
export function monthlyTotals(
  purchases: Pick<PurchaseSummary, 'completedAt' | 'total' | 'totalSource'>[],
  endMonth: Date,
  n = 6
): MonthTotal[] {
  return Array.from({ length: n }, (_, i) => {
    const month = shiftMonth(endMonth, i - n + 1);
    const { total, count } = spendingInMonth(purchases, month);
    return { month, total, count };
  });
}

const byTotal = (a: SpendItem, b: SpendItem) => b.total - a.total || a.name.localeCompare(b.name);

function sumBy(entries: [string, number][]): SpendItem[] {
  const totals = new Map<string, number>();
  for (const [name, amount] of entries) totals.set(name, (totals.get(name) ?? 0) + amount);
  return [...totals].map(([name, total]) => ({ name, total })).sort(byTotal);
}

/** Los productos que más pesaron en lo pagado (spec 0020 D4). */
export function topProducts(purchases: Pick<PurchaseSummary, 'items'>[], n = 5): SpendItem[] {
  return sumBy(purchases.flatMap((p) => p.items.map((i): [string, number] => [i.name, i.subtotal])))
    .filter((i) => i.total > 0)
    .slice(0, n);
}

/** Gasto por tienda: cada boleta en su tienda; las compras sin boleta, aparte (spec 0020 D4). */
export function spendByStore(
  purchases: Pick<PurchaseSummary, 'total' | 'receiptTotals'>[]
): SpendItem[] {
  return sumBy(
    purchases.flatMap((p): [string, number][] =>
      p.receiptTotals.length
        ? p.receiptTotals.map((r): [string, number] => [r.store || 'Tienda sin leer', r.total])
        : [['Sin boleta', p.total]]
    )
  ).filter((s) => s.total > 0);
}

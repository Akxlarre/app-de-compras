import type { ActiveShoppingList } from './shopping-list.model';
import type { OcrLineKind, TotalSource } from './receipt.model';

/** Producto comprado dentro de una compra finalizada. */
export interface PurchasedItem {
  name: string;
  quantity: number;
  /** Precio pagado por unidad; null si no se conocía al finalizar. */
  unitPrice: number | null;
  subtotal: number;
}

/** Bolsa, envase, descuento a la compra u otro cargo de la boleta (spec 0015). */
export interface PurchasedCharge {
  kind: OcrLineKind;
  rawText: string | null;
  /** Negativo en los descuentos. */
  amount: number;
}

/** Una compra finalizada, lista para el Historial. */
export interface PurchaseSummary {
  id: string;
  name: string;
  /** Lo que se muestra: la fecha si el nombre es automático, si no el nombre (spec 0012). */
  title: string;
  completedAt: string;
  itemCount: number;
  /** Lo que se gastó: el total pagado (boleta o a mano) si existe; si no, la suma estimada. */
  total: number;
  /** Suma de cantidad × precio de lo marcado (con los últimos precios si no hubo boleta). */
  estimatedTotal: number;
  /** De dónde sale `total` (spec 0008/0009). */
  totalSource: TotalSource;
  hasReceipt: boolean;
  /** Ruta de la foto en el bucket privado `receipts`; null si no se guardó. */
  receiptImagePath: string | null;
  /** Las fotos de todas sus boletas (varias si la salida fue por varias tiendas). */
  receiptImagePaths: string[];
  /** Tienda o tiendas de sus boletas, unidas con " · "; null sin boleta o si no se leyó. */
  store: string | null;
  items: PurchasedItem[];
  /** Lo que no es producto en la boleta; vacío sin boleta o en compras antiguas. */
  charges: PurchasedCharge[];
  /** La compra tal como vino de la base, para cerrarla con boleta o total desde el Historial. */
  source: ActiveShoppingList;
}

export interface MonthlySpending {
  total: number;
  count: number;
  /** Cuántas de esas compras tienen el total estimado (sin boleta ni total ingresado). */
  estimatedCount: number;
}

/** Gasto de un mes contra el anterior (spec 0016 D4). */
export interface MonthComparison {
  current: MonthlySpending;
  previous: MonthlySpending;
  /** current − previous; null si el mes anterior no tuvo compras. */
  diff: number | null;
}

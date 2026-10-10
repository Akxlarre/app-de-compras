import type { Product } from './product.model';
import type { ReceiptAlias } from './receipt.model';
import type { StorePrice } from './price-insights.model';

/** Fila de `list_items` de una compra cerrada, como la trae `ProductsRepository.findPurchases`. */
export interface ProductPurchaseRow {
  quantity: number | null;
  unit_price: number | null;
  list: { id: string; completed_at: string | null; receipts: { store: string | null }[] | null };
}

/** Una compra de un producto en su ficha (spec 0017 AC2). */
export interface ProductPurchase {
  listId: string;
  date: string;
  /** Tiendas de las boletas de esa compra, unidas con " · "; null sin boleta. */
  stores: string | null;
  quantity: number;
  /** Precio pagado por unidad; null si no se conoció. */
  unitPrice: number | null;
}

/** Lo que muestra la ficha de un producto. */
export interface ProductSheet {
  product: Product;
  purchases: ProductPurchase[];
  aliases: ReceiptAlias[];
  /** "Lo compras cada ~11 días · 3 compras"; null con menos de 2 compras. */
  frequency: string | null;
  /** Último precio pagado en cada tienda, del más barato al más caro (spec 0020 D1). */
  storePrices: StorePrice[];
  /** % que subió la última compra respecto de la anterior (≥ 10%), o null (spec 0020 D2). */
  rise: number | null;
}

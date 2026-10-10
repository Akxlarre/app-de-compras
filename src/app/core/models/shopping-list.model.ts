import type { Product } from './product.model';
import type { OcrLineKind, TotalSource } from './receipt.model';

export type ShoppingListStatus = 'active' | 'completed' | 'archived' | 'template';

export interface ShoppingList {
  id: string;
  family_id: string;
  name: string;
  status: ShoppingListStatus;
  created_at: string;
  completed_at?: string;
  /** Lo pagado de verdad (boleta o a mano); null = no se sabe (spec 0008). */
  total_paid?: number | null;
  total_source?: TotalSource;
  /** Quién la cerró; lo fija la BD al pasar a `completed` (spec 0023 D3). */
  completed_by?: string | null;
  /** Presupuesto en pesos; null = sin tope (spec 0025 D2). */
  budget?: number | null;
}

/** Boleta embebida en la compra (`receipts(id, image_url, store, total_amount)`). */
export interface ListReceipt {
  id: string;
  /** Ruta de la foto en el bucket privado `receipts`. */
  image_url: string | null;
  store: string | null;
  /** Total impreso en la boleta (spec 0020: gasto por tienda). */
  total_amount?: number | null;
}

/** Unidades de un ítem (spec 0019 D4; CHECK en `shop.list_items`). */
export const ITEM_UNITS = ['un', 'kg', 'g', 'L', 'ml', 'paquete'] as const;
export type ItemUnit = (typeof ITEM_UNITS)[number];

export interface ListItem {
  id: string;
  list_id: string;
  product_id?: string;
  quantity: number;
  /** "un" por defecto; kg y L admiten decimales (spec 0019 D4). */
  unit?: ItemUnit;
  /** Nota de este ítem en esta lista ("sin lactosa"), hasta 80 caracteres (spec 0021). */
  notes?: string | null;
  is_checked: boolean;
  checked_at?: string;
  checked_by?: string;
  /** Quién lo agregó; lo fija la BD al crearlo (spec 0024 D1). */
  added_by?: string | null;
  /**
   * Precio pagado. Se puede anotar al marcar (spec 0019 D5); si no, lo completa `complete_list`
   * con el último precio al finalizar.
   */
  unit_price?: number | null;
  created_at: string;
}

/** Ítem con el producto embebido (`list_items(*, product:products(...))`). */
export interface PopulatedListItem extends ListItem {
  product?: Partial<Product>;
}

/** Una línea de la boleta guardada en la compra (`shop.purchase_lines`, spec 0015). */
export interface PurchaseLine {
  receipt_id: string;
  line_index: number;
  raw_text: string | null;
  name: string | null;
  kind: OcrLineKind;
  quantity: number | null;
  unit_price: number | null;
  amount: number;
  /** `id` para volver a agregarlo a la lista (spec 0023 D1). */
  product: (Pick<Product, 'name'> & Partial<Pick<Product, 'id'>>) | null;
}

/** Lista con sus ítems poblados: la forma que consume la UI. */
export interface ActiveShoppingList extends ShoppingList {
  list_items: PopulatedListItem[];
  /** Una boleta por compra: PostgREST la devuelve como objeto (FK única) o como arreglo. */
  receipts?: ListReceipt | ListReceipt[] | null;
  /** Solo en el Historial; vacío si la compra no tiene boleta o es anterior a la spec 0015. */
  purchase_lines?: PurchaseLine[];
}

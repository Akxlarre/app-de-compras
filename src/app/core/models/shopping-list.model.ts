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
}

/** Boleta embebida en la compra (`receipts(id, image_url, store)`). */
export interface ListReceipt {
  id: string;
  /** Ruta de la foto en el bucket privado `receipts`. */
  image_url: string | null;
  store: string | null;
}

export interface ListItem {
  id: string;
  list_id: string;
  product_id?: string;
  quantity: number;
  notes?: string;
  is_checked: boolean;
  checked_at?: string;
  checked_by?: string;
  /** Precio pagado; lo fija la RPC `complete_list` al finalizar la compra. */
  unit_price?: number | null;
  created_at: string;
}

/** Ítem con el producto embebido (`list_items(*, product:products(...))`). */
export interface PopulatedListItem extends ListItem {
  product?: Partial<Product>;
}

/** Una línea de la boleta guardada en la compra (`shop.purchase_lines`, spec 0015). */
export interface PurchaseLine {
  line_index: number;
  raw_text: string | null;
  name: string | null;
  kind: OcrLineKind;
  quantity: number | null;
  unit_price: number | null;
  amount: number;
  product: Pick<Product, 'name'> | null;
}

/** Lista con sus ítems poblados: la forma que consume la UI. */
export interface ActiveShoppingList extends ShoppingList {
  list_items: PopulatedListItem[];
  /** Una boleta por compra: PostgREST la devuelve como objeto (FK única) o como arreglo. */
  receipts?: ListReceipt | ListReceipt[] | null;
  /** Solo en el Historial; vacío si la compra no tiene boleta o es anterior a la spec 0015. */
  purchase_lines?: PurchaseLine[];
}

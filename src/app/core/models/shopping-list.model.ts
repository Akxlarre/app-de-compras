import type { Product } from './product.model';

export type ShoppingListStatus = 'active' | 'completed' | 'archived' | 'template';

export interface ShoppingList {
  id: string;
  family_id: string;
  name: string;
  status: ShoppingListStatus;
  created_at: string;
  completed_at?: string;
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

/** Lista con sus ítems poblados: la forma que consume la UI. */
export interface ActiveShoppingList extends ShoppingList {
  list_items: PopulatedListItem[];
}

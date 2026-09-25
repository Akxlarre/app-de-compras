export type ShoppingListStatus = 'active' | 'completed' | 'archived';

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
  created_at: string;
}

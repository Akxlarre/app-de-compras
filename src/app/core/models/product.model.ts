export interface Product {
  id: string;
  family_id: string;
  name: string;
  category?: string | null;
  last_price?: number;
  estimated_duration_days?: number;
  /** Última compra finalizada que lo incluyó (RPC `complete_list`). */
  last_purchased_at?: string | null;
  created_at: string;
  updated_at: string;
}

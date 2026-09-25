export interface Product {
  id: string;
  family_id: string;
  name: string;
  category?: string;
  last_price?: number;
  estimated_duration_days?: number;
  created_at: string;
  updated_at: string;
}

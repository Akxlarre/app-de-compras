/** Pasillos fijos, en el orden de un súper chileno (spec 0019 D1; CHECK en `shop.products`). */
export const AISLES = [
  'Frutas y verduras',
  'Carnes y pescados',
  'Lácteos y huevos',
  'Panadería',
  'Despensa',
  'Bebidas',
  'Congelados',
  'Limpieza',
  'Higiene y cuidado personal',
  'Mascotas',
  'Otros',
] as const;
export type Aisle = (typeof AISLES)[number];

export interface Product {
  id: string;
  family_id: string;
  name: string;
  /** Pasillo (spec 0019): la BD lo sugiere al crear y nunca queda vacío. */
  category?: Aisle | string | null;
  last_price?: number;
  estimated_duration_days?: number;
  /** Última compra finalizada que lo incluyó (RPC `complete_list`). */
  last_purchased_at?: string | null;
  /** "Todavía tengo": no sugerir reponer hasta esta fecha (spec 0014). */
  restock_snoozed_until?: string | null;
  /** Archivado: fuera del buscador, del Catálogo y de las sugerencias (spec 0017 D3). */
  archived_at?: string | null;
  created_at: string;
  updated_at: string;
}

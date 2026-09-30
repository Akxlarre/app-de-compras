import type { Product } from './product.model';

/** Fila de la RPC `shop.restock_stats()` (spec 0014). */
export interface RestockStat {
  product_id: string;
  /** Días distintos en que se compró. */
  purchase_count: number;
  /** Mediana de días entre compras; null con menos de 2. */
  median_interval_days: number | null;
  last_purchased_at: string | null;
}

/** Datos del RestockFacade: el catálogo de la familia y sus estadísticas de compra. */
export interface RestockData {
  products: Product[];
  stats: RestockStat[];
}

/** Una sugerencia de "Te puede faltar". */
export interface RestockSuggestion {
  product: Product;
  /** Días desde la última compra. */
  daysSince: number;
  /** Cada cuántos días se repone (aprendido o por defecto). */
  intervalDays: number;
  /** true si el intervalo sale del historial (2+ compras). */
  learned: boolean;
}

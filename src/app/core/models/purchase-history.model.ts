/** Producto comprado dentro de una compra finalizada. */
export interface PurchasedItem {
  name: string;
  quantity: number;
  /** Precio pagado por unidad; null si no se conocía al finalizar. */
  unitPrice: number | null;
  subtotal: number;
}

/** Una compra finalizada, lista para el Historial. */
export interface PurchaseSummary {
  id: string;
  name: string;
  completedAt: string;
  itemCount: number;
  total: number;
  items: PurchasedItem[];
}

export interface MonthlySpending {
  total: number;
  count: number;
}

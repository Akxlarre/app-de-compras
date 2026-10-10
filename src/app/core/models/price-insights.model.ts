/** Línea de boleta de un producto con su tienda, como la trae `ProductsRepository.findStorePrices`. */
export interface StorePriceRow {
  unit_price: number | null;
  quantity: number | null;
  amount: number;
  receipt: { store: string | null; purchased_at: string | null } | null;
  list: { completed_at: string | null } | null;
}

/** Último precio pagado por un producto en una tienda (spec 0020 D1). */
export interface StorePrice {
  store: string;
  unitPrice: number;
  date: string;
}

/** Gasto de un mes para el gráfico de Compras (spec 0020 D3). */
export interface MonthTotal {
  /** Primer día del mes (hora local). */
  month: Date;
  total: number;
  count: number;
}

/** Un nombre (producto o tienda) con lo que se gastó en él (spec 0020 D4). */
export interface SpendItem {
  name: string;
  total: number;
}
